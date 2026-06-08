import { Typography } from "@mui/material";
import ISPManager from "@/components/isps/ISPManager";
import { getISPsWithCounts } from "@/actions/isps";
import { requireRole } from "@/lib/auth";

export default async function ISPsPage() {
  await requireRole(["admin", "manager"]);
  const isps = await getISPsWithCounts();

  return (
    <>
      <Typography variant="h4" gutterBottom>
        ISPs
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Create an ISP to set up a separate CRM table. Import customers for each
        ISP, then view them on Master CRM.
      </Typography>
      <ISPManager isps={isps} />
    </>
  );
}
