import * as XLSX from "xlsx";
import { normalizePhone } from "./phone";
import type { ImportPreviewRow } from "./types";

/** Normalize spreadsheet header for fuzzy matching */
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Case-insensitive column aliases → CRM field */
const COLUMN_ALIASES: Record<string, string> = {
  status: "isp_status",
  name: "full_name",
  number: "phone",
  phone: "phone",
  "acct#": "account_number",
  "account#": "account_number",
  "account number": "account_number",
  "order date": "order_date",
  "install date": "install_date",
  "install complete": "install_complete",
  "sales rep id": "sales_rep_id",
  address: "address",
  product: "product",
  term: "term",
  "call ahead-comets notes": "isp_notes",
  "call ahead -comments notes": "isp_notes",
  "call ahead-comments notes": "isp_notes",
  "call ahead - comments notes": "isp_notes",
  notes: "isp_notes",
  invoiced: "isp_notes",
};

/** Convert any cell value to a plain serializable string */
export function toPlainValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  const str = String(value).trim();
  return str || null;
}

/** Convert a spreadsheet row to plain string values (safe for server→client) */
export function toPlainRow(
  raw: Record<string, unknown>
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] = toPlainValue(value);
  }
  return out;
}

/** Headers SheetJS assigns to columns with no name in row 1 */
function isValidHeader(header: string): boolean {
  const trimmed = header.trim();
  if (!trimmed) return false;
  if (/^__EMPTY(_\d+)?$/i.test(trimmed)) return false;
  return true;
}

function isEmptyRow(row: Record<string, string | null>): boolean {
  return Object.values(row).every((value) => value === null);
}

/** Stop scanning after this many consecutive empty data rows */
const MAX_CONSECUTIVE_EMPTY_ROWS = 25;

type SheetColumn = { index: number; name: string };

function buildColumnsFromHeaderRow(headerRow: unknown[]): SheetColumn[] {
  const columns: SheetColumn[] = [];
  const usedNames = new Set<string>();

  headerRow.forEach((cell, index) => {
    const baseName = toPlainValue(cell);
    if (!baseName || !isValidHeader(baseName)) return;

    let name = baseName;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `${baseName} (${suffix++})`;
    }
    usedNames.add(name);
    columns.push({ index, name });
  });

  return columns;
}

function rowFromLine(
  line: unknown[],
  columns: SheetColumn[]
): Record<string, string | null> {
  const row: Record<string, string | null> = {};
  for (const { index, name } of columns) {
    row[name] = toPlainValue(line[index]);
  }
  return row;
}

export function parseSpreadsheet(buffer: ArrayBuffer): {
  headers: string[];
  rows: Record<string, string | null>[];
} {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: null,
    blankrows: false,
  });

  if (matrix.length === 0) {
    return { headers: [], rows: [] };
  }

  const columns = buildColumnsFromHeaderRow(matrix[0] ?? []);
  const headers = columns.map((column) => column.name);

  if (headers.length === 0) {
    return { headers: [], rows: [] };
  }

  const rows: Record<string, string | null>[] = [];
  let consecutiveEmpty = 0;

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] ?? [];
    const row = rowFromLine(line, columns);

    if (isEmptyRow(row)) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY_ROWS) break;
      continue;
    }

    consecutiveEmpty = 0;
    rows.push(row);
  }

  return { headers, rows };
}

export function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    if (!isValidHeader(header)) continue;
    const crmField = COLUMN_ALIASES[normalizeHeader(header)];
    if (crmField) {
      mapping[header] = crmField;
    }
  }
  return mapping;
}

/** Map spreadsheet headers to per-ISP column keys */
export function autoMapToISPColumns(
  headers: string[],
  ispColumns: { column_key: string; label: string }[]
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const labelToKey = new Map(
    ispColumns.map((c) => [normalizeHeader(c.label), c.column_key])
  );
  const keySet = new Set(ispColumns.map((c) => c.column_key));

  for (const header of headers) {
    if (!isValidHeader(header)) continue;
    const normalized = normalizeHeader(header);
    if (labelToKey.has(normalized)) {
      mapping[header] = labelToKey.get(normalized)!;
      continue;
    }
    if (keySet.has(normalized.replace(/\s+/g, "_"))) {
      mapping[header] = normalized.replace(/\s+/g, "_");
      continue;
    }
    const alias = COLUMN_ALIASES[normalized];
    if (alias && keySet.has(alias)) {
      mapping[header] = alias;
    }
  }
  return mapping;
}

export function mapRow(
  raw: Record<string, string | null>,
  columnMapping: Record<string, string>
): Record<string, string | null> {
  const mapped: Record<string, string | null> = {};

  for (const [sourceCol, crmField] of Object.entries(columnMapping)) {
    mapped[crmField] = raw[sourceCol] ?? null;
  }

  if (mapped.phone) {
    mapped.normalized_phone = normalizePhone(mapped.phone);
  }

  return mapped;
}

export function buildPreview(
  rows: Record<string, string | null>[],
  columnMapping: Record<string, string>,
  limit = 20
): ImportPreviewRow[] {
  return rows.slice(0, limit).map((raw, index) => ({
    rowNumber: index + 2,
    mapped: mapRow(raw, columnMapping),
  }));
}

export function validateMappedRow(
  mapped: Record<string, string | null>,
  requiredKeys: string[] = []
): string | null {
  for (const key of requiredKeys) {
    if (!mapped[key]) {
      return `Missing required field: ${key}`;
    }
  }

  const hasAnyValue = Object.values(mapped).some((v) => v);
  if (!hasAnyValue) {
    return "Row has no mapped data";
  }
  return null;
}
