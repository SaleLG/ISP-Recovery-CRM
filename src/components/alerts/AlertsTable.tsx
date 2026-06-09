"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DataGrid,
  type GridColDef,
  type GridRenderCellParams,
} from "@mui/x-data-grid";
import {
  Box,
  Button,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Tabs,
  Tab,
  Alert,
  TextField,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClientNavLink from "@/components/common/ClientNavLink";
import { updateAlert } from "@/actions/customers";
import {
  getCustomerDisplayName,
  getCustomerSearchText,
  getCustomFieldValue,
} from "@/lib/customerFields";
import { formatIspStatus } from "@/lib/constants";
import type { ISPColumn } from "@/lib/types";

interface AlertRow {
  id: string;
  isp_id: string | null;
  custom_fields?: Record<string, string | null> | null;
  full_name: string | null;
  phone: string | null;
  alert_type: string;
  alert_status: string;
  price_approval_status: string;
  assigned_team: string;
  workflow_stage: string;
  isps?: { name: string } | null;
}

interface ISPOption {
  id: string;
  name: string;
  columns?: ISPColumn[];
}

interface Props {
  alerts: AlertRow[];
  isps: ISPOption[];
  ispColumns?: ISPColumn[];
  defaultIspId?: string;
}

const gridCellSx = {
  height: "100%",
  width: "100%",
  display: "flex",
  alignItems: "center",
} as const;

const dataGridSx = {
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
} as const;

export default function AlertsTable({
  alerts,
  isps,
  ispColumns = [],
  defaultIspId = "",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ispFilter, setIspFilter] = useState(defaultIspId);
  const [search, setSearch] = useState("");
  const [approveDialog, setApproveDialog] = useState<{
    id: string;
    name: string;
    action: "approve" | "deny";
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleIspChange = (ispId: string) => {
    setIspFilter(ispId);
    const params = new URLSearchParams(searchParams.toString());
    if (ispId) params.set("isp", ispId);
    else params.delete("isp");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  useEffect(() => {
    const ispFromUrl = searchParams.get("isp") ?? "";
    if (ispFromUrl) {
      setIspFilter(ispFromUrl);
      return;
    }
    if (isps[0]) {
      handleIspChange(isps[0].id);
    }
  }, [searchParams, isps]);

  useEffect(() => {
    if (defaultIspId) setIspFilter(defaultIspId);
  }, [defaultIspId]);

  const selectedIsp = isps.find((isp) => isp.id === ispFilter);
  const activeIspColumns = selectedIsp?.columns ?? ispColumns;
  const hasIspColumns = activeIspColumns.length > 0;
  const showTable = hasIspColumns;

  const filtered = alerts.filter((row) => {
    if (ispFilter && row.isp_id !== ispFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      const haystack = getCustomerSearchText(row.custom_fields, {
        full_name: row.full_name,
        phone: row.phone,
      });
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  const handleAlertStatus = async (id: string, status: string) => {
    setLoading(true);
    try {
      await updateAlert(id, status);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handlePriceApproval = async (
    id: string,
    action: "approve" | "deny"
  ) => {
    setLoading(true);
    try {
      await updateAlert(
        id,
        "In Review",
        action === "approve" ? "Approved" : "Denied"
      );
      setApproveDialog(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const renderAlertActions = (row: AlertRow) => {
    const isPriceApproval = row.alert_type === "Price Approval Needed";
    const isIspComplaint = row.alert_type === "ISP Complaint Needs Fix";
    const customerName = getCustomerDisplayName(
      row.custom_fields,
      activeIspColumns,
      row.full_name
    );

    if (row.alert_status === "Resolved") {
      return (
        <Typography variant="body2" color="text.secondary">
          Completed
        </Typography>
      );
    }

    if (!isPriceApproval && !isIspComplaint) {
      return (
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      );
    }

    if (row.alert_status === "Needs Email") {
      return (
        <Button
          size="small"
          variant="outlined"
          onClick={() => handleAlertStatus(row.id, "Email Sent")}
          disabled={loading}
        >
          Email Sent
        </Button>
      );
    }

    if (row.alert_status === "Email Sent") {
      return (
        <Button
          size="small"
          variant="outlined"
          onClick={() => handleAlertStatus(row.id, "In Review")}
          disabled={loading}
        >
          In Review
        </Button>
      );
    }

    // In Review
    if (isPriceApproval && row.price_approval_status === "Pending") {
      return (
        <Stack direction="row" spacing={1} sx={{ flexWrap: "nowrap" }}>
          <Button
            size="small"
            variant="contained"
            color="success"
            onClick={() =>
              setApproveDialog({
                id: row.id,
                name: customerName,
                action: "approve",
              })
            }
            disabled={loading}
          >
            Approve
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() =>
              setApproveDialog({
                id: row.id,
                name: customerName,
                action: "deny",
              })
            }
            disabled={loading}
          >
            Deny
          </Button>
        </Stack>
      );
    }

    return (
      <Button
        size="small"
        variant="outlined"
        color="success"
        onClick={() => handleAlertStatus(row.id, "Resolved")}
        disabled={loading}
      >
        Resolved
      </Button>
    );
  };

  const dynamicDataColumns: GridColDef[] = activeIspColumns.map((col) => ({
    field: `cf_${col.column_key}`,
    headerName: col.label,
    width: col.is_primary ? 180 : 150,
    minWidth: col.is_primary ? 160 : 120,
    valueGetter: (_v, row: AlertRow) => {
      const fromCustom = getCustomFieldValue(row.custom_fields, col.column_key);
      if (fromCustom) return fromCustom;
      const legacy = row[col.column_key as keyof AlertRow];
      return legacy ? String(legacy) : null;
    },
    renderCell: col.is_primary
      ? (params: GridRenderCellParams) => (
          <Box sx={gridCellSx}>
            <ClientNavLink href={`/customers/${params.row.id}`}>
              {params.value || "—"}
            </ClientNavLink>
          </Box>
        )
      : col.column_key === "isp_status"
        ? (params) => (
            <Box sx={gridCellSx}>
              <Chip
                label={formatIspStatus(params.value as string | null)}
                size="small"
                variant="outlined"
                sx={{ maxWidth: "100%" }}
              />
            </Box>
          )
        : (params) => (
            <Box sx={gridCellSx}>
              <Typography variant="body2" noWrap>
                {params.value || "—"}
              </Typography>
            </Box>
          ),
  }));

  const alertColumns: GridColDef[] = [
    {
      field: "alert_type",
      headerName: "Alert Type",
      width: 200,
      minWidth: 180,
      renderCell: (params) => (
        <Box sx={gridCellSx}>
          <Chip label={params.value} size="small" color="error" />
        </Box>
      ),
    },
    {
      field: "alert_status",
      headerName: "Alert Status",
      width: 140,
      minWidth: 130,
      renderCell: (params) => (
        <Box sx={gridCellSx}>
          <Chip
            label={params.value}
            size="small"
            color={params.value === "Needs Email" ? "warning" : "default"}
          />
        </Box>
      ),
    },
    {
      field: "price_approval_status",
      headerName: "Price Approval",
      width: 140,
      minWidth: 130,
      renderCell: (params) => (
        <Box sx={gridCellSx}>
          <Typography variant="body2">
            {params.row.alert_type === "Price Approval Needed"
              ? params.value || "—"
              : "—"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 260,
      minWidth: 220,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Box sx={gridCellSx}>{renderAlertActions(params.row as AlertRow)}</Box>
      ),
    },
  ];

  const columns: GridColDef[] = [...dynamicDataColumns, ...alertColumns];

  const primaryColumnKey =
    activeIspColumns.find((c) => c.is_primary)?.column_key ??
    activeIspColumns[0]?.column_key;
  const stickyField =
    hasIspColumns && primaryColumnKey ? `cf_${primaryColumnKey}` : undefined;

  const ispTabIndex = Math.max(
    0,
    isps.findIndex((isp) => isp.id === ispFilter)
  );

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
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
              label={`${isp.name} (${alerts.filter((a) => a.isp_id === isp.id).length})`}
            />
          ))}
        </Tabs>
        {selectedIsp && activeIspColumns.length === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {selectedIsp.name} has no CRM columns yet. Go to the ISPs page,
            click <strong>Columns</strong>, and add fields for this ISP.
          </Alert>
        )}
        {selectedIsp && activeIspColumns.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            Showing {filtered.length} alert{filtered.length === 1 ? "" : "s"} for{" "}
            {selectedIsp.name}
          </Typography>
        )}
      </Box>

      {showTable ? (
        <>
          <TextField
            size="small"
            placeholder="Search all fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 280, mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ width: "100%", height: 560 }}>
            <DataGrid
              rows={filtered}
              columns={columns}
              rowHeight={52}
              pageSizeOptions={[25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              disableRowSelectionOnClick
              disableVirtualization
              autoHeight={false}
              sx={{
                ...dataGridSx,
                ...(stickyField && {
                  [`& .MuiDataGrid-columnHeader[data-field="${stickyField}"]`]: {
                    position: "sticky",
                    left: 0,
                    zIndex: 6,
                    bgcolor: "#fafafa",
                    borderRight: "1px solid",
                    borderColor: "divider",
                  },
                  [`& .MuiDataGrid-cell[data-field="${stickyField}"]`]: {
                    position: "sticky",
                    left: 0,
                    zIndex: 4,
                    bgcolor: "#fff",
                    borderRight: "1px solid",
                    borderColor: "divider",
                  },
                }),
              }}
            />
          </Box>
        </>
      ) : null}

      <Dialog open={!!approveDialog} onClose={() => setApproveDialog(null)}>
        <DialogTitle>
          {approveDialog?.action === "approve" ? "Approve" : "Deny"} Price
          Request
        </DialogTitle>
        <DialogContent>
          <Typography>
            {approveDialog?.action === "approve" ? "Approve" : "Deny"} the
            better-price request for <strong>{approveDialog?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={approveDialog?.action === "approve" ? "success" : "error"}
            onClick={() =>
              approveDialog &&
              handlePriceApproval(approveDialog.id, approveDialog.action)
            }
            disabled={loading}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
