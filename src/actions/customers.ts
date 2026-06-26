"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireRole } from "@/lib/auth";
import { normalizeRole, JUNIOR_TEXT_COOLDOWN_MINUTES } from "@/lib/constants";
import {
  getNextAttemptStage,
  getOutcomeFromCallResult,
  getWorkflowStageFromCallResult,
  getAlertFromCallResult,
  shouldEscalateToSenior,
  shouldMoveToRecycleHold,
  getRecycleFollowUpDate,
  getInteractionResults,
  getInteractionLabel,
} from "@/lib/workflow";
import type { CustomerFilters, LogCallOptions } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function getCustomers(filters: CustomerFilters = {}) {
  await requireAuth();
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("*, isps(id, name), profiles:assigned_user_id(id, full_name)")
    .order("updated_at", { ascending: false });

  if (filters.isp_id) query = query.eq("isp_id", filters.isp_id);
  if (filters.assigned_team) query = query.eq("assigned_team", filters.assigned_team);
  if (filters.assigned_user_id) query = query.eq("assigned_user_id", filters.assigned_user_id);
  if (filters.workflow_stage) query = query.eq("workflow_stage", filters.workflow_stage);
  if (filters.transfer_status) query = query.eq("transfer_status", filters.transfer_status);
  if (filters.alert_type) query = query.eq("alert_type", filters.alert_type);
  if (filters.alert_status) query = query.eq("alert_status", filters.alert_status);

  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `full_name.ilike.${term},phone.ilike.${term},account_number.ilike.${term},address.ilike.${term}`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getCustomer(id: string) {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*, isps(id, name), profiles:assigned_user_id(id, full_name, email)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateCustomer(
  id: string,
  updates: Record<string, unknown>
) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) throw new Error("Customer not found");

  const role = normalizeRole(profile.role);
  const payload = { ...updates };

  const workflowLockedFields = [
    "assigned_team",
    "workflow_stage",
    "transfer_status",
    "outcome",
    "call_attempt_number",
  ] as const;

  for (const field of workflowLockedFields) {
    if (payload[field] !== undefined && payload[field] !== existing[field]) {
      if (role !== "admin") {
        throw new Error(
          "Team, stage, transfer status, and outcome are set automatically by the workflow"
        );
      }
    }
  }

  if (payload.assigned_user_id !== undefined) {
    if (role !== "admin" && role !== "manager" && role !== "va_manager") {
      throw new Error("Only managers can assign senior sales reps");
    }
    if (existing.assigned_team === "Recycle Hold") {
      throw new Error("Recycle Hold leads are not assigned to a sales rep");
    }
    if (existing.assigned_team !== "Senior Sales Team") {
      throw new Error("Senior reps can only be assigned to Senior Sales Team leads");
    }
    const assigneeId = payload.assigned_user_id as string | null;
    if (assigneeId) {
      const { data: assignee } = await supabase
        .from("profiles")
        .select("id, role, is_active")
        .eq("id", assigneeId)
        .single();
      if (!assignee || normalizeRole(assignee.role) !== "senior_sales") {
        throw new Error("Selected user is not an active senior sales rep");
      }
      if (!assignee.is_active) {
        throw new Error("Selected senior sales rep is not active");
      }
      if (existing.transfer_status === "Senior Review") {
        payload.transfer_status = "None";
      }
    }
  }

  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const trackFields = [
    "assigned_team",
    "assigned_user_id",
    "workflow_stage",
    "transfer_status",
    "alert_type",
    "alert_status",
    "outcome",
    "recovery_status",
  ];

  for (const field of trackFields) {
    if (payload[field] !== undefined && payload[field] !== existing[field]) {
      let oldVal = String(existing[field] ?? "");
      let newVal = String(payload[field] ?? "");
      let description = `Updated ${field}`;

      if (field === "assigned_user_id") {
        const ids = [existing[field], payload[field]].filter(Boolean) as string[];
        if (ids.length > 0) {
          const { data: names } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", ids);
          const label = (uid: string | null) =>
            names?.find((p) => p.id === uid)?.full_name || "Unassigned";
          oldVal = label(existing[field]);
          newVal = label(payload[field] as string | null);
        } else {
          oldVal = "Unassigned";
          newVal = "Unassigned";
        }
        description = `Assigned lead to ${newVal}`;
      }

      await supabase.from("activities").insert({
        customer_id: id,
        user_id: profile.id,
        activity_type: "field_update",
        old_value: oldVal,
        new_value: newVal,
        description,
      });
    }
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  revalidatePath("/junior-sales");
  revalidatePath("/senior-sales");
  revalidatePath("/recycle-hold");
  revalidatePath("/dashboard");
  revalidatePath("/alerts");

  return data;
}

export async function logCall(
  customerId: string,
  callResult: string,
  notes: string,
  options: LogCallOptions = {}
) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (!customer) throw new Error("Customer not found");

  const team = customer.assigned_team;
  const role = normalizeRole(profile.role);

  if (options.isThreeWay && !options.seniorAssistedUserId) {
    return { error: "Please select the senior who assisted on the 3-way call" };
  }

  const allowedResults = getInteractionResults(team, role);
  if (!allowedResults.includes(callResult)) {
    return { error: "Invalid interaction result for this team" };
  }

  // Guardrail: juniors must wait between outbound text attempts on the same
  // lead. Only applies to "No Text Reply" (an outbound text with no response);
  // recording an actual reply result is never blocked.
  if (
    role === "junior_sales" &&
    team === "Junior Sales Team" &&
    callResult === "No Text Reply"
  ) {
    const { data: lastLog } = await supabase
      .from("call_logs")
      .select("created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLog?.created_at) {
      const elapsedMs = Date.now() - new Date(lastLog.created_at).getTime();
      const cooldownMs = JUNIOR_TEXT_COOLDOWN_MINUTES * 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const minutesLeft = Math.ceil((cooldownMs - elapsedMs) / 60000);
        return {
          error: `Please wait ${minutesLeft} more minute${
            minutesLeft === 1 ? "" : "s"
          } before sending another text to this lead.`,
        };
      }
    }
  }

  const interactionLabel = getInteractionLabel(team, role);

  const newAttemptNumber = customer.call_attempt_number + 1;

  const { error: callLogError } = await supabase.from("call_logs").insert({
    customer_id: customerId,
    user_id: profile.id,
    team,
    attempt_number: newAttemptNumber,
    call_result: callResult,
    notes,
    is_three_way: options.isThreeWay ?? false,
    senior_assisted_user_id: options.isThreeWay
      ? options.seniorAssistedUserId
      : null,
  });

  if (callLogError) throw new Error(callLogError.message);

  const updates: Record<string, unknown> = {
    call_attempt_number: newAttemptNumber,
    last_contact_date: new Date().toISOString().split("T")[0],
  };

  // A junior takes ownership of a Junior Sales lead the first time they log an
  // attempt on it. Escalation / recycle below will clear this if the lead
  // leaves the junior pool.
  if (
    role === "junior_sales" &&
    team === "Junior Sales Team" &&
    !customer.assigned_user_id
  ) {
    updates.assigned_user_id = profile.id;
  }

  const stageFromResult = getWorkflowStageFromCallResult(callResult);
  if (stageFromResult) {
    updates.workflow_stage = stageFromResult;
  } else if (team === "Junior Sales Team" && newAttemptNumber <= 3) {
    updates.workflow_stage = getNextAttemptStage(customer.call_attempt_number);
  }

  const outcome = getOutcomeFromCallResult(callResult);
  if (outcome) updates.outcome = outcome;

  const alert = getAlertFromCallResult(callResult);
  if (alert) {
    updates.alert_type = alert.alert_type;
    updates.alert_status = alert.alert_status;
    if (alert.price_approval_status) {
      updates.price_approval_status = alert.price_approval_status;
    }
    updates.transfer_status = "Management Review";
  }

  if (team === "Junior Sales Team" && shouldEscalateToSenior(callResult)) {
    updates.assigned_team = "Senior Sales Team";
    updates.transfer_status = "Senior Review";
    updates.assigned_user_id = null;
  }

  const escalatedToSenior =
    team === "Junior Sales Team" && shouldEscalateToSenior(callResult);

  const moveToRecycleHold =
    team === "Junior Sales Team" &&
    shouldMoveToRecycleHold(newAttemptNumber, callResult);

  if (moveToRecycleHold) {
    updates.assigned_team = "Recycle Hold";
    updates.workflow_stage = "No Reply - Hold";
    updates.transfer_status = "Recycle in 30 Days";
    updates.follow_up_date = getRecycleFollowUpDate();
    updates.assigned_user_id = null;
  }

  const needsAdminUpdate =
    role === "junior_sales" && (moveToRecycleHold || escalatedToSenior);
  const admin = needsAdminUpdate ? createAdminClient() : null;
  const db = admin ?? supabase;
  const { error } = await db
    .from("customers")
    .update(updates)
    .eq("id", customerId);

  if (error) throw new Error(error.message);

  let activityDesc = `Logged ${interactionLabel} attempt #${newAttemptNumber}: ${callResult}`;
  if (options.isThreeWay && options.seniorAssistedUserId) {
    const { data: senior } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", options.seniorAssistedUserId)
      .single();
    activityDesc += ` (3-way with ${senior?.full_name || "senior"})`;
  }

  await supabase.from("activities").insert({
    customer_id: customerId,
    user_id: profile.id,
    activity_type: "call_logged",
    new_value: callResult,
    description: activityDesc,
  });

  if (team === "Junior Sales Team" && shouldEscalateToSenior(callResult)) {
    await (admin ?? supabase).from("activities").insert({
      customer_id: customerId,
      user_id: profile.id,
      activity_type: "team_transfer",
      old_value: "Junior Sales Team",
      new_value: "Senior Sales Team",
      description: `Escalated to Senior Sales: ${callResult}`,
    });
  }

  if (moveToRecycleHold) {
    await (admin ?? supabase).from("activities").insert({
      customer_id: customerId,
      user_id: profile.id,
      activity_type: "team_transfer",
      old_value: "Junior Sales Team",
      new_value: "Recycle Hold",
      description: `No reply after 3 attempts — recycle hold for 30 days (follow-up ${updates.follow_up_date})`,
    });
  }

  const leftJuniorView =
    role === "junior_sales" && (escalatedToSenior || moveToRecycleHold);

  revalidatePath("/junior-sales");
  revalidatePath("/senior-sales");
  revalidatePath("/recycle-hold");
  revalidatePath("/dashboard");
  revalidatePath("/alerts");

  if (!leftJuniorView) {
    revalidatePath(`/customers/${customerId}`);
  }

  return {
    success: true,
    attemptNumber: newAttemptNumber,
    redirectTo: leftJuniorView ? "/junior-sales" : undefined,
  };
}

