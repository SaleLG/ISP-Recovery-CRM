"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getISPs() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("isps")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getISPsWithCounts() {
  const supabase = await createClient();

  const { data: isps, error: ispsError } = await supabase
    .from("isps")
    .select("*, customers(count)")
    .order("name");

  if (ispsError) throw new Error(ispsError.message);

  const { data: columns, error: columnsError } = await supabase
    .from("isp_columns")
    .select("*")
    .order("sort_order");

  if (columnsError) {
    throw new Error(
      `${columnsError.message} — run supabase/migrations/009_isp_custom_columns.sql in the Supabase SQL Editor.`
    );
  }

  const columnsByIsp = new Map<string, typeof columns>();
  for (const column of columns ?? []) {
    const list = columnsByIsp.get(column.isp_id) ?? [];
    list.push(column);
    columnsByIsp.set(column.isp_id, list);
  }

  return (isps ?? []).map((isp) => ({
    id: isp.id,
    name: isp.name,
    status: isp.status,
    customer_count: isp.customers?.[0]?.count ?? 0,
    columns: columnsByIsp.get(isp.id) ?? [],
  }));
}

export async function createISP(name: string) {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("isps")
    .insert({ name })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/isps");
  revalidatePath("/import");
  revalidatePath("/customers");
  return data;
}

export async function updateISP(id: string, updates: { name?: string; status?: string }) {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("isps")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/isps");
  revalidatePath("/customers");
  return data;
}

export async function deleteISP(id: string) {
  await requireRole(["admin", "manager"]);
  const supabase = await createClient();

  const { error } = await supabase.from("isps").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/isps");
  revalidatePath("/customers");
  return { success: true };
}
