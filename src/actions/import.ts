"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import {
  parseSpreadsheet,
  autoMapToISPColumns,
  mapRow,
  validateMappedRow,
} from "@/lib/import";
import {
  buildCustomFieldsFromMapping,
  syncLegacyCustomerFields,
} from "@/lib/customerFields";
import { getISPColumns } from "@/actions/ispColumns";
import {
  getReimportReopenFields,
  shouldReinitializeOnReimport,
} from "@/lib/workflow";
import type { ISPColumn } from "@/lib/types";
import { fetchAllRows } from "@/lib/pagination";
import { revalidatePath } from "next/cache";

const INSERT_BATCH = 100;
const UPDATE_CONCURRENCY = 25;
const IMPORT_ROW_BATCH = 200;

export async function previewImport(formData: FormData, ispId: string) {
  await requireRole(["admin", "manager"]);
  if (!ispId) throw new Error("Select an ISP before uploading");

  const ispColumns = await getISPColumns(ispId);
  if (ispColumns.length === 0) {
    throw new Error(
      "This ISP has no CRM columns yet. Add columns on the ISPs page before importing."
    );
  }

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const buffer = await file.arrayBuffer();
  const { headers, rows } = parseSpreadsheet(buffer);
  const autoMapping = autoMapToISPColumns(headers, ispColumns);

  return {
    headers,
    autoMapping,
    ispColumns,
    previewRows: rows.slice(0, 20).map((raw, i) => ({
      rowNumber: i + 2,
      mapped: mapRow(raw, autoMapping),
    })),
    rows,
    totalRows: rows.length,
    fileName: file.name,
  };
}

function buildMatchLookup(
  customers: { id: string; custom_fields: Record<string, string | null> | null }[],
  matchColumns: ISPColumn[]
) {
  const lookup = new Map<string, string>();
  for (const customer of customers) {
    for (const column of matchColumns) {
      const value = customer.custom_fields?.[column.column_key];
      if (value) {
        lookup.set(`${column.column_key}:${value}`, customer.id);
      }
    }
  }
  return lookup;
}

function findExistingInMemory(
  lookup: Map<string, string>,
  customFields: Record<string, string | null>,
  matchColumns: ISPColumn[]
): string | null {
  for (const column of matchColumns) {
    const value = customFields[column.column_key];
    if (!value) continue;
    const id = lookup.get(`${column.column_key}:${value}`);
    if (id) return id;
  }
  return null;
}

function registerMatchKeys(
  lookup: Map<string, string>,
  customerId: string,
  customFields: Record<string, string | null>,
  matchColumns: ISPColumn[]
) {
  for (const column of matchColumns) {
    const value = customFields[column.column_key];
    if (value) {
      lookup.set(`${column.column_key}:${value}`, customerId);
    }
  }
}

