"use client";

import { useEffect, useState } from "react";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ClientNavLink from "@/components/common/ClientNavLink";
import {
  WORKFLOW_STAGES,
  TRANSFER_STATUSES,
  TEAMS,
  formatIspStatus,
} from "@/lib/constants";
import { updateCustomer, deleteCustomers } from "@/actions/customers";
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

interface Props {
  customers: CustomerRow[];
  isps: ISPOption[];
  ispColumns?: ISPColumn[];
  showTeamFilter?: boolean;
  defaultTeam?: string;
  editable?: boolean;
  allowBulkDelete?: boolean;
  showAssigneeFilter?: boolean;
  showAssigneeColumn?: boolean;
  allowAssign?: boolean;
  teamMembers?: { id: string; full_name: string | null }[];
  currentUserId?: string;
  defaultIspId?: string;
  ispSelectorVariant?: "dropdown" | "tabs";
  syncUrlOnIspChange?: boolean;
  hideAllIspTab?: boolean;
  requireIspSelection?: boolean;
}

export default function CustomerTable({
  customers,
  isps,
  showTeamFilter = true,
  defaultTeam,
  editable = false,
  allowBulkDelete = false,
  showAssigneeFilter = false,
  showAssigneeColumn = false,
  allowAssign = false,
  teamMembers = [],
  currentUserId,
  defaultIspId = "",
  ispColumns = [],
  ispSelectorVariant = "dropdown",
  syncUrlOnIspChange = false,
  hideAllIspTab = false,
  requireIspSelection = false,
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
  const [rowSelectionModel, setRowSelectionModel] =
    useState<GridRowSelectionModel>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleIspChange = (ispId: string) => {
    setIspFilter(ispId);
    if (!syncUrlOnIspChange) return;

    const params = new URLSearchParams(searchParams.toString());
    if (ispId) params.set("isp", ispId);
    else params.delete("isp");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  useEffect(() => {
    if (!syncUrlOnIspChange) return;
    const ispFromUrl = searchParams.get("isp") ?? "";
    if (ispFromUrl) {
      setIspFilter(ispFromUrl);
      return;
    }
    if (requireIspSelection && isps[0]) {
      handleIspChange(isps[0].id);
    }
  }, [searchParams, syncUrlOnIspChange, requireIspSelection, isps]);

  useEffect(() => {
    if (syncUrlOnIspChange) return;
    if (defaultIspId) {
      setIspFilter(defaultIspId);
    } else if (requireIspSelection && isps[0]) {
      setIspFilter(isps[0].id);
    }
  }, [defaultIspId, syncUrlOnIspChange, requireIspSelection, isps]);

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
    if (ispFilter && c.isp_id !== ispFilter) return false;
    if (teamFilter && c.assigned_team !== teamFilter) return false;
    if (stageFilter && c.workflow_stage !== stageFilter) return false;
    if (transferFilter && c.transfer_status !== transferFilter) return false;
    if (assigneeFilter === "mine" && currentUserId) {
      if (c.assigned_user_id !== currentUserId) return false;
    } else if (assigneeFilter === "unassigned") {
      if (c.assigned_user_id) return false;
    } else if (assigneeFilter) {
      if (c.assigned_user_id !== assigneeFilter) return false;
    }
    return true;
  });

  const handleInlineUpdate = async (id: string, field: string, value: string) => {
    await updateCustomer(id, { [field]: value || null });
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

  const renderInlineSelect = (
    params: GridRenderCellParams,
    field: string,
    options: readonly string[]
  ) => (
    <Box sx={cellSelectWrapperSx}>
      <TextField
        select
        size="small"
        fullWidth
        value={params.value ?? ""}
        onChange={(e) => handleInlineUpdate(params.row.id, field, e.target.value)}
        sx={cellSelectFieldSx}
      >
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );

  const isMasterCrm = ispSelectorVariant === "tabs" && requireIspSelection;
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
            renderCell: (params: GridRenderCellParams) =>
              allowAssign && teamMembers.length > 0 ? (
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
                  >
                    <MenuItem value="">Unassigned</MenuItem>
                    {teamMembers.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.full_name || "Unknown"}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              ) : (
                params.row.profiles?.full_name || "Unassigned"
              ),
          } as GridColDef,
        ]
      : []),
    {
      field: "assigned_team",
      headerName: "Team",
      width: 195,
      minWidth: 185,
      renderCell: editable
        ? (params) => renderInlineSelect(params, "assigned_team", TEAMS)
        : undefined,
    },
    {
      field: "workflow_stage",
      headerName: "Stage",
      width: 175,
      minWidth: 165,
      renderCell: (params) =>
        editable ? (
          renderInlineSelect(params, "workflow_stage", WORKFLOW_STAGES)
        ) : (
          <Chip label={params.value} size="small" variant="outlined" />
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
  ];

  const primaryColumnKey = hasIspColumns
    ? activeIspColumns.find((c) => c.is_primary)?.column_key ??
      activeIspColumns[0]?.column_key
    : "full_name";
  const stickyField =
    hasIspColumns && primaryColumnKey ? `cf_${primaryColumnKey}` : "full_name";
  const nameStickyLeft = allowBulkDelete ? 50 : 0;

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
                    label={`${isp.name} (${isp.customer_count ?? customers.filter((c) => c.isp_id === isp.id).length})`}
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
      </Stack>

      <Box sx={{ width: "100%", height: 560 }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          rowHeight={52}
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          checkboxSelection={allowBulkDelete}
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={setRowSelectionModel}
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
            ...(allowBulkDelete && {
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
        </>
      ) : null}
    </Box>
  );
}
