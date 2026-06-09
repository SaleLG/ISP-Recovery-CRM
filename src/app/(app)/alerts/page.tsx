import { Suspense } from "react";
import { Typography, Box, Skeleton, Alert } from "@mui/material";
import AlertsTable from "@/components/alerts/AlertsTable";
import { getAlerts } from "@/actions/customers";
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

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ isp?: string }>;
}) {
  await requireRole(["admin", "manager"]);
  const { isp } = await searchParams;
  const [alerts, isps] = await Promise.all([getAlerts(), getISPsWithCounts()]);

  const selectedIspId =
    isp && isps.some((item) => item.id === isp) ? isp : isps[0]?.id ?? "";
  const selectedIsp = isps.find((item) => item.id === selectedIspId);

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Alerts & Management Review
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Review ISP complaints, price approval requests, and email alerts. Select
        an ISP tab to view that ISP&apos;s alerts.
      </Typography>

      {isps.length === 0 ? (
        <Alert severity="info">
          No ISPs configured yet. Add ISPs and columns before managing alerts.
        </Alert>
      ) : (
        <Suspense fallback={<TableSkeleton />}>
          <AlertsTable
            alerts={alerts}
            isps={isps}
            ispColumns={selectedIsp?.columns ?? []}
            defaultIspId={selectedIspId}
          />
        </Suspense>
      )}
    </>
  );
}
