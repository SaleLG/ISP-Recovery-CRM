"use server";

import { createClient } from "@/lib/supabase/server";
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
import { normalizePhone } from "@/lib/phone";
import { getISPColumns } from "@/actions/ispColumns";
import type { ISPColumn } from "@/lib/types";
import { revalidatePath } from "next/cache";

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

async function findExistingCustomer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ispId: string,
  customFields: Record<string, string | null>,
  matchColumns: ISPColumn[]
) {
  for (const column of matchColumns) {
    const value = customFields[column.column_key];
    if (!value) continue;

    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("isp_id", ispId)
      .filter(`custom_fields->>${column.column_key}`, "eq", value)
      .maybeSingle();
    if (data) return data.id;
  }

  return null;
}

export async function confirmImport(formData: FormData) {
  const profile = await requireRole(["admin", "manager"]);
  const supabase = await createClient();
  const defaultTeam = "Senior Sales Team";

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

  const { data: importRecord, error: importError } = await supabase
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

  let newCustomers = 0;
  let updatedCustomers = 0;
  const skippedRows = 0;
  let errorRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const mapped = mapRow(raw, columnMapping);
    const customFields = buildCustomFieldsFromMapping(mapped);
    const validationError = validateMappedRow(mapped);

    if (validationError) {
      errorRows++;
      await supabase.from("import_rows").insert({
        import_id: importRecord.id,
        row_number: i + 2,
        raw_data: raw as Record<string, unknown>,
        status: "error",
        error_message: validationError,
      });
      continue;
    }

    try {
      const existingId = await findExistingCustomer(
        supabase,
        ispId,
        customFields,
        matchColumns
      );

      const legacyFields = syncLegacyCustomerFields(customFields);
      const customerData = {
        isp_id: ispId,
        custom_fields: customFields,
        ...legacyFields,
        source_import_id: importRecord.id,
      };

      let customerId: string;

      if (existingId) {
        const { data, error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", existingId)
          .select("id")
          .single();

        if (error) throw error;
        customerId = data.id;
        updatedCustomers++;

        await supabase.from("import_rows").insert({
          import_id: importRecord.id,
          row_number: i + 2,
          raw_data: raw,
          status: "updated",
          customer_id: customerId,
        });
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert({
            ...customerData,
            assigned_team: defaultTeam,
            workflow_stage: "New",
            call_attempt_number: 0,
          })
          .select("id")
          .single();

        if (error) throw error;
        customerId = data.id;
        newCustomers++;

        await supabase.from("import_rows").insert({
          import_id: importRecord.id,
          row_number: i + 2,
          raw_data: raw,
          status: "new",
          customer_id: customerId,
        });

        await supabase.from("activities").insert({
          customer_id: customerId,
          user_id: profile.id,
          activity_type: "import",
          description: `Imported from ${fileName || file.name}`,
        });
      }
    } catch (err) {
      errorRows++;
      await supabase.from("import_rows").insert({
        import_id: importRecord.id,
        row_number: i + 2,
        raw_data: raw,
        status: "error",
        error_message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  await supabase
    .from("imports")
    .update({
      new_customers: newCustomers,
      updated_customers: updatedCustomers,
      skipped_rows: skippedRows,
      error_rows: errorRows,
    })
    .eq("id", importRecord.id);

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/senior-sales");
  revalidatePath("/recovery");
  revalidatePath("/import");

  return {
    total_rows: rows.length,
    new_customers: newCustomers,
    updated_customers: updatedCustomers,
    skipped_rows: skippedRows,
    error_rows: errorRows,
  };
}
