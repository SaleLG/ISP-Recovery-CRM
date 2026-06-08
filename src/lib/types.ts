import type {
  Team,
  Role,
} from "./constants";

export interface Profile {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: Role;
  team: Team | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ISP {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ISPColumn {
  id: string;
  isp_id: string;
  column_key: string;
  label: string;
  field_type: "text" | "date" | "phone" | "number";
  sort_order: number;
  is_primary: boolean;
  used_for_matching: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  isp_id: string | null;
  account_number: string | null;
  isp_status: string | null;
  full_name: string | null;
  phone: string | null;
  normalized_phone: string | null;
  address: string | null;
  product: string | null;
  term: string | null;
  order_date: string | null;
  install_date: string | null;
  install_complete: string | null;
  sales_rep_id: string | null;
  isp_notes: string | null;
  custom_fields?: Record<string, string | null> | null;
  assigned_team: Team;
  assigned_user_id: string | null;
  call_attempt_number: number;
  workflow_stage: string;
  transfer_status: string;
  recovery_status: string;
  outcome: string;
  alert_type: string;
  alert_status: string;
  price_approval_status: string;
  last_contact_date: string | null;
  follow_up_date: string | null;
  source_import_id: string | null;
  created_at: string;
  updated_at: string;
  isps?: ISP | null;
  profiles?: Profile | null;
}

export interface CallLog {
  id: string;
  customer_id: string;
  user_id: string | null;
  team: string | null;
  attempt_number: number | null;
  call_result: string | null;
  notes: string | null;
  is_three_way: boolean;
  senior_assisted_user_id: string | null;
  created_at: string;
  profiles?: Profile | null;
  senior_assisted?: Profile | null;
}

export interface CustomerNote {
  id: string;
  customer_id: string;
  user_id: string | null;
  note: string;
  created_at: string;
  profiles?: Profile | null;
}

export interface Activity {
  id: string;
  customer_id: string;
  user_id: string | null;
  activity_type: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
  profiles?: Profile | null;
}

export interface ImportRecord {
  id: string;
  isp_id: string | null;
  file_name: string | null;
  uploaded_by: string | null;
  default_assigned_team: string;
  total_rows: number;
  new_customers: number;
  updated_customers: number;
  skipped_rows: number;
  error_rows: number;
  created_at: string;
}

export interface DashboardStats {
  totalCustomers: number;
  seniorSalesLeads: number;
  recoveryLeads: number;
  recoveryNeeded: number;
  alertsNeedingEmail: number;
  priceApprovalRequests: number;
  rescheduled: number;
  newAccountsCreated: number;
  closed: number;
  customersByIsp: { name: string; count: number }[];
  customersByStage: { stage: string; count: number }[];
  customersByTeam: { team: string; count: number }[];
  callAttemptsByTeam: { team: string; count: number }[];
}

export interface CustomerFilters {
  search?: string;
  isp_id?: string;
  assigned_team?: string;
  assigned_user_id?: string;
  workflow_stage?: string;
  transfer_status?: string;
  alert_type?: string;
  alert_status?: string;
}

export interface LogCallOptions {
  isThreeWay?: boolean;
  seniorAssistedUserId?: string | null;
}

export interface ImportPreviewRow {
  rowNumber: number;
  mapped: Record<string, string | null>;
}

export interface ImportSummary {
  total_rows: number;
  new_customers: number;
  updated_customers: number;
  skipped_rows: number;
  error_rows: number;
}
