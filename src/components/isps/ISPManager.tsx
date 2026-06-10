"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Paper,
  Chip,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import TableChartIcon from "@mui/icons-material/TableChart";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { createISP, updateISP, deleteISP } from "@/actions/isps";
import ISPColumnManager from "./ISPColumnManager";
import type { ISPColumn } from "@/lib/types";

interface ISP {
  id: string;
  name: string;
  status: string;
  customer_count?: number;
  columns?: ISPColumn[];
}

export default function ISPManager({ isps: initial }: { isps: ISP[] }) {
  const [isps, setIsps] = useState(initial);
  const [columnsDialogIsp, setColumnsDialogIsp] = useState<ISP | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ISP | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Active");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ISP | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setStatus("Active");
    setDialogOpen(true);
  };

  const openEdit = (isp: ISP) => {
    setEditing(isp);
    setName(isp.name);
    setStatus(isp.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (editing) {
        const updated = await updateISP(editing.id, { name, status });
        setIsps((prev) =>
          prev.map((i) =>
            i.id === editing.id
              ? { ...i, ...updated, customer_count: i.customer_count }
              : i
          )
        );
      } else {
        const created = await createISP(name);
        setIsps((prev) => [...prev, { ...created, customer_count: 0 }]);
      }
      setDialogOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const openDelete = (isp: ISP) => {
    setDeleteError(null);
    setDeleteTarget(isp);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteISP(deleteTarget.id);
      if ("error" in result) {
        setDeleteError(result.error);
        return;
      }
      setIsps((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete ISP"
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Each ISP gets its own customer table in Master CRM. Create an ISP here,
        then import customers for that ISP on the Import page.
      </Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={openCreate}
        sx={{ mb: 2 }}
      >
        Add ISP
      </Button>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Customers</TableCell>
              <TableCell>Columns</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No ISPs yet. Add one to create your first CRM table.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              isps.map((isp) => (
                <TableRow key={isp.id}>
                  <TableCell>{isp.name}</TableCell>
                  <TableCell>{isp.status}</TableCell>
                  <TableCell>
                    <Chip
                      label={isp.customer_count ?? 0}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={isp.columns?.length ?? 0}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      startIcon={<ViewColumnIcon />}
                      onClick={() => setColumnsDialogIsp(isp)}
                      sx={{ mr: 1 }}
                    >
                      Columns
                    </Button>
                    <Button
                      component={Link}
                      href={`/customers?isp=${isp.id}`}
                      size="small"
                      startIcon={<TableChartIcon />}
                      sx={{ mr: 1 }}
                    >
                      View CRM
                    </Button>
                    <IconButton size="small" onClick={() => openEdit(isp)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => openDelete(isp)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={!!columnsDialogIsp}
        onClose={() => setColumnsDialogIsp(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          CRM Columns — {columnsDialogIsp?.name}
        </DialogTitle>
        <DialogContent>
          {columnsDialogIsp && (
            <ISPColumnManager
              ispId={columnsDialogIsp.id}
              ispName={columnsDialogIsp.name}
              columns={columnsDialogIsp.columns ?? []}
              onChange={(columns) => {
                setIsps((prev) =>
                  prev.map((isp) =>
                    isp.id === columnsDialogIsp.id ? { ...isp, columns } : isp
                  )
                );
                setColumnsDialogIsp((prev) =>
                  prev ? { ...prev, columns } : prev
                );
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColumnsDialogIsp(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
      >
        <DialogTitle>Delete ISP — {deleteTarget?.name}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            You are about to permanently remove this ISP from the CRM. Please
            review what will be deleted:
          </Typography>

          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>

          <List dense disablePadding>
            <ListItem disableGutters>
              <ListItemText primary="The ISP record and its CRM column setup" />
            </ListItem>
            <ListItem disableGutters>
              <ListItemText primary="Import history for this ISP" />
            </ListItem>
            {deleteTarget?.customer_count && deleteTarget.customer_count > 0 ? (
              <>
                <ListItem disableGutters>
                  <ListItemText
                    primary={`${deleteTarget.customer_count} customer record${deleteTarget.customer_count === 1 ? "" : "s"} tied to this ISP`}
                    secondary="All customer data for this ISP will be removed from Master CRM, Junior/Senior Sales, and Recycle views."
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText
                    primary="Related call logs, notes, and activity history"
                    secondary="Deleted with those customers."
                  />
                </ListItem>
              </>
            ) : (
              <ListItem disableGutters>
                <ListItemText primary="No customers are currently linked to this ISP" />
              </ListItem>
            )}
          </List>

          {deleteTarget?.customer_count && deleteTarget.customer_count > 0 && (
            <Alert severity="error" sx={{ mt: 1 }}>
              Deleting <strong>{deleteTarget.name}</strong> will permanently
              erase {deleteTarget.customer_count} customer
              {deleteTarget.customer_count === 1 ? "" : "s"} and everything
              associated with them.
            </Alert>
          )}

          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete ISP"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>{editing ? "Edit ISP" : "Add ISP"}</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            sx={{ mt: 1, mb: 2 }}
            placeholder="e.g. Comcast, Spectrum"
          />
          {editing && (
            <TextField
              select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              fullWidth
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
