"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import {
  normalizeRole,
  normalizeStageLabel,
  normalizeTeamLabel,
} from "@/lib/constants";
import type { DashboardScope, DashboardStats, Profile } from "@/lib/types";
import { fetchAllRows } from "@/lib/pagination";

type CustomerRow = {
  id: string;
  isp_id: string | null;
  assigned_team: string | null;
  assigned_user_id: string | null;
  workflow_stage: string | null;
  follow_up_date: string | null;
  alert_status: string | null;
  alert_type: string | null;
  price_approval_status: string | null;
  transfer_status: string | null;
  [key: string]: unknown;
};

function scopeCustomersForDashboard(
  customers: CustomerRow[],
  profile: Profile,
  role: DashboardScope
): CustomerRow[] {
  if (role === "senior_sales") {
    return customers.filter(
      (c) =>
        c.assigned_team === "Senior Sales Team" &&
        c.assigned_user_id === profile.id
    );
  }
  if (role === "junior_sales") {
    return customers.filter((c) => c.assigned_team === "Junior Sales Team");
  }
  return customers;
}

function countByLabel(
  counts: Record<string, number>,
  raw: string | null | undefined,
  normalize: (value: string | null | undefined) => string
) {
  const label = normalize(raw);
  counts[label] = (counts[label] || 0) + 1;
}

function countStage(customers: CustomerRow[], stage: string) {
  return customers.filter((c) => c.workflow_stage === stage).length;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const profile = await requireAuth();
  const role = normalizeRole(profile.role);
  const scope: DashboardScope =
    role === "junior_sales" || role === "senior_sales" ? role : "admin";

  const supabase = await createClient();

  // Paginated so dashboard stats count the full data set, not just the first
  // 1000 rows PostgREST returns by default.
  const customers = await fetchAllRows<CustomerRow>((fromIdx, toIdx) =>
    supabase
      .from("customers")
      .select("*")
      .order("id", { ascending: true })
      .range(fromIdx, toIdx)
  );
  const callLogs = await fetchAllRows<{
    team: string | null;
    customer_id: string | null;
    call_result: string | null;
  }>((fromIdx, toIdx) =>
    supabase
      .from("call_logs")
      .select("team, customer_id, call_result")
      .order("id", { ascending: true })
      .range(fromIdx, toIdx)
  );
  const { data: isps } = await supabase.from("isps").select("id, name");

  const allCustomers = (customers || []) as CustomerRow[];
  const all = scopeCustomersForDashboard(allCustomers, profile, scope);
  const visibleCustomerIds = new Set(all.map((c) => c.id));
  const today = new Date().toISOString().split("T")[0];

  const countByTeam = (team: string) =>
    allCustomers.filter((c) => c.assigned_team === team).length;

  const ispCounts: Record<string, number> = {};
  for (const c of all) {
    const isp = isps?.find((i) => i.id === c.isp_id);
    const name = isp?.name || "Unknown";
    ispCounts[name] = (ispCounts[name] || 0) + 1;
  }

  const stageCounts: Record<string, number> = {};
  for (const c of all) {
    countByLabel(stageCounts, c.workflow_stage, normalizeStageLabel);
  }

  const teamCounts: Record<string, number> = {};
  for (const c of allCustomers) {
    countByLabel(teamCounts, c.assigned_team, normalizeTeamLabel);
  }

  const callTeamCounts: Record<string, number> = {};
  const callResultCounts: Record<string, number> = {};
  let callsLogged = 0;

  for (const log of callLogs || []) {
    if (!log.customer_id || !visibleCustomerIds.has(log.customer_id)) continue;
    callsLogged += 1;
    countByLabel(callTeamCounts, log.team, normalizeTeamLabel);
    if (log.call_result) {
      callResultCounts[log.call_result] =
        (callResultCounts[log.call_result] || 0) + 1;
    }
  }

  return {
    scope,
    totalCustomers: all.length,
    newLeads: countStage(all, "New"),
    attempt1: countStage(all, "Attempt 1"),
    attempt2: countStage(all, "Attempt 2"),
    attempt3: countStage(all, "Attempt 3"),
    callbackRequested: countStage(all, "Callback Requested"),
    rescheduled: countStage(all, "Rescheduled"),
    newAccountsCreated: countStage(all, "New Account Created"),
    closed: countStage(all, "Closed"),
    juniorSalesLeads: countByTeam("Junior Sales Team"),
    seniorSalesLeads: countByTeam("Senior Sales Team"),
    unassignedSeniorEscalations: allCustomers.filter(
      (c) =>
        c.assigned_team === "Senior Sales Team" && !c.assigned_user_id
    ).length,
    recycleHold: countByTeam("Recycle Hold"),
    recycleReady: allCustomers.filter(
      (c) =>
        c.assigned_team === "Recycle Hold" &&
        c.follow_up_date &&
        c.follow_up_date <= today
    ).length,
    alertsNeedingEmail: allCustomers.filter(
      (c) => c.alert_status === "Needs Email"
    ).length,
    priceApprovalRequests: allCustomers.filter(
      (c) =>
        c.alert_type === "Price Approval Needed" &&
        c.price_approval_status === "Pending"
    ).length,
    callsLogged,
    customersByIsp: Object.entries(ispCounts).map(([name, count]) => ({
      name,
      count,
    })),
    customersByStage: Object.entries(stageCounts).map(([stage, count]) => ({
      stage,
      count,
    })),
    customersByTeam: Object.entries(teamCounts).map(([team, count]) => ({
      team,
      count,
    })),
    callAttemptsByTeam: Object.entries(callTeamCounts).map(([team, count]) => ({
      team,
      count,
    })),
    callsByResult: Object.entries(callResultCounts).map(([result, count]) => ({
      result,
      count,
    })),
  };
}
