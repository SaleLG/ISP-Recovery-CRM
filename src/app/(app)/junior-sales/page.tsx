import { Suspense } from "react";
import { Typography, Box, Skeleton, Alert } from "@mui/material";
import CustomerTable from "@/components/customers/CustomerTable";
import { getCustomers } from "@/actions/customers";
import { getISPsWithCounts } from "@/actions/isps";
import { requireRole } from "@/lib/auth";

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
  await requireRole(["admin", "manager", "va_manager", "junior_sales"]);
  const { isp } = await searchParams;
  const [customers, isps] = await Promise.all([
    getCustomers({ assigned_team: "Junior Sales Team" }),
    getISPsWithCounts(),
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
        No Reply — Recycle basket for 30 days. Select an ISP tab to view
        customers.
      </Typography>

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
            defaultIspId={selectedIspId}
            ispSelectorVariant="tabs"
            syncUrlOnIspChange
            hideAllIspTab
            requireIspSelection
          />
        </Suspense>
      )}
    </>
  );
}