/**
 * One-click outbound text attempt for juniors ("no reason necessary").
 * Records a "No Text Reply" attempt, which claims ownership of the lead and is
 * subject to the per-lead cooldown enforced in logCall.
 */
export async function markTextAttempt(customerId: string) {
  return logCall(customerId, "No Text Reply", "");
}

export async function quickRescheduleInstall(
  customerId: string,
  notes: string,
  followUpDate?: string
) {
  const result = await logCall(
    customerId,
    "Rescheduled",
    notes || "Install appointment rescheduled",
    { isThreeWay: false }
  );
  if ("error" in result && result.error) return result;

  if (followUpDate && !result.redirectTo) {
    await updateCustomer(customerId, { follow_up_date: followUpDate });
  }

  return result;
}

export async function recycleToJunior(customerId: string) {
  const profile = await requireRole(["admin", "manager"]);
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (!customer) throw new Error("Customer not found");
  if (customer.assigned_team !== "Recycle Hold") {
    throw new Error("Customer is not in the No Reply recycle basket");
  }

  const updates = {
    assigned_team: "Junior Sales Team",
    workflow_stage: "New",
    transfer_status: "Recycled to Junior",
    call_attempt_number: 0,
    follow_up_date: null,
    assigned_user_id: null,
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("customers")
    .update(updates)
    .eq("id", customerId);

  if (error) throw new Error(error.message);

  await admin.from("activities").insert({
    customer_id: customerId,
    user_id: profile.id,
    activity_type: "team_transfer",
    old_value: "Recycle Hold",
    new_value: "Junior Sales Team",
    description: "Recycled back to Junior Sales for a new outreach round",
  });

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/junior-sales");
  revalidatePath("/recycle-hold");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function addNote(customerId: string, note: string) {
  const profile = await requireAuth();
  const supabase = await createClient();

  const { error } = await supabase.from("customer_notes").insert({
    customer_id: customerId,
    user_id: profile.id,
    note,
  });

  if (error) throw new Error(error.message);

  await supabase.from("activities").insert({
    customer_id: customerId,
    user_id: profile.id,
    activity_type: "note_added",
    description: "Added a note",
  });

  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function getCallLogs(customerId: string) {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("call_logs")
    .select(
      "*, profiles:profiles!user_id(id, full_name), senior_assisted:profiles!senior_assisted_user_id(id, full_name)"
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getCustomerNotes(customerId: string) {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customer_notes")
    .select("*, profiles(id, full_name)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getActivities(customerId: string) {
  await requireAuth();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activities")
    .select("*, profiles(id, full_name)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

const ALERTS_FILTER_OR =
  "and(alert_status.eq.Needs Email,alert_type.neq.None),and(alert_type.eq.ISP Complaint Needs Fix,alert_status.neq.Resolved),and(alert_type.eq.Price Approval Needed,alert_status.neq.Resolved)";

export async function getAlertCount(): Promise<number> {
  await requireRole(["admin", "manager", "va_manager"]);
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("alert_status", "Needs Email")
    .neq("alert_type", "None");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getAlerts() {
  await requireRole(["admin", "manager", "va_manager"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select("*, isps(id, name)")
    .or(ALERTS_FILTER_OR)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function updateAlert(
  customerId: string,
  alertStatus: string,
  priceApprovalStatus?: string
) {
  await requireRole(["admin", "manager", "va_manager"]);
  const supabase = await createClient();

  const updates: Record<string, unknown> = { alert_status: alertStatus };
  if (priceApprovalStatus) {
    updates.price_approval_status = priceApprovalStatus;
  }

  
  const { error } = await supabase
    .from("customers")
    .update(updates)
    .eq("id", customerId);

  if (error) throw new Error(error.message);

  revalidatePath("/alerts");
  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function deleteCustomers(ids: string[]) {
  await requireRole(["admin", "manager"]);
  if (ids.length === 0) return { success: true, deleted: 0 };

  const admin = createAdminClient();

  const { error: unlinkError } = await admin
    .from("import_rows")
    .update({ customer_id: null })
    .in("customer_id", ids);

  if (unlinkError) throw new Error(unlinkError.message);

  const { error } = await admin.from("customers").delete().in("id", ids);

  if (error) throw new Error(error.message);

  revalidatePath("/customers");
  revalidatePath("/junior-sales");
  revalidatePath("/senior-sales");
  revalidatePath("/recycle-hold");
  revalidatePath("/dashboard");
  revalidatePath("/alerts");

  return { success: true, deleted: ids.length };
}
