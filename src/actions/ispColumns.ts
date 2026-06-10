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

/** Primary first, match-key columns second, then the rest. Rewrites sort_order 0..n-1. */
async function normalizeISPColumnOrder(ispId: string): Promise<ISPColumn[]> {
  const supabase = await createClient();
  const cols = await getISPColumns(ispId);
  if (cols.length === 0) return [];

  const primary = cols.find((c) => c.is_primary);
  const matchKeys = cols
    .filter((c) => c.used_for_matching && c.id !== primary?.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const reservedIds = new Set([
    ...(primary ? [primary.id] : []),
    ...matchKeys.map((c) => c.id),
  ]);
  const rest = cols
    .filter((c) => !reservedIds.has(c.id))
    .sort((a, b) => a.sort_order - b.sort_order);

  const ordered = [...(primary ? [primary] : []), ...matchKeys, ...rest];

  for (let i = 0; i < ordered.length; i++) {
    const { error } = await supabase
      .from("isp_columns")
      .update({ sort_order: i })
      .eq("id", ordered[i].id)
      .eq("isp_id", ispId);

    if (error) throw new Error(error.message);
  }

  return ordered.map((col, index) => ({ ...col, sort_order: index }));
}

export async function createISPColumn(params: {
  ispId: string;
  label: string;
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

  const isPrimary = params.is_primary ?? existing.length === 0;

  if (isPrimary) {
    await supabase
      .from("isp_columns")
      .update({ is_primary: false })
      .eq("isp_id", params.ispId);
  }

  const sort_order = isPrimary
    ? 0
    : existing.length > 0
      ? Math.max(...existing.map((c) => c.sort_order)) + 1
      : 0;

  const { data, error } = await supabase
    .from("isp_columns")
    .insert({
      isp_id: params.ispId,
      column_key: columnKey,
      label: params.label.trim(),
      field_type: "text",
      sort_order,
      is_primary: isPrimary,
      used_for_matching: params.used_for_matching ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const normalized = await normalizeISPColumnOrder(params.ispId);
  revalidatePaths(params.ispId);
  return normalized.find((c) => c.id === data.id) ?? data;
}

export async function createISPColumns(params: {
  ispId: string;
  items: {
    label: string;
    is_primary?: boolean;
    used_for_matching?: boolean;
  }[];
}) {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();

  const items = params.items
    .map((item) => ({
      label: item.label.trim(),
      is_primary: item.is_primary ?? false,
      used_for_matching: item.used_for_matching ?? false,
    }))
    .filter((item) => item.label.length > 0);

  if (items.length === 0) {
    return { columns: await getISPColumns(params.ispId), added: 0, skipped: 0 };
  }

  const existing = await getISPColumns(params.ispId);
  const takenKeys = new Set(existing.map((c) => c.column_key));
  const takenLabels = new Set(existing.map((c) => c.label.toLowerCase()));
  const seenBatchLabels = new Set<string>();

  const toInsert: {
    isp_id: string;
    column_key: string;
    label: string;
    field_type: string;
    sort_order: number;
    is_primary: boolean;
    used_for_matching: boolean;
  }[] = [];

  let skipped = 0;
  let nextSort =
    existing.length > 0
      ? Math.max(...existing.map((c) => c.sort_order)) + 1
      : 0;

  const hasExistingPrimary = existing.some((c) => c.is_primary);
  let primaryAssigned = hasExistingPrimary;
  let batchPrimarySet = false;

  for (const item of items) {
    const labelKey = item.label.toLowerCase();
    if (takenLabels.has(labelKey) || seenBatchLabels.has(labelKey)) {
      skipped += 1;
      continue;
    }
    seenBatchLabels.add(labelKey);

    let columnKey = slugifyColumnKey(item.label);
    const baseKey = columnKey;
    let suffix = 1;
    while (takenKeys.has(columnKey)) {
      columnKey = `${baseKey}_${suffix++}`;
    }
    takenKeys.add(columnKey);
    takenLabels.add(labelKey);

    let isPrimary = false;
    if (item.is_primary && !batchPrimarySet) {
      isPrimary = true;
      batchPrimarySet = true;
      primaryAssigned = true;
    } else if (!primaryAssigned && toInsert.length === 0 && existing.length === 0) {
      isPrimary = true;
      batchPrimarySet = true;
      primaryAssigned = true;
    }

    toInsert.push({
      isp_id: params.ispId,
      column_key: columnKey,
      label: item.label,
      field_type: "text",
      sort_order: nextSort++,
      is_primary: isPrimary,
      used_for_matching: item.used_for_matching,
    });
  }

  if (toInsert.some((row) => row.is_primary)) {
    await supabase
      .from("isp_columns")
      .update({ is_primary: false })
      .eq("isp_id", params.ispId);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("isp_columns").insert(toInsert);
    if (error) throw new Error(error.message);
  }

  const normalized = await normalizeISPColumnOrder(params.ispId);
  revalidatePaths(params.ispId);
  return {
    columns: normalized,
    added: toInsert.length,
    skipped,
  };
}

export async function updateISPColumn(
  id: string,
  updates: {
    label?: string;
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
      field_type: "text",
      ...(updates.label !== undefined ? { label: updates.label.trim() } : {}),
      ...(updates.is_primary !== undefined ? { is_primary: updates.is_primary } : {}),
      ...(updates.used_for_matching !== undefined
        ? { used_for_matching: updates.used_for_matching }
        : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const normalized = await normalizeISPColumnOrder(column.isp_id);
  revalidatePaths(column.isp_id);
  return normalized.find((c) => c.id === id) ?? data;
}

export async function deleteISPColumn(id: string) {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();

  const { data: column } = await supabase
    .from("isp_columns")
    .select("isp_id, is_primary")
    .eq("id", id)
    .single();

  if (!column) throw new Error("Column not found");

  const { error } = await supabase.from("isp_columns").delete().eq("id", id);
  if (error) throw new Error(error.message);

  const remaining = await getISPColumns(column.isp_id);

  if (column.is_primary && remaining.length > 0 && !remaining.some((c) => c.is_primary)) {
    await supabase
      .from("isp_columns")
      .update({ is_primary: true })
      .eq("id", remaining[0].id);
  }

  const normalized = await normalizeISPColumnOrder(column.isp_id);
  revalidatePaths(column.isp_id);
  return { success: true, columns: normalized };
}

export async function reorderISPColumns(ispId: string, orderedIds: string[]) {
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

  const normalized = await normalizeISPColumnOrder(ispId);
  revalidatePaths(ispId);
  return normalized;
}

function revalidatePaths(ispId: string) {
  revalidatePath("/isps");
  revalidatePath("/customers");
  revalidatePath("/senior-sales");
  revalidatePath("/recycle-hold");
  revalidatePath("/alerts");
  revalidatePath("/import");
  revalidatePath(`/customers?isp=${ispId}`);
}
