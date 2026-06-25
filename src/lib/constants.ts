export const TEAMS = [
  "Junior Sales Team",
  "Senior Sales Team",
  "Recycle Hold",
] as const;

/** Manager-only basket — not a user profile team */
export const RECYCLE_HOLD_TEAM = "Recycle Hold" as const;

export const RECYCLE_HOLD_DAYS = 30;
export type Team = (typeof TEAMS)[number];

export const ROLES = [
  "admin",
  "manager",
  "va_manager",
  "junior_sales",
  "senior_sales",
] as const;
export type Role = (typeof ROLES)[number];

const LEGACY_ROLE_ALIASES: Record<string, Role> = {
  recovery: "junior_sales",
};

/** Normalize role strings from the database (handles spaces, casing, legacy values). */
export function normalizeRole(role: string | null | undefined): Role | null {
  if (!role) return null;
  const key = role.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (LEGACY_ROLE_ALIASES[key]) return LEGACY_ROLE_ALIASES[key];
  if ((ROLES as readonly string[]).includes(key)) return key as Role;
  return null;
}

/** User team is only set for junior_sales and senior_sales; admin/manager have no team. */
export function teamFromRole(role: Role | string): Team | null {
  const normalized = normalizeRole(role) ?? role;
  if (normalized === "junior_sales") return "Junior Sales Team";
  if (normalized === "senior_sales") return "Senior Sales Team";
  return null;
}

export const WORKFLOW_STAGES = [
  "New",
  "Attempt 1",
  "Attempt 2",
  "Attempt 3",
  "No Reply - Hold",
  "Callback Requested",
  "Rescheduled",
  "New Account Created",
  "Closed",
] as const;

const LEGACY_TEAM_ALIASES: Record<string, Team> = {
  "Recovery Team": "Recycle Hold",
};

const LEGACY_STAGE_ALIASES: Record<string, (typeof WORKFLOW_STAGES)[number]> = {
  "Recovery Needed": "No Reply - Hold",
  "In Recovery": "No Reply - Hold",
};

/** Map removed teams / empty values to current labels for display and reporting. */
export function normalizeTeamLabel(team: string | null | undefined): string {
  if (!team) return "Unassigned";
  return LEGACY_TEAM_ALIASES[team] ?? team;
}

export function normalizeStageLabel(stage: string | null | undefined): string {
  if (!stage) return "Unassigned";
  return LEGACY_STAGE_ALIASES[stage] ?? stage;
}

export const TRANSFER_STATUSES = [
  "None",
  "Senior Review",
  "Management Review",
  "Recycle in 30 Days",
  "Recycled to Junior",
] as const;

export const ISP_STATUS_LABELS: Record<string, string> = {
  A: "A (Active)",
  NS: "NS (No Show)",
  D: "D (Disconnected)",
  V: "V (Void)",
  CX: "CX (Cancelled)",
  P: "P (Pending)",
};

export function formatIspStatus(code: string | null | undefined): string {
  if (!code) return "—";
  const normalized = code.trim().toUpperCase();
  return ISP_STATUS_LABELS[normalized] ?? code;
}

export const CALL_RESULTS = [
  "No Answer",
  "Left Voicemail",
  "Customer Answered",
  "Callback Requested",
  "Rescheduled",
  "New Account Created",
  "Not Interested",
  "Wrong Number",
  "Do Not Call",
  "ISP Complaint",
  "Price Approval Needed",
] as const;

/** Junior outreach is text-only. Only simple text reschedule stays on Junior Sales. */
export const JUNIOR_TEXT_RESULTS = [
  "No Text Reply",
  "Simple Reschedule",
  "Call Requested",
  "Reschedule by Phone",
  "ISP Complaint",
  "Price Approval Needed",
  "Not Interested",
  "Wrong Number",
  "Do Not Call",
] as const;

export type JuniorTextResult = (typeof JUNIOR_TEXT_RESULTS)[number];
export type CallResult = (typeof CALL_RESULTS)[number];

