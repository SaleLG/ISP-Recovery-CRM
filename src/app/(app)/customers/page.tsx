import { Suspense } from "react";
import Link from "next/link";
import { Typography, Box, Skeleton, Alert, Button } from "@mui/material";
import CustomerTable from "@/components/customers/CustomerTable";
import { getCustomers } from "@/actions/customers";
import { getISPsWithCounts } from "@/actions/isps";
import { getTeamMembers } from "@/actions/team";
import { requireRole } from "@/lib/auth";

function TableSkeleton() {
  return (
    <Box>
      <Skeleton variant="rectangular" height={48} sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton variant="rectangular" height={560} sx={{ borderRadius: 1 }} />
    </Box>
  );
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ isp?: string }>;
}) {
  const profile = await requireRole(["admin", "manager"]);
  const { isp } = await searchParams;
  const [customers, isps, seniorTeamMembers, juniorTeamMembers] =
    await Promise.all([
      getCustomers(),
      getISPsWithCounts(),
      getTeamMembers("Senior Sales Team"),
      getTeamMembers("Junior Sales Team"),
    ]);

  const selectedIspId =
    isp && isps.some((item) => item.id === isp) ? isp : isps[0]?.id ?? "";
  const selectedIsp = isps.find((item) => item.id === selectedIspId);

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Master CRM
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Each ISP has its own CRM table with custom columns. Select an ISP to view
        and manage that ISP&apos;s customers.
      </Typography>

      {isps.length > 0 && (
        <Button
          component={Link}
          href="/isps"
          variant="outlined"
          size="small"
          sx={{ mb: 3 }}
        >
          Manage ISP Columns
        </Button>
      )}

      {isps.length === 0 ? (
        <Alert severity="info" action={
          <Button component={Link} href="/isps" color="inherit" size="small">
            Add ISP
          </Button>
        }>
          Create an ISP and define its columns before using Master CRM.
        </Alert>
      ) : (
        <Suspense fallback={<TableSkeleton />}>
          <CustomerTable
            customers={customers}
            isps={isps}
            ispColumns={selectedIsp?.columns ?? []}
            allowBulkDelete
            showAssigneeColumn
            showAssigneeFilter
            allowAssign
            teamMembers={seniorTeamMembers}
            allowBulkAssign
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
