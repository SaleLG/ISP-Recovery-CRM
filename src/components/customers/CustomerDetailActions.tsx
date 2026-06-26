"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Stack,
  Divider,
  Alert,
} from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";
import SmsIcon from "@mui/icons-material/Sms";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import {
  canEditSeniorAssignment,
  canLogCall,
  canUseSeniorSalesActions,
  canUseRecycleHoldActions,
  isManager,
} from "@/lib/customerPermissions";
import {
  getInteractionLabel,
  getInteractionResults,
  usesJuniorTextOnly,
  canRecycleToJunior,
} from "@/lib/workflow";
import { normalizeRole, JUNIOR_TEXT_COOLDOWN_MINUTES } from "@/lib/constants";
import {
  updateCustomer,
  addNote,
  quickRescheduleInstall,
  markTextAttempt,
} from "@/actions/customers";
import CallLogDialog from "./CallLogDialog";
import RecycleToJuniorButton from "./RecycleToJuniorButton";
import type { Customer, Profile } from "@/lib/types";

interface Props {
  customer: Customer;
  profile: Profile;
  seniorTeamMembers?: Pick<Profile, "id" | "full_name">[];
  lastAttemptAt?: string | null;
}

export default function CustomerDetailActions({
  customer,
  profile,
  seniorTeamMembers = [],
  lastAttemptAt = null,
}: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(
    customer.follow_up_date || ""
  );
  const [quickLoading, setQuickLoading] = useState(false);
  const [attemptLoading, setAttemptLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const manager = isManager(profile);
  const needsSeniorAssignment =
    manager &&
    customer.assigned_team === "Senior Sales Team" &&
    !customer.assigned_user_id;
  const showSeniorAssign =
    canEditSeniorAssignment(customer, profile) &&
    seniorTeamMembers.length > 0;
  const showLogCall = canLogCall(customer, profile);
  const showSeniorActions = canUseSeniorSalesActions(customer, profile);
  const showRecycleHoldActions = canUseRecycleHoldActions(customer, profile);
  const showRecycleToJunior =
    showRecycleHoldActions && canRecycleToJunior(customer);
  const isJuniorText = usesJuniorTextOnly(customer.assigned_team, profile.role);
  const interactionMode = getInteractionLabel(customer.assigned_team, profile.role);
  const interactionResults = getInteractionResults(
    customer.assigned_team,
    profile.role
  );

  const isJunior = normalizeRole(profile.role) === "junior_sales";
  const showTextAttempt =
    isJunior && customer.assigned_team === "Junior Sales Team";
  const nextAllowedMs = lastAttemptAt
    ? new Date(lastAttemptAt).getTime() + JUNIOR_TEXT_COOLDOWN_MINUTES * 60 * 1000
    : 0;
  const cooldownRemainingMin =
    nextAllowedMs > now ? Math.ceil((nextAllowedMs - now) / 60000) : 0;
  const textAttemptLocked = cooldownRemainingMin > 0;

  const showActionButtons =
    showLogCall || showSeniorActions || showRecycleToJunior;

  const handleMarkTextAttempt = async () => {
    setAttemptLoading(true);
    try {
      const result = await markTextAttempt(customer.id);
      if (result && "error" in result && result.error) {
        alert(result.error);
        return;
      }
      if (result && "redirectTo" in result && result.redirectTo) {
        router.push(result.redirectTo);
      }
      router.refresh();
    } finally {
      setAttemptLoading(false);
    }
  };

  const handleUpdate = async (field: string, value: string) => {
    try {
      await updateCustomer(customer.id, { [field]: value || null });
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update customer");
    }
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    await addNote(customer.id, note);
    setNote("");
  };

  const handleQuickReschedule = async () => {
    setQuickLoading(true);
    try {
      const result = await quickRescheduleInstall(
        customer.id,
        "Install appointment rescheduled",
        followUpDate || undefined
      );
      if (result && "redirectTo" in result && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      }
    } finally {
      setQuickLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Actions
        </Typography>

        <Stack spacing={2}>
          {needsSeniorAssignment && (
            <Alert severity="warning">
              This lead is in <strong>Senior Review</strong> and needs a senior
              sales rep assigned below.
            </Alert>
          )}

          {showSeniorAssign && (
            <TextField
              select
              label="Assigned Senior Sales Rep"
              value={customer.assigned_user_id || ""}
              onChange={(e) => handleUpdate("assigned_user_id", e.target.value)}
              size="small"
              fullWidth
              helperText="Assign the senior rep who will call this customer"
            >
              <MenuItem value="">Unassigned</MenuItem>
              {seniorTeamMembers.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.full_name || "Unknown"}
                </MenuItem>
              ))}
            </TextField>
          )}

          {manager &&
            customer.assigned_team === "Senior Sales Team" &&
            seniorTeamMembers.length === 0 && (
              <Alert severity="info">
                Add active senior sales users on the Users page before assigning
                leads.
              </Alert>
            )}

          {showSeniorAssign && (showActionButtons || showRecycleHoldActions) && (
            <Divider />
          )}

          {showSeniorActions && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Follow up on callback or reschedule request and close the lead
              when resolved.
            </Alert>
          )}

          {showTextAttempt && (
            <>
              <Button
                variant="contained"
                startIcon={<SmsIcon />}
                onClick={handleMarkTextAttempt}
                disabled={attemptLoading || textAttemptLocked}
                fullWidth
              >
                {attemptLoading
                  ? "Logging…"
                  : textAttemptLocked
                    ? `Wait ${cooldownRemainingMin} min to text again`
                    : "Mark Text Attempt"}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {customer.assigned_user_id
                  ? "Logs one outbound text attempt on your lead."
                  : "Logs one outbound text attempt and claims this lead as yours."}
              </Typography>
            </>
          )}

          {showLogCall && (
            <Button
              variant={showTextAttempt ? "outlined" : "contained"}
              startIcon={isJuniorText ? <SmsIcon /> : <PhoneIcon />}
              onClick={() => setCallDialogOpen(true)}
              fullWidth
            >
              {isJuniorText
                ? showTextAttempt
                  ? "Log Text Result"
                  : "Log Text"
                : "Log Call"}
            </Button>
          )}

          {showSeniorActions && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<EventRepeatIcon />}
                onClick={() => setRescheduleDialogOpen(true)}
                fullWidth
              >
                Reschedule Install
              </Button>
              <Button
                variant="outlined"
                onClick={handleQuickReschedule}
                disabled={quickLoading}
                fullWidth
              >
                {quickLoading ? "Saving..." : "Quick log: Rescheduled"}
              </Button>
            </>
          )}

          {showRecycleToJunior && (
            <RecycleToJuniorButton
              customerId={customer.id}
              customerName={customer.full_name || "Customer"}
            />
          )}

          {showRecycleHoldActions && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              No Reply basket — follow-up date:{" "}
              {customer.follow_up_date || "not set"}. Send back to Junior Sales
              when ready to recycle.
            </Alert>
          )}

          {showLogCall && (showActionButtons || showSeniorAssign) && (
            <Divider />
          )}

          {showLogCall && (
            <>
              <TextField
                label="Follow-up Date"
                type="date"
                value={followUpDate}
                onChange={(e) => {
                  setFollowUpDate(e.target.value);
                  handleUpdate("follow_up_date", e.target.value);
                }}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Add Note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                multiline
                rows={3}
                size="small"
                fullWidth
              />
              <Button
                variant="outlined"
                onClick={handleAddNote}
                disabled={!note.trim()}
              >
                Save Note
              </Button>
            </>
          )}
        </Stack>
      </CardContent>

      {showLogCall && (
        <>
          <CallLogDialog
            open={callDialogOpen}
            onClose={() => setCallDialogOpen(false)}
            customerId={customer.id}
            customerName={customer.full_name || "Customer"}
            currentAttempts={customer.call_attempt_number}
            interactionMode={interactionMode}
            resultOptions={interactionResults}
            emphasizeReschedule={showSeniorActions}
          />
          <CallLogDialog
            open={rescheduleDialogOpen}
            onClose={() => setRescheduleDialogOpen(false)}
            customerId={customer.id}
            customerName={customer.full_name || "Customer"}
            currentAttempts={customer.call_attempt_number}
            interactionMode={interactionMode}
            resultOptions={interactionResults}
            emphasizeReschedule
            defaultCallResult="Rescheduled"
          />
        </>
      )}
    </Card>
  );
}
