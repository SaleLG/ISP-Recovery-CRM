import { Suspense } from "react";
import { Typography, Box, Skeleton, Alert } from "@mui/material";
import CustomerTable from "@/components/customers/CustomerTable";
import { getCustomers } from "@/actions/customers";
import { getISPsWithCounts } from "@/actions/isps";
import { getTeamMembers } from "@/actions/team";
import { requireRole } from "@/lib/auth";
import { normalizeRole } from "@/lib/constants";

function TableSkeleton() {
  return (
    <Box>
      <Skeleton variant="rectangular" height={48} sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={560} sx={{ borderRadius: 1 }} />
    </Box>
  );
}

export default async function JuniorSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ isp?: string }>;
}) {
  const profile = await requireRole([
    "admin",
    "manager",
    "va_manager",
    "junior_sales",
  ]);
  const role = normalizeRole(profile.role);
  const canManage =
    role === "admin" || role === "manager" || role === "va_manager";
  const { isp } = await searchParams;
  const [customers, isps, juniorTeamMembers] = await Promise.all([
    getCustomers({ assigned_team: "Junior Sales Team" }),
    getISPsWithCounts(),
    canManage ? getTeamMembers("Junior Sales Team") : Promise.resolve([]),
  ]);

  const selectedIspId =
    isp && isps.some((item) => item.id === isp) ? isp : isps[0]?.id ?? "";
  const selectedIsp = isps.find((item) => item.id === selectedIspId);

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Junior Sales Team
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Text-only outreach for new and recycled leads through Attempt 1, 2, and
        3. Simple reschedules confirmed by text stay here. If the customer wants a
        call, needs a phone reschedule, has a complaint, or needs price
        approval, the lead escalates to Senior Sales for a manager to assign a
        rep. After 3 text attempts with no reply, leads move to the manager&apos;s
        No Reply — Recycle basket for 30 days. Select an ISP to view
        customers.
      </Typography>

      {canManage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Delegate leads to a junior rep with the <strong>Assigned To</strong>{" "}
          column, or select rows to <strong>Delegate selected</strong> or{" "}
          <strong>Auto-distribute</strong> the available leads.
        </Alert>
      )}

      {isps.length === 0 ? (
        <Alert severity="info">
          No ISPs configured yet. Contact an admin to set up ISPs and columns.
        </Alert>
      ) : (
        <Suspense fallback={<TableSkeleton />}>
          <CustomerTable
            customers={customers}
            isps={isps}
            ispColumns={selectedIsp?.columns ?? []}
            showTeamFilter={false}
            defaultTeam="Junior Sales Team"
            showAssigneeFilter
            showAssigneeColumn
            allowBulkAssign={canManage}
            juniorMembers={juniorTeamMembers}
            currentUserId={profile.id}
            defaultIspId={selectedIspId}
            ispSelectorVariant="searchable"
            syncUrlOnIspChange
            hideAllIspTab
            requireIspSelection
          />
        </Suspense>
      )}
    </>
  );
}
