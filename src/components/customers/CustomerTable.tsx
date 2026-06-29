"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
  type GridRowSelectionModel,
} from "@mui/x-data-grid";
import {
  Box,
  TextField,
  MenuItem,
  Stack,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  InputAdornment,
  Tabs,
  Tab,
  Alert,
  Autocomplete,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import ClientNavLink from "@/components/common/ClientNavLink";
import {
  WORKFLOW_STAGES,
  TRANSFER_STATUSES,
  TEAMS,
  formatIspStatus,
  normalizeStageLabel,
  normalizeTeamLabel,
} from "@/lib/constants";
import { isRecycleReady } from "@/lib/workflow";
import {
  updateCustomer,
  deleteCustomers,
  assignLeadsToUser,
  distributeLeads,
} from "@/actions/customers";
import {
  getCustomerDisplayName,
  getCustomerSearchText,
  getCustomFieldValue,
} from "@/lib/customerFields";
import type { ISPColumn } from "@/lib/types";

interface CustomerRow {
  id: string;
  isp_id: string | null;
  custom_fields?: Record<string, string | null> | null;
  full_name: string | null;
  phone: string | null;
  account_number: string | null;
  address: string | null;
  isp_status: string | null;
  assigned_team: string;
  assigned_user_id: string | null;
  workflow_stage: string;
  transfer_status: string;
  alert_type: string;
  alert_status: string;
  outcome: string;
  call_attempt_number: number;
  follow_up_date?: string | null;
  isps?: { name: string } | null;
  profiles?: { full_name: string | null } | null;
}

interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  minWidth?: number;
}