async function runConfirmImport(formData: FormData) {
  const profile = await requireRole(["admin", "manager"]);
  const admin = createAdminClient();
  const defaultTeam = "Junior Sales Team";

  const ispId = String(formData.get("ispId") ?? "");
  const fileName = String(formData.get("fileName") ?? "");
  const columnMappingRaw = formData.get("columnMapping");
  const file = formData.get("file") as File | null;

  if (!ispId) throw new Error("Select an ISP before importing");
  if (!file) throw new Error("No file provided");
  if (!columnMappingRaw) throw new Error("Column mapping is required");

  let columnMapping: Record<string, string>;
  try {
    columnMapping = JSON.parse(String(columnMappingRaw));
  } catch {
    throw new Error("Invalid column mapping");
  }

  const buffer = await file.arrayBuffer();
  const { rows } = parseSpreadsheet(buffer);

  const ispColumns = await getISPColumns(ispId);
  if (ispColumns.length === 0) {
    throw new Error("This ISP has no CRM columns configured");
  }

  const matchColumns = ispColumns.filter((c) => c.used_for_matching);

  const { data: importRecord, error: importError } = await admin
    .from("imports")
    .insert({
      isp_id: ispId,
      file_name: fileName || file.name,
      uploaded_by: profile.id,
      default_assigned_team: defaultTeam,
      total_rows: rows.length,
    })
    .select()
    .single();

  if (importError) throw new Error(importError.message);

  // Paginated so dedup compares against ALL existing rows for this ISP, not
  // just the first 1000 PostgREST would otherwise return.
  const existingCustomers = await fetchAllRows<{
    id: string;
    custom_fields: Record<string, string | null> | null;
    workflow_stage: string | null;
    outcome: string | null;
    assigned_team: string | null;
    transfer_status: string | null;
  }>((from, to) =>
    admin
      .from("customers")
      .select(
        "id, custom_fields, workflow_stage, outcome, assigned_team, transfer_status"
      )
      .eq("isp_id", ispId)
      .order("id", { ascending: true })
      .range(from, to)
  );

  const existingById = new Map(
    (existingCustomers ?? []).map((customer) => [customer.id, customer])
  );

  const matchLookup = buildMatchLookup(existingCustomers ?? [], matchColumns);

  type ImportRowRecord = {
    import_id: string;
    row_number: number;
    raw_data: Record<string, string | null>;
    status: string;
    customer_id?: string;
    error_message?: string;
  };

  type InsertItem = {
    rowNumber: number;
    raw: Record<string, string | null>;
    payload: Record<string, unknown>;
    customFields: Record<string, string | null>;
  };

  type UpdateItem = {
    rowNumber: number;
    raw: Record<string, string | null>;
    id: string;
    payload: Record<string, unknown>;
    reopen: boolean;
  };

  const importRowRecords: ImportRowRecord[] = [];
  const toInsert: InsertItem[] = [];
  const toUpdate: UpdateItem[] = [];
  const pendingByMatchKey = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNumber = i + 2;
    const mapped = mapRow(raw, columnMapping);
    const customFields = buildCustomFieldsFromMapping(mapped);
    const validationError = validateMappedRow(mapped);

    if (validationError) {
      importRowRecords.push({
        import_id: importRecord.id,
        row_number: rowNumber,
        raw_data: raw,
        status: "error",
        error_message: validationError,
      });
      continue;
    }

    const legacyFields = syncLegacyCustomerFields(customFields);
    const customerData = {
      isp_id: ispId,
      custom_fields: customFields,
      ...legacyFields,
      source_import_id: importRecord.id,
    };

    const existingId = findExistingInMemory(matchLookup, customFields, matchColumns);

    if (existingId) {
      const existing = existingById.get(existingId);
      const reopen = existing ? shouldReinitializeOnReimport(existing) : false;
      toUpdate.push({
        rowNumber,
        raw,
        id: existingId,
        payload: {
          ...customerData,
          ...(reopen ? getReimportReopenFields() : {}),
        },
        reopen,
      });
      continue;
    }

    const pendingKey = matchColumns
      .map((col) => {
        const value = customFields[col.column_key];
        return value ? `${col.column_key}:${value}` : null;
      })
      .find(Boolean);

    if (pendingKey && pendingByMatchKey.has(pendingKey)) {
      const pendingIndex = pendingByMatchKey.get(pendingKey)!;
      toInsert[pendingIndex].payload = customerData;
      toInsert[pendingIndex].customFields = customFields;
      toInsert[pendingIndex].rowNumber = rowNumber;
      toInsert[pendingIndex].raw = raw;
      continue;
    }

    const insertIndex = toInsert.length;
    toInsert.push({
      rowNumber,
      raw,
      payload: {
        ...customerData,
        assigned_team: defaultTeam,
        workflow_stage: "New",
        call_attempt_number: 0,
      },
      customFields,
    });

    if (pendingKey) {
      pendingByMatchKey.set(pendingKey, insertIndex);
    }
  }

  let newCustomers = 0;
  let updatedCustomers = 0;
  let reopenedCustomers = 0;
  let errorRows = importRowRecords.length;

  const recordNewCustomer = (
    item: InsertItem,
    customerId: string,
    activityRows: {
      customer_id: string;
      user_id: string;
      activity_type: string;
      description: string;
    }[]
  ) => {
    newCustomers++;
    registerMatchKeys(matchLookup, customerId, item.customFields, matchColumns);
    importRowRecords.push({
      import_id: importRecord.id,
      row_number: item.rowNumber,
      raw_data: item.raw,
      status: "new",
      customer_id: customerId,
    });
    activityRows.push({
      customer_id: customerId,
      user_id: profile.id,
      activity_type: "import",
      description: `Imported from ${fileName || file.name}`,
    });
  };

  const insertOne = async (
    item: InsertItem,
    activityRows: {
      customer_id: string;
      user_id: string;
      activity_type: string;
      description: string;
    }[]
  ) => {
    const { data, error } = await admin
      .from("customers")
      .insert(item.payload)
      .select("id")
      .single();

    if (error) {
      importRowRecords.push({
        import_id: importRecord.id,
        row_number: item.rowNumber,
        raw_data: item.raw,
        status: "error",
        error_message: error.message,
      });
      errorRows++;
      return;
    }

    if (!data?.id) {
      importRowRecords.push({
        import_id: importRecord.id,
        row_number: item.rowNumber,
        raw_data: item.raw,
        status: "error",
        error_message: "Insert succeeded but no customer id returned",
      });
      errorRows++;
      return;
    }

    recordNewCustomer(item, data.id, activityRows);
  };

  for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
    const chunk = toInsert.slice(i, i + INSERT_BATCH);
    const activityRows: {
      customer_id: string;
      user_id: string;
      activity_type: string;
      description: string;
    }[] = [];

    const { data, error } = await admin
      .from("customers")
      .insert(chunk.map((item) => item.payload))
      .select("id");

    if (error) {
      // One bad row in a batch used to fail every row in the chunk — retry individually.
      for (const item of chunk) {
        await insertOne(item, activityRows);
      }
    } else {
      chunk.forEach((item, index) => {
        const customerId = data[index]?.id;
        if (!customerId) {
          importRowRecords.push({
            import_id: importRecord.id,
            row_number: item.rowNumber,
            raw_data: item.raw,
            status: "error",
            error_message: "Insert succeeded but no customer id returned",
          });
          errorRows++;
          return;
        }
        recordNewCustomer(item, customerId, activityRows);
      });
    }

    if (activityRows.length > 0) {
      const { error: activityError } = await admin
        .from("activities")
        .insert(activityRows);
      if (activityError) {
        console.error("Failed to log import activities:", activityError.message);
      }
    }
  }

  for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
    const chunk = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (item) => {
        const { error } = await admin
          .from("customers")
          .update(item.payload)
          .eq("id", item.id);
        return { item, error };
      })
    );

    for (const { item, error } of results) {
      if (error) {
        importRowRecords.push({
          import_id: importRecord.id,
          row_number: item.rowNumber,
          raw_data: item.raw,
          status: "error",
          error_message: error.message,
        });
        errorRows++;
      } else {
        updatedCustomers++;
        if (item.reopen) {
          reopenedCustomers++;
          await admin.from("activities").insert({
            customer_id: item.id,
            user_id: profile.id,
            activity_type: "team_transfer",
            old_value: existingById.get(item.id)?.assigned_team ?? "Finished",
            new_value: "Junior Sales Team",
            description:
              "Re-initialized from ISP import — lead had finished the pipeline, new outreach round",
          });
        }
        importRowRecords.push({
          import_id: importRecord.id,
          row_number: item.rowNumber,
          raw_data: item.raw,
          status: item.reopen ? "reopened" : "updated",
          customer_id: item.id,
        });
      }
    }
  }

  for (let i = 0; i < importRowRecords.length; i += IMPORT_ROW_BATCH) {
    const chunk = importRowRecords.slice(i, i + IMPORT_ROW_BATCH);
    const { error } = await admin.from("import_rows").insert(chunk);
    if (error) throw new Error(`Failed to save import log: ${error.message}`);
  }

  await admin
    .from("imports")
    .update({
      new_customers: newCustomers,
      updated_customers: updatedCustomers,
      skipped_rows: 0,
      error_rows: errorRows,
    })
    .eq("id", importRecord.id);

  revalidatePath("/junior-sales");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/senior-sales");
  revalidatePath("/recycle-hold");
  revalidatePath("/import");

  return {
    total_rows: rows.length,
    new_customers: newCustomers,
    updated_customers: updatedCustomers,
    reopened_customers: reopenedCustomers,
    skipped_rows: 0,
    error_rows: errorRows,
  };
}

export async function confirmImport(formData: FormData) {
  try {
    return await runConfirmImport(formData);
  } catch (err) {
    const cause = err instanceof Error && "cause" in err ? err.cause : err;
    const code =
      cause && typeof cause === "object" && "code" in cause
        ? String(cause.code)
        : "";
    if (
      code === "UND_ERR_CONNECT_TIMEOUT" ||
      (err instanceof Error && err.message.includes("fetch failed"))
    ) {
      throw new Error(
        "Cannot connect to the database. Check your internet connection and confirm your Supabase project is active."
      );
    }
    throw err;
  }
}
