"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { slugifyColumnKey } from "@/lib/customerFields";
import { revalidatePath } from "next/cache";
import type { ISPColumn } from "@/lib/types";

export async function getISPColumns(ispId: string): Promise<ISPColumn[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("isp_columns")
    .select("*")
    .eq("isp_id", ispId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createISPColumn(params: {
  ispId: string;
  label: string;
  field_type?: ISPColumn["field_type"];
  is_primary?: boolean;
  used_for_matching?: boolean;
}) {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();

  const existing = await getISPColumns(params.ispId);
  let columnKey = slugifyColumnKey(params.label);
  const taken = new Set(existing.map((c) => c.column_key));
  let suffix = 1;
  const baseKey = columnKey;
  while (taken.has(columnKey)) {
    columnKey = `${baseKey}_${suffix++}`;
  }

  const sort_order =
    existing.length > 0
      ? Math.max(...existing.map((c) => c.sort_order)) + 1
      : 0;

  if (params.is_primary) {
    await supabase
      .from("isp_columns")
      .update({ is_primary: false })
      .eq("isp_id", params.ispId);
  }

  const { data, error } = await supabase
    .from("isp_columns")
    .insert({
      isp_id: params.ispId,
      column_key: columnKey,
      label: params.label.trim(),
      field_type: params.field_type ?? "text",
      sort_order,
      is_primary: params.is_primary ?? existing.length === 0,
      used_for_matching: params.used_for_matching ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePaths(params.ispId);
  return data as ISPColumn;
}

export async function updateISPColumn(
  id: string,
  updates: {
    label?: string;
    field_type?: ISPColumn["field_type"];
    is_primary?: boolean;
    used_for_matching?: boolean;
  }
) {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();

  const { data: column, error: fetchError } = await supabase
    .from("isp_columns")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !column) throw new Error("Column not found");

  if (updates.is_primary) {
    await supabase
      .from("isp_columns")
      .update({ is_primary: false })
      .eq("isp_id", column.isp_id);
  }

  const { data, error } = await supabase
    .from("isp_columns")
    .update({
      ...(updates.label !== undefined ? { label: updates.label.trim() } : {}),
      ...(updates.field_type !== undefined ? { field_type: updates.field_type } : {}),
      ...(updates.is_primary !== undefined ? { is_primary: updates.is_primary } : {}),
      ...(updates.used_for_matching !== undefined
        ? { used_for_matching: updates.used_for_matching }
        : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePaths(column.isp_id);
  return data as ISPColumn;
}

export async function deleteISPColumn(id: string) {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();

  const { data: column } = await supabase
    .from("isp_columns")
    .select("isp_id, is_primary")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("isp_columns").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (column?.is_primary) {
    const { data: remaining } = await supabase
      .from("isp_columns")
      .select("id")
      .eq("isp_id", column.isp_id)
      .order("sort_order")
      .limit(1);

    if (remaining?.[0]) {
      await supabase
        .from("isp_columns")
        .update({ is_primary: true })
        .eq("id", remaining[0].id);
    }
  }

  if (column?.isp_id) revalidatePaths(column.isp_id);
  return { success: true };
}

export async function reorderISPColumns(
  ispId: string,
  orderedIds: string[]
) {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("isp_columns")
      .update({ sort_order: i })
      .eq("id", orderedIds[i])
      .eq("isp_id", ispId);

    if (error) throw new Error(error.message);
  }

  revalidatePaths(ispId);
  return { success: true };
}

function revalidatePaths(ispId: string) {
  revalidatePath("/isps");
  revalidatePath("/customers");
  revalidatePath("/import");
  revalidatePath(`/customers?isp=${ispId}`);
}