function formatAssigneeLabel(row: CustomerRow): string | null {
  if (row.assigned_team === "Recycle Hold") {
    return null;
  }
  if (row.assigned_team === "Junior Sales Team") {
    return row.assigned_user_id
      ? row.profiles?.full_name || "Unknown"
      : "Available";
  }
  if (!row.assigned_user_id) return "Unassigned";
  return row.profiles?.full_name || "Unknown";
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  minWidth = 150,
}: FilterSelectProps) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? "All";

  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ minWidth }}
      InputLabelProps={{ shrink: true }}
      SelectProps={{
        displayEmpty: true,
        renderValue: () => selectedLabel,
      }}
    >
      {options.map((option) => (
        <MenuItem key={option.value || "__all__"} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

interface ISPOption {
  id: string;
  name: string;
  customer_count?: number;
  columns?: ISPColumn[];
}

function resolveIspId(
  candidate: string,
  isps: ISPOption[],
  fallback: string
): string {
  if (!candidate) return fallback;
  const normalized = candidate.trim().toLowerCase();
  const match = isps.find((isp) => isp.id.toLowerCase() === normalized);
  return match?.id ?? fallback;
}

interface Props {
  customers: CustomerRow[];
  isps: ISPOption[];
  ispColumns?: ISPColumn[];
  showTeamFilter?: boolean;
  defaultTeam?: string;
  allowBulkDelete?: boolean;
  showAssigneeFilter?: boolean;
  showAssigneeColumn?: boolean;
  allowAssign?: boolean;
  teamMembers?: { id: string; full_name: string | null }[];
  allowBulkAssign?: boolean;
  juniorMembers?: { id: string; full_name: string | null }[];
  currentUserId?: string;
  defaultIspId?: string;
  ispSelectorVariant?: "dropdown" | "tabs" | "searchable";
  syncUrlOnIspChange?: boolean;
  hideAllIspTab?: boolean;
  requireIspSelection?: boolean;
  showFollowUpColumn?: boolean;
  showReadyFilter?: boolean;
}

export default function CustomerTable({
  customers,
  isps,
  showTeamFilter = true,
  defaultTeam,
  allowBulkDelete = false,
  showAssigneeFilter = false,
  showAssigneeColumn = false,
  allowAssign = false,
  teamMembers = [],
  allowBulkAssign = false,
  juniorMembers = [],
  currentUserId,
  defaultIspId = "",
  ispColumns = [],
  ispSelectorVariant = "dropdown",
  syncUrlOnIspChange = false,
  hideAllIspTab = false,
  requireIspSelection = false,
  showFollowUpColumn = false,
  showReadyFilter = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [ispFilter, setIspFilter] = useState(defaultIspId);
  const [teamFilter, setTeamFilter] = useState(defaultTeam || "");
  const [stageFilter, setStageFilter] = useState("");
  const [transferFilter, setTransferFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [readyFilter, setReadyFilter] = useState("");
  const [rowSelectionModel, setRowSelectionModel] =
    useState<GridRowSelectionModel>([]);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<
    { id: string; full_name: string | null } | null
  >(null);
  const [assigning, setAssigning] = useState(false);
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [distributeTargets, setDistributeTargets] = useState<
    { id: string; full_name: string | null }[]
  >([]);
  const [distributePerUser, setDistributePerUser] = useState("500");
  const [distributeOnlyUnassigned, setDistributeOnlyUnassigned] = useState(true);
  const [distributing, setDistributing] = useState(false);

  const fallbackIspId = defaultIspId || isps[0]?.id || "";

  const handleIspChange = (ispId: string) => {
    const resolved = resolveIspId(ispId, isps, fallbackIspId);
    setIspFilter(resolved);
    if (!syncUrlOnIspChange) return;

    const params = new URLSearchParams(searchParams.toString());
    if (resolved) params.set("isp", resolved);
    else params.delete("isp");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  useEffect(() => {
    if (!syncUrlOnIspChange) return;
    const ispFromUrl = searchParams.get("isp") ?? "";
    const resolved = resolveIspId(ispFromUrl, isps, fallbackIspId);
    setIspFilter(resolved);
    if (ispFromUrl && resolved !== ispFromUrl && resolved) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("isp", resolved);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    } else if (!ispFromUrl && requireIspSelection && fallbackIspId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("isp", fallbackIspId);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [searchParams, syncUrlOnIspChange, requireIspSelection, isps, fallbackIspId, pathname, router]);

  useEffect(() => {
    if (syncUrlOnIspChange) return;
    if (fallbackIspId) {
      setIspFilter(resolveIspId(defaultIspId, isps, fallbackIspId));
    }
  }, [defaultIspId, syncUrlOnIspChange, fallbackIspId, isps]);

  const selectedIsp = isps.find((isp) => isp.id === ispFilter);
  const activeIspColumns =
    selectedIsp?.columns ?? ispColumns;

  const filtered = customers.filter((c) => {
    if (search) {
      const term = search.toLowerCase();
      const haystack = getCustomerSearchText(c.custom_fields, {
        full_name: c.full_name,
        phone: c.phone,
        account_number: c.account_number,
        address: c.address,
      });
      if (!haystack.includes(term)) return false;
    }
    if (
      ispFilter &&
      c.isp_id?.toLowerCase() !== ispFilter.toLowerCase()
    ) {
      return false;
    }
    if (
      showTeamFilter &&
      teamFilter &&
      c.assigned_team !== teamFilter
    ) {
      return false;
    }
    if (stageFilter && c.workflow_stage !== stageFilter) return false;
    if (transferFilter && c.transfer_status !== transferFilter) return false;
    if (assigneeFilter === "mine" && currentUserId) {
      if (c.assigned_user_id !== currentUserId) return false;
    } else if (assigneeFilter === "unassigned") {
      if (c.assigned_user_id) return false;
    } else if (assigneeFilter) {
      if (c.assigned_user_id !== assigneeFilter) return false;
    }
    if (readyFilter === "ready" && !isRecycleReady(c.follow_up_date)) return false;
    if (readyFilter === "waiting" && isRecycleReady(c.follow_up_date)) return false;
    return true;
  });

  const currentPageRowIds = useMemo(() => {
    const { page, pageSize } = paginationModel;
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize).map((row) => row.id);
  }, [filtered, paginationModel]);

  const handleRowSelectionModelChange = (newModel: GridRowSelectionModel) => {
    const bulkSelect = allowBulkDelete || allowBulkAssign;
    if (!bulkSelect) {
      setRowSelectionModel(newModel);
      return;
    }

    const newIds = [...newModel] as string[];
    const prevIds = [...rowSelectionModel] as string[];
    const allFilteredIds = filtered.map((row) => row.id);

    const selectedAllFiltered =
      allFilteredIds.length > 0 &&
      newIds.length === allFilteredIds.length &&
      allFilteredIds.every((id) => newIds.includes(id));

    if (
      selectedAllFiltered &&
      currentPageRowIds.length < allFilteredIds.length
    ) {
      const otherPages = prevIds.filter((id) => !currentPageRowIds.includes(id));
      setRowSelectionModel([...otherPages, ...currentPageRowIds]);
      return;
    }

    const hadAllOnPage =
      currentPageRowIds.length > 0 &&
      currentPageRowIds.every((id) => prevIds.includes(id));
    const clearedCurrentPage = !currentPageRowIds.some((id) => newIds.includes(id));

    if (hadAllOnPage && clearedCurrentPage && prevIds.length > newIds.length) {
      setRowSelectionModel(prevIds.filter((id) => !currentPageRowIds.includes(id)));
      return;
    }

    setRowSelectionModel(newModel);
  };

  const handleInlineUpdate = async (id: string, field: string, value: string) => {
    try {
      await updateCustomer(id, { [field]: value || null });
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update customer");
    }
  };

  const handleAssignSelected = async () => {
    if (!assignTarget) return;
    setAssigning(true);
    try {
      const result = await assignLeadsToUser(
        rowSelectionModel as string[],
        assignTarget.id
      );
      setAssignOpen(false);
      setAssignTarget(null);
      setRowSelectionModel([]);
      router.refresh();
      alert(
        `Delegated ${result.assigned} junior lead${
          result.assigned === 1 ? "" : "s"
        }.`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to assign leads");
    } finally {
      setAssigning(false);
    }
  };

  const handleDistribute = async () => {
    if (distributeTargets.length === 0) return;
    setDistributing(true);
    try {
      const parsed = parseInt(distributePerUser, 10);
      const result = await distributeLeads({
        ispId: ispFilter || undefined,
        userIds: distributeTargets.map((u) => u.id),
        perUser: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
        onlyUnassigned: distributeOnlyUnassigned,
      });
      setDistributeOpen(false);
      setDistributeTargets([]);
      router.refresh();
      alert(
        `Distributed ${result.assigned} lead${
          result.assigned === 1 ? "" : "s"
        }${result.leftover ? `, ${result.leftover} left over` : ""}.`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to distribute leads");
    } finally {
      setDistributing(false);
    }
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    try {
      await deleteCustomers(rowSelectionModel as string[]);
      setRowSelectionModel([]);
      setDeleteOpen(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete customers");
    } finally {
      setDeleting(false);
    }
  };

  const cellSelectWrapperSx = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    px: 0.5,
  } as const;

  const cellSelectFieldSx = {
    m: 0,
    width: "100%",
    "& .MuiInputBase-root": { fontSize: "0.8125rem" },
    "& .MuiSelect-select": { py: 0.75 },
  } as const;

  const isMasterCrm =
    (ispSelectorVariant === "tabs" || ispSelectorVariant === "searchable") &&
    requireIspSelection;
  const hasIspColumns = activeIspColumns.length > 0;
  const showTable = !isMasterCrm || hasIspColumns;

  const legacyDataColumns: GridColDef[] = [
    {
      field: "full_name",
      headerName: "Name",
      width: 180,
      minWidth: 160,
      valueGetter: (_v, row: CustomerRow) =>
        getCustomerDisplayName(row.custom_fields, activeIspColumns, row.full_name),
      renderCell: (params: GridRenderCellParams) => (
        <Box
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
          }}
        >
          <ClientNavLink href={`/customers/${params.row.id}`}>
            {params.value || "—"}
          </ClientNavLink>
        </Box>
      ),
    },
    { field: "phone", headerName: "Phone", width: 130, minWidth: 120 },
    {
      field: "account_number",
      headerName: "Account #",
      width: 120,
      minWidth: 110,
    },
    {
      field: "isp",
      headerName: "ISP",
      width: 110,
      minWidth: 100,
      valueGetter: (_v, row) => row.isps?.name || "—",
    },
    {
      field: "isp_status",
      headerName: "Status",
      width: 150,
      minWidth: 130,
      renderCell: (params) => (
        <Chip
          label={formatIspStatus(params.value as string | null)}
          size="small"
          variant="outlined"
          sx={{ maxWidth: "100%" }}
        />
      ),
    },
  ];

  const dynamicDataColumns: GridColDef[] = activeIspColumns.map((col) => ({
    field: `cf_${col.column_key}`,
    headerName: col.label,
    width: col.is_primary ? 180 : 150,
    minWidth: col.is_primary ? 160 : 120,
    valueGetter: (_v, row: CustomerRow) => {
      const fromCustom = getCustomFieldValue(row.custom_fields, col.column_key);
      if (fromCustom) return fromCustom;
      const legacy = row[col.column_key as keyof CustomerRow];
      return legacy ? String(legacy) : null;
    },
    renderCell: col.is_primary
      ? (params: GridRenderCellParams) => (
          <Box
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              width: "100%",
            }}
          >
            <ClientNavLink href={`/customers/${params.row.id}`}>
              {params.value || "—"}
            </ClientNavLink>
          </Box>
        )
      : col.column_key === "isp_status"
        ? (params) => (
            <Chip
              label={formatIspStatus(params.value as string | null)}
              size="small"
              variant="outlined"
              sx={{ maxWidth: "100%" }}
            />
          )
        : undefined,
  }));

  const workflowColumns: GridColDef[] = [
    ...(showAssigneeColumn
      ? [
          {
            field: "assigned_user_id",
            headerName: "Assigned To",
            width: 170,
            minWidth: 160,
            renderCell: (params: GridRenderCellParams) => {
              const label = formatAssigneeLabel(params.row as CustomerRow);
              if (
                allowAssign &&
                teamMembers.length > 0 &&
                params.row.assigned_team === "Senior Sales Team"
              ) {
                return (
                  <Box sx={cellSelectWrapperSx}>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={params.value || ""}
                      onChange={(e) =>
                        handleInlineUpdate(
                          params.row.id,
                          "assigned_user_id",
                          e.target.value
                        )
                      }
                      sx={cellSelectFieldSx}
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (selected) =>
                          selected
                            ? teamMembers.find((u) => u.id === selected)
                                ?.full_name || "Unknown"
                            : "Assign rep…",
                      }}
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {teamMembers.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.full_name || "Unknown"}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                );
              }
              if (
                allowBulkAssign &&
                juniorMembers.length > 0 &&
                params.row.assigned_team === "Junior Sales Team"
              ) {
                return (
                  <Box sx={cellSelectWrapperSx}>
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={params.value || ""}
                      onChange={(e) =>
                        handleInlineUpdate(
                          params.row.id,
                          "assigned_user_id",
                          e.target.value
                        )
                      }
                      sx={cellSelectFieldSx}
                      SelectProps={{
                        displayEmpty: true,
                        renderValue: (selected) =>
                          selected
                            ? juniorMembers.find((u) => u.id === selected)
                                ?.full_name || "Unknown"
                            : "Available",
                      }}
                    >
                      <MenuItem value="">Available</MenuItem>
                      {juniorMembers.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.full_name || "Unknown"}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>
                );
              }
              return label ?? "—";
            },
          } as GridColDef,
        ]
      : []),
    {
      field: "assigned_team",
      headerName: "Team",
      width: 195,
      minWidth: 185,
      renderCell: (params) => (
        <Chip
          label={normalizeTeamLabel(params.value)}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "workflow_stage",
      headerName: "Stage",
      width: 175,
      minWidth: 165,
      renderCell: (params) => (
        <Chip
          label={normalizeStageLabel(params.value)}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "call_attempt_number",
      headerName: "Attempts",
      width: 95,
      minWidth: 90,
      align: "center",
      headerAlign: "center",
    },
    ...(showFollowUpColumn
      ? [
          {
            field: "follow_up_date",
            headerName: "Recycle Date",
            width: 130,
            minWidth: 120,
            renderCell: (params: GridRenderCellParams) => {
              const date = params.value as string | null;
              if (!date) return "—";
              const ready = isRecycleReady(date);
              return (
                <Chip
                  label={date}
                  size="small"
                  color={ready ? "success" : "default"}
                  variant={ready ? "filled" : "outlined"}
                />
              );
            },
          } as GridColDef,
        ]
      : []),
    {
      field: "transfer_status",
      headerName: "Transfer",
      width: 200,
      minWidth: 180,
      renderCell: (params) =>
        params.value !== "None" ? (
          <Chip
            label={params.value}
            size="small"
            color="warning"
            sx={{ maxWidth: "100%" }}
          />
        ) : (
          "—"
        ),
    },
    {
      field: "alert_type",
      headerName: "Alert",
      width: 200,
      minWidth: 180,
      renderCell: (params) =>
        params.value !== "None" ? (
          <Chip
            label={params.value}
            size="small"
            color="error"
            sx={{ maxWidth: "100%" }}
          />
        ) : (
          "—"
        ),
    },
    {
      field: "outcome",
      headerName: "Outcome",
      width: 150,
      minWidth: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={params.value === "Pending" ? "default" : "success"}
          variant="outlined"
          sx={{ maxWidth: "100%" }}
        />
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 90,
      minWidth: 80,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <ClientNavLink href={`/customers/${params.row.id}`}>
          <Button size="small" component="span">
            View
          </Button>
        </ClientNavLink>
      ),
    },
  ];

  const dataColumns = isMasterCrm
    ? dynamicDataColumns
    : hasIspColumns
      ? dynamicDataColumns
      : legacyDataColumns;

  const columns: GridColDef[] = [...dataColumns, ...workflowColumns];

  const assigneeOptions: FilterOption[] = [
    { value: "", label: "All" },
    ...(currentUserId ? [{ value: "mine", label: "My leads" }] : []),
    { value: "unassigned", label: "Unassigned" },
    ...teamMembers.map((u) => ({
      value: u.id,
      label: u.full_name || "Unknown",
    })),
    ...(allowBulkAssign
      ? juniorMembers
          .filter((j) => !teamMembers.some((s) => s.id === j.id))
          .map((u) => ({
            value: u.id,
            label: u.full_name || "Unknown",
          }))
      : []),
  ];

  const unassignedJuniorCount = useMemo(() => {
    if (!allowBulkAssign) return 0;
    return customers.filter(
      (c) =>
        c.assigned_team === "Junior Sales Team" &&
        !c.assigned_user_id &&
        (!ispFilter || c.isp_id?.toLowerCase() === ispFilter.toLowerCase())
    ).length;
  }, [customers, allowBulkAssign, ispFilter]);

  const bulkSelectEnabled = allowBulkDelete || allowBulkAssign;

  const primaryColumnKey = hasIspColumns
    ? activeIspColumns.find((c) => c.is_primary)?.column_key ??
      activeIspColumns[0]?.column_key
    : "full_name";
  const stickyField =
    hasIspColumns && primaryColumnKey ? `cf_${primaryColumnKey}` : "full_name";
  const nameStickyLeft = bulkSelectEnabled ? 50 : 0;

  const ispTabIndex = Math.max(
    0,
    isps.findIndex((isp) => isp.id === ispFilter)
  );

  return (
    <Box>
      {ispSelectorVariant === "tabs" && (
        <Box sx={{ mb: 2 }}>
          {isps.length === 0 ? (
            <Alert severity="info">
              No ISPs yet. Add an ISP on the ISPs page, define its columns, then
              import customers.
            </Alert>
          ) : (
            <>
              <Tabs
                value={ispTabIndex}
                onChange={(_, index) => handleIspChange(isps[index]?.id ?? "")}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}
              >
                {isps.map((isp) => (
                  <Tab
                    key={isp.id}
                    label={`${isp.name} (${customers.filter((c) => c.isp_id === isp.id).length})`}
                  />
                ))}
              </Tabs>
              {selectedIsp && activeIspColumns.length === 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {selectedIsp.name} has no CRM columns yet. Go to the ISPs page,
                  click <strong>Columns</strong>, and add the fields for this
                  ISP&apos;s spreadsheet before importing customers.
                </Alert>
              )}
              {selectedIsp && activeIspColumns.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Showing {filtered.length} customer
                  {filtered.length === 1 ? "" : "s"} for {selectedIsp.name}
                </Typography>
              )}
            </>
          )}
        </Box>
      )}

      {ispSelectorVariant === "searchable" && (
        <Box sx={{ mb: 2 }}>
          {isps.length === 0 ? (
            <Alert severity="info">
              No ISPs yet. Add an ISP on the ISPs page, define its columns, then
              import customers.
            </Alert>
          ) : (
            <>
              <Autocomplete
                options={isps}
                value={selectedIsp ?? null}
                onChange={(_, newValue) =>
                  handleIspChange(newValue?.id ?? "")
                }
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, val) => option.id === val.id}
                openOnFocus
                sx={{ maxWidth: 360 }}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    {option.name} (
                    {customers.filter((c) => c.isp_id === option.id).length})
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select ISP"
                    size="small"
                    placeholder="Search ISP..."
                  />
                )}
              />
              {selectedIsp && activeIspColumns.length === 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {selectedIsp.name} has no CRM columns yet. Go to the ISPs page,
                  click <strong>Columns</strong>, and add the fields for this
                  ISP&apos;s spreadsheet before importing customers.
                </Alert>
              )}
              {selectedIsp && activeIspColumns.length > 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Showing {filtered.length} customer
                  {filtered.length === 1 ? "" : "s"} for {selectedIsp.name}
                </Typography>
              )}
            </>
          )}
        </Box>
      )}

      {showTable ? (
        <>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          placeholder="Search all fields..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        {ispSelectorVariant === "dropdown" && (
          <FilterSelect
            label="ISP"
            value={ispFilter}
            onChange={handleIspChange}
            options={[
              { value: "", label: "All" },
              ...isps.map((isp) => ({ value: isp.id, label: isp.name })),
            ]}
          />
        )}
        {showTeamFilter && !defaultTeam && (
          <FilterSelect
            label="Team"
            value={teamFilter}
            onChange={setTeamFilter}
            minWidth={170}
            options={[
              { value: "", label: "All" },
              ...TEAMS.map((t) => ({ value: t, label: t })),
            ]}
          />
        )}
        <FilterSelect
          label="Stage"
          value={stageFilter}
          onChange={setStageFilter}
          options={[
            { value: "", label: "All" },
            ...WORKFLOW_STAGES.map((s) => ({ value: s, label: s })),
          ]}
        />
        <FilterSelect
          label="Transfer Status"
          value={transferFilter}
          onChange={setTransferFilter}
          minWidth={180}
          options={[
            { value: "", label: "All" },
            ...TRANSFER_STATUSES.map((s) => ({ value: s, label: s })),
          ]}
        />
        {showAssigneeFilter && (
          <FilterSelect
            label="Assigned To"
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            minWidth={180}
            options={assigneeOptions}
          />
        )}
        {showReadyFilter && (
          <FilterSelect
            label="Recycle Status"
            value={readyFilter}
            onChange={setReadyFilter}
            minWidth={180}
            options={[
              { value: "", label: "All" },
              { value: "ready", label: "Ready (30+ days)" },
              { value: "waiting", label: "Still waiting" },
            ]}
          />
        )}
        {allowBulkDelete && rowSelectionModel.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => setDeleteOpen(true)}
            sx={{ alignSelf: "center" }}
          >
            Delete selected ({rowSelectionModel.length})
          </Button>
        )}
        {allowBulkAssign && rowSelectionModel.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<PersonAddAltIcon />}
            onClick={() => setAssignOpen(true)}
            sx={{ alignSelf: "center" }}
          >
            Delegate selected ({rowSelectionModel.length})
          </Button>
        )}
        {allowBulkAssign && juniorMembers.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<GroupAddIcon />}
            onClick={() => setDistributeOpen(true)}
            sx={{ alignSelf: "center" }}
          >
            Auto-distribute leads
          </Button>
        )}
      </Stack>

      <Box sx={{ width: "100%", height: 560 }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          rowHeight={52}
          pageSizeOptions={[25, 50, 100]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          checkboxSelection={bulkSelectEnabled}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={handleRowSelectionModelChange}
          disableRowSelectionOnClick
          disableVirtualization
          autoHeight={false}
          sx={{
            height: "100%",
            width: "100%",
            bgcolor: "#fff",
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "#fafafa",
            },
            "& .MuiDataGrid-row": {
              bgcolor: "#fff",
            },
            "& .MuiDataGrid-row:hover": {
              bgcolor: "#fff",
            },
            "& .MuiDataGrid-row.Mui-selected": {
              bgcolor: "#fff",
            },
            "& .MuiDataGrid-row.Mui-selected:hover": {
              bgcolor: "#fff",
            },
            "& .MuiDataGrid-cell": {
              display: "flex",
              alignItems: "center",
              py: 0,
              bgcolor: "#fff",
              borderColor: "divider",
            },
            "& .MuiDataGrid-cellContent": {
              display: "flex",
              alignItems: "center",
              width: "100%",
              height: "100%",
            },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
              outline: "none",
            },
            ...(bulkSelectEnabled && {
              '& .MuiDataGrid-columnHeader[data-field="__check__"]': {
                position: "sticky",
                left: 0,
                zIndex: 6,
                bgcolor: "#fafafa",
                borderRight: "1px solid",
                borderColor: "divider",
              },
              '& .MuiDataGrid-cell[data-field="__check__"]': {
                position: "sticky",
                left: 0,
                zIndex: 5,
                bgcolor: "#fff",
                borderRight: "1px solid",
                borderColor: "divider",
              },
            }),
            [`& .MuiDataGrid-columnHeader[data-field="${stickyField}"]`]: {
              position: "sticky",
              left: nameStickyLeft,
              zIndex: 6,
              bgcolor: "#fafafa",
              borderRight: "1px solid",
              borderColor: "divider",
            },
            [`& .MuiDataGrid-cell[data-field="${stickyField}"]`]: {
              position: "sticky",
              left: nameStickyLeft,
              zIndex: 4,
              bgcolor: "#fff",
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        />
      </Box>

      <Dialog open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)}>
        <DialogTitle>Delete customers</DialogTitle>
        <DialogContent>
          <Typography>
            Permanently delete {rowSelectionModel.length} selected customer
            {rowSelectionModel.length === 1 ? "" : "s"}? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSelected}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={assignOpen}
        onClose={() => !assigning && setAssignOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delegate leads to junior rep</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Assign {rowSelectionModel.length} selected lead
            {rowSelectionModel.length === 1 ? "" : "s"} to a junior sales rep.
            Only leads on the Junior Sales Team will be updated.
          </Typography>
          <Autocomplete
            options={juniorMembers}
            value={assignTarget}
            onChange={(_, value) => setAssignTarget(value)}
            getOptionLabel={(option) => option.full_name || "Unknown"}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params} label="Junior rep" size="small" />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAssignOpen(false);
              setAssignTarget(null);
            }}
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAssignSelected}
            disabled={assigning || !assignTarget}
          >
            {assigning ? "Assigning..." : "Delegate"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={distributeOpen}
        onClose={() => !distributing && setDistributeOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Auto-distribute junior leads</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Split unassigned Junior Sales Team leads
            {selectedIsp ? ` for ${selectedIsp.name}` : ""} across selected reps.
            {unassignedJuniorCount > 0
              ? ` ${unassignedJuniorCount} unassigned lead${
                  unassignedJuniorCount === 1 ? "" : "s"
                } available.`
              : " No unassigned leads match the current ISP."}
          </Typography>
          <Autocomplete
            multiple
            options={juniorMembers}
            value={distributeTargets}
            onChange={(_, value) => setDistributeTargets(value)}
            getOptionLabel={(option) => option.full_name || "Unknown"}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            sx={{ mb: 2 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Junior reps"
                size="small"
                placeholder="Select reps..."
              />
            )}
          />
          <TextField
            label="Leads per rep"
            size="small"
            fullWidth
            value={distributePerUser}
            onChange={(e) => setDistributePerUser(e.target.value)}
            helperText="Leave blank to split evenly across selected reps"
            sx={{ mb: 1 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={distributeOnlyUnassigned}
                onChange={(e) => setDistributeOnlyUnassigned(e.target.checked)}
              />
            }
            label="Only unassigned leads"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDistributeOpen(false);
              setDistributeTargets([]);
            }}
            disabled={distributing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDistribute}
            disabled={
              distributing ||
              distributeTargets.length === 0 ||
              unassignedJuniorCount === 0
            }
          >
            {distributing ? "Distributing..." : "Distribute"}
          </Button>
        </DialogActions>
      </Dialog>
        </>
      ) : null}
    </Box>
  );
}
