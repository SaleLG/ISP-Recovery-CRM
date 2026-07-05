import type { ISPColumn } from "@/lib/types";
import { normalizePhone } from "@/lib/phone";

/** Slug for a new column key from a label */
export function slugifyColumnKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48) || "column";
}

export function getCustomFieldValue(
  customFields: Record<string, string | null> | null | undefined,
  key: string
): string | null {
  if (!customFields) return null;
  const value = customFields[key];
  return value === undefined || value === null || value === "" ? null : String(value);
}

export function getCustomerDisplayName(
  customFields: Record<string, string | null> | null | undefined,
  columns: ISPColumn[],
  fallback?: string | null
): string {
  const primary =
    columns.find((c) => c.is_primary) ?? columns.find((c) => c.sort_order === columns[0]?.sort_order) ?? columns[0];
  if (primary) {
    const value = getCustomFieldValue(customFields, primary.column_key);
    if (value) return value;
  }
  return fallback || "—";
}

export function getCustomerSearchText(
  customFields: Record<string, string | null> | null | undefined,
  fallback?: {
    full_name?: string | null;
    phone?: string | null;
    account_number?: string | null;
    address?: string | null;
  }
): string {
  const parts: string[] = [];
  if (customFields) {
    parts.push(...Object.values(customFields).filter(Boolean) as string[]);
  }
  if (fallback) {
    for (const value of [
      fallback.full_name,
      fallback.phone,
      fallback.account_number,
      fallback.address,
    ]) {
      if (value) parts.push(value);
    }
  }
  return parts.join(" ").toLowerCase();
}

const LEGACY_FIELD_KEYS = new Set([
  "full_name",
  "phone",
  "account_number",
  "isp_status",
  "address",
  "product",
  "term",
  "sales_rep_id",
  "isp_notes",
]);

/** Sync known custom field keys into legacy customer columns for workflow/search compatibility */
export function syncLegacyCustomerFields(
  customFields: Record<string, string | null>
): Record<string, string | null> {
  const synced: Record<string, string | null> = {};
  for (const key of LEGACY_FIELD_KEYS) {
    synced[key] = getCustomFieldValue(customFields, key);
  }
  if (synced.phone) {
    synced.normalized_phone = normalizePhone(synced.phone);
  } else {
    synced.normalized_phone = null;
  }
  return synced;
}

export function buildCustomFieldsFromMapping(
  mapped: Record<string, string | null>
): Record<string, string | null> {
  const customFields: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(mapped)) {
    if (value !== null && value !== undefined && value !== "") {
      customFields[key] = value;
    }
  }
  return customFields;
}
