"use client";

import {
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Box,
  Stack,
} from "@mui/material";
import CustomerDetailActions from "./CustomerDetailActions";
import CallHistoryTable from "./CallHistoryTable";
import NotesSection from "./NotesSection";
import ActivityTimeline from "./ActivityTimeline";
import { getCustomerDisplayName, getCustomFieldValue } from "@/lib/customerFields";
import { formatIspStatus } from "@/lib/constants";
import type { CallLog, Customer, ISPColumn, Profile } from "@/lib/types";

interface Note {
  id: string;
  note: string;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

interface Activity {
  id: string;
  activity_type: string | null;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

interface Props {
  customer: Customer;
  ispColumns?: ISPColumn[];
  callLogs: CallLog[];
  notes: Note[];
  activities: Activity[];
  profile: Profile;
  recoveryTeamMembers: Pick<Profile, "id" | "full_name">[];
  seniorAssistUsers: Pick<Profile, "id" | "full_name">[];
}

export default function CustomerDetailContent({
  customer,
  ispColumns = [],
  callLogs,
  notes,
  activities,
  profile,
  recoveryTeamMembers,
  seniorAssistUsers,
}: Props) {
  const displayName = getCustomerDisplayName(
    customer.custom_fields,
    ispColumns,
    customer.full_name
  );

  const infoFields =
    ispColumns.length > 0
      ? [
          { label: "ISP", value: customer.isps?.name },
          ...ispColumns.map((col) => {
            const raw =
              getCustomFieldValue(customer.custom_fields, col.column_key) ??
              (customer[col.column_key as keyof Customer] as string | null);
            const value =
              col.column_key === "isp_status" && raw
                ? formatIspStatus(raw)
                : raw;
            return { label: col.label, value };
          }),
        ]
      : [
          { label: "Full Name", value: customer.full_name },
          { label: "Phone", value: customer.phone },
          { label: "Account #", value: customer.account_number },
          { label: "Address", value: customer.address },
          { label: "ISP", value: customer.isps?.name },
          { label: "ISP Status", value: customer.isp_status },
          { label: "Product", value: customer.product },
          { label: "Term", value: customer.term },
          { label: "Order Date", value: customer.order_date },
          { label: "Install Date", value: customer.install_date },
          { label: "Install Complete", value: customer.install_complete },
          { label: "Sales Rep ID", value: customer.sales_rep_id },
          { label: "ISP Notes", value: customer.isp_notes },
        ];

  const statusFields = [
    { label: "Assigned Team", value: customer.assigned_team },
    {
      label: "Assigned User",
      value: customer.profiles?.full_name || "Unassigned",
    },
    { label: "Workflow Stage", value: customer.workflow_stage },
    { label: "Transfer Status", value: customer.transfer_status },
    { label: "Call Attempts", value: String(customer.call_attempt_number) },
    { label: "Recovery Status", value: customer.recovery_status },
    { label: "Outcome", value: customer.outcome },
    { label: "Alert Type", value: customer.alert_type },
    { label: "Alert Status", value: customer.alert_status },
    { label: "Price Approval", value: customer.price_approval_status },
    { label: "Last Contact", value: customer.last_contact_date },
    { label: "Follow-up Date", value: customer.follow_up_date },
  ];

  return (
    <>
      <Typography variant="h4" gutterBottom>
        {displayName === "—" ? "Customer Detail" : displayName}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Information
              </Typography>
              <Grid container spacing={2}>
                {infoFields.map((f) => (
                  <Grid item xs={12} sm={6} key={f.label}>
                    <Typography variant="caption" color="text.secondary">
                      {f.label}
                    </Typography>
                    <Typography variant="body2">{f.value || "—"}</Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Workflow Status
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                <Chip label={customer.workflow_stage} color="primary" />
                <Chip label={customer.assigned_team} variant="outlined" />
                {customer.alert_type !== "None" && (
                  <Chip label={customer.alert_type} color="error" size="small" />
                )}
              </Stack>
              <Grid container spacing={2}>
                {statusFields.map((f) => (
                  <Grid item xs={12} sm={6} key={f.label}>
                    <Typography variant="caption" color="text.secondary">
                      {f.label}
                    </Typography>
                    <Typography variant="body2">{f.value || "—"}</Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <CallHistoryTable callLogs={callLogs} />
          <Box sx={{ mt: 3 }}>
            <NotesSection customerId={customer.id} notes={notes} />
          </Box>
          <Box sx={{ mt: 3 }}>
            <ActivityTimeline activities={activities} />
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <CustomerDetailActions
            customer={customer}
            profile={profile}
            recoveryTeamMembers={recoveryTeamMembers}
            seniorAssistUsers={seniorAssistUsers}
          />
        </Grid>
      </Grid>
    </>
  );
}
