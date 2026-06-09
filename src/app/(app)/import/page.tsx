import { Typography } from "@mui/material";
import ImportWizard from "@/components/import/ImportWizard";
import { getISPsWithCounts } from "@/actions/isps";
import { requireRole } from "@/lib/auth";

export const maxDuration = 300;

export default async function ImportPage() {
  await requireRole(["admin", "manager"]);
  const isps = await getISPsWithCounts();

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Import Customers
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Select an ISP, map spreadsheet columns to that ISP&apos;s CRM columns,
        then import customer records.
      </Typography>
      <ImportWizard isps={isps} />
    </>
  );
}