export const ALERT_TYPES = [
  "None",
  "ISP Complaint Needs Fix",
  "Price Approval Needed",
] as const;

export const ALERT_STATUSES = [
  "None",
  "Needs Email",
  "Email Sent",
  "In Review",
  "Resolved",
] as const;

export const OUTCOMES = [
  "Pending",
  "Rescheduled",
  "New Account Created",
  "Not Interested",
  "Wrong Number",
  "Do Not Call",
  "Closed",
] as const;

export const PRICE_APPROVAL_STATUSES = [
  "Not Requested",
  "Pending",
  "Approved",
  "Denied",
] as const;

export const ISP_COLUMN_MAP: Record<string, string> = {
  Status: "isp_status",
  Name: "full_name",
  Number: "phone",
  "ACCT#": "account_number",
  "order date": "order_date",
  "install date": "install_date",
  "install complete": "install_complete",
  "sales rep ID": "sales_rep_id",
  address: "address",
  product: "product",
  Term: "term",
  "Call Ahead-Comets Notes": "isp_notes",
};

export const CRM_FIELDS = [
  { key: "isp_status", label: "ISP Status" },
  { key: "full_name", label: "Full Name" },
  { key: "phone", label: "Phone" },
  { key: "account_number", label: "Account Number" },
  { key: "order_date", label: "Order Date" },
  { key: "install_date", label: "Install Date" },
  { key: "install_complete", label: "Install Complete" },
  { key: "sales_rep_id", label: "Sales Rep ID" },
  { key: "address", label: "Address" },
  { key: "product", label: "Product" },
  { key: "term", label: "Term" },
  { key: "isp_notes", label: "ISP Notes" },
] as const;

export const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["admin", "manager", "va_manager", "junior_sales", "senior_sales"],
  },
  { label: "Import Customers", href: "/import", roles: ["admin", "manager"] },
  { label: "Master CRM", href: "/customers", roles: ["admin", "manager"] },
  {
    label: "Junior Sales Team",
    href: "/junior-sales",
    roles: ["admin", "manager", "va_manager", "junior_sales"],
  },
  {
    label: "Senior Sales Team",
    href: "/senior-sales",
    roles: ["admin", "manager", "va_manager", "senior_sales"],
  },
  {
    label: "No Reply — Recycle",
    href: "/recycle-hold",
    roles: ["admin", "manager"],
  },
  { label: "Alerts", href: "/alerts", roles: ["admin", "manager", "va_manager"] },
  { label: "ISPs", href: "/isps", roles: ["admin", "manager"] },
  { label: "Users", href: "/users", roles: ["admin"] },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

/** Sidebar links for the signed-in user's role. */
export function getNavItemsForRole(role: string | null | undefined): NavItem[] {
  const normalized = normalizeRole(role);
  if (!normalized) return [];

  const items = NAV_ITEMS.filter((item) =>
    (item.roles as readonly string[]).includes(normalized)
  );
  if (items.length > 0) return [...items];

  const fallbackHrefs: Record<Role, string[]> = {
    admin: [
      "/dashboard",
      "/import",
      "/customers",
      "/junior-sales",
      "/senior-sales",
      "/recycle-hold",
      "/alerts",
      "/isps",
      "/users",
    ],
    manager: [
      "/dashboard",
      "/import",
      "/customers",
      "/junior-sales",
      "/senior-sales",
      "/recycle-hold",
      "/alerts",
      "/isps",
    ],
    va_manager: [
      "/dashboard",
      "/junior-sales",
      "/senior-sales",
      "/alerts",
    ],
    junior_sales: ["/dashboard", "/junior-sales"],
    senior_sales: ["/dashboard", "/senior-sales"],
  };

  const hrefs = fallbackHrefs[normalized];
  return NAV_ITEMS.filter((item) => hrefs.includes(item.href));
}
