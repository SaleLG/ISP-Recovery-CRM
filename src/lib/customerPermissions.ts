import type { Customer, Profile } from "@/lib/types";
import { normalizeRole } from "@/lib/constants";

export function isManager(profile: Profile) {
  const role = normalizeRole(profile.role);
  return role === "admin" || role === "manager";
}

export function isVaManager(profile: Profile) {
  return normalizeRole(profile.role) === "va_manager";
}

export function canEditWorkflowFields(profile: Profile) {
  return isManager(profile);
}

export function canAssignSeniorAgent(profile: Profile) {
  return isManager(profile) || isVaManager(profile);
}

export function canAssignSeniorToCustomer(customer: Customer) {
  return customer.assigned_team === "Senior Sales Team";
}

export function canEditSeniorAssignment(customer: Customer, profile: Profile) {
  return canAssignSeniorAgent(profile) && canAssignSeniorToCustomer(customer);
}

export function canLogCall(customer: Customer, profile: Profile) {
  if (isManager(profile)) return true;
  if (
    isVaManager(profile) &&
    (customer.assigned_team === "Junior Sales Team" ||
      customer.assigned_team === "Senior Sales Team")
  ) {
    return true;
  }
  if (
    normalizeRole(profile.role) === "junior_sales" &&
    customer.assigned_team === "Junior Sales Team"
  ) {
    return true;
  }
  if (
    normalizeRole(profile.role) === "senior_sales" &&
    customer.assigned_team === "Senior Sales Team"
  ) {
    return true;
  }
  return false;
}

export function canUseSeniorSalesActions(customer: Customer, profile: Profile) {
  if (customer.assigned_team !== "Senior Sales Team") return false;
  return (
    isManager(profile) ||
    isVaManager(profile) ||
    normalizeRole(profile.role) === "senior_sales"
  );
}

export function canUseRecycleHoldActions(customer: Customer, profile: Profile) {
  if (customer.assigned_team !== "Recycle Hold") return false;
  return isManager(profile);
}
