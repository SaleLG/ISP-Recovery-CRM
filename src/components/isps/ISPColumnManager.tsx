"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  FormControlLabel,
  Checkbox,
  Typography,
  Chip,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import {
  createISPColumns,
  updateISPColumn,
  deleteISPColumn,
  reorderISPColumns,
  getISPColumns,
} from "@/actions/ispColumns";
import type { ISPColumn } from "@/lib/types";

function sortColumns(cols: ISPColumn[]) {
  return [...cols].sort((a, b) => a.sort_order - b.sort_order);
}

interface DraftColumn {
  id: string;
  label: string;
  isPrimary: boolean;
  usedForMatching: boolean;
}

function newDraftRow(isPrimary = false): DraftColumn {
  return {
    id: crypto.randomUUID(),
    label: "",
    isPrimary,
    usedForMatching: false,
  };
}

interface Props {
  ispId: string;
  ispName: string;
  columns: ISPColumn[];
  onChange: (columns: ISPColumn[]) => void;
}

export default function ISPColumnManager({
  ispId,
  ispName,
  columns: initialColumns,
  onChange,
}: Props) {
  const [columns, setColumns] = useState(() => sortColumns(initialColumns));
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ISPColumn | null>(null);
  const [draftRows, setDraftRows] = useState<DraftColumn[]>([newDraftRow()]);
  const [label, setLabel] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [usedForMatching, setUsedForMatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setColumns(sortColumns(initialColumns));
  }, [initialColumns]);

  const refreshColumns = async () => {
    const refreshed = sortColumns(await getISPColumns(ispId));
    setColumns(refreshed);
    onChange(refreshed);
    return refreshed;
  };

  useEffect(() => {
    if (!editDialogOpen) return;
    const timer = window.setTimeout(() => labelInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [editDialogOpen]);

  const openAdd = () => {
    const hasExistingPrimary = columns.some((c) => c.is_primary);
    setDraftRows([newDraftRow(columns.length === 0 && !hasExistingPrimary)]);
    setAddError(null);
    setAddDialogOpen(true);
  };

  const openEdit = (column: ISPColumn) => {
    setEditing(column);
    setLabel(column.label);
    setIsPrimary(column.is_primary);
    setUsedForMatching(column.used_for_matching);
    setEditDialogOpen(true);
  };

  const updateDraftRow = (id: string, patch: Partial<DraftColumn>) => {
    setDraftRows((rows) =>
      rows.map((row) => {
        if (row.id !== id) {
          if (patch.isPrimary) return { ...row, isPrimary: false };
          return row;
        }
        return { ...row, ...patch };
      })
    );
    setAddError(null);
  };

  const addDraftRow = () => {
    setDraftRows((rows) => [...rows, newDraftRow()]);
  };

  const removeDraftRow = (id: string) => {
    setDraftRows((rows) => {
      if (rows.length <= 1) return [newDraftRow(columns.length === 0)];
      return rows.filter((row) => row.id !== id);
    });
  };

  const readyDraftRows = draftRows.filter((row) => row.label.trim().length > 0);

  const handleSaveDrafts = async () => {
    if (readyDraftRows.length === 0) return;
    setLoading(true);
    setAddError(null);
    try {
      const result = await createISPColumns({
        ispId,
        items: readyDraftRows.map((row) => ({
          label: row.label,
          is_primary: row.isPrimary,
          used_for_matching: row.usedForMatching,
        })),
      });
      const refreshed = sortColumns(result.columns);
      setColumns(refreshed);
      onChange(refreshed);

      if (result.added === 0) {
        setAddError("No new columns were added — those names already exist.");
        return;
      }

      setAddDialogOpen(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add columns");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editing || !label.trim()) return;
    setLoading(true);
    try {
      await updateISPColumn(editing.id, {
        label,
        is_primary: isPrimary,
        used_for_matching: usedForMatching,
      });
      await refreshColumns();
      setEditDialogOpen(false);
      setEditing(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save column");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Remove this column from the CRM table? Existing customer data for this field is kept in records."
      )
    )
      return;
    try {
      const result = await deleteISPColumn(id);
      const refreshed = sortColumns(result.columns ?? (await getISPColumns(ispId)));
      setColumns(refreshed);
      onChange(refreshed);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete column");
    }
  };

  const moveColumn = async (columnId: string, direction: -1 | 1) => {
    const sorted = sortColumns(columns);
    const index = sorted.findIndex((c) => c.id === columnId);
    if (index < 0) return;

    const column = sorted[index];
    if (column.is_primary) return;

    const target = index + direction;
    if (target <= 0 || target >= sorted.length) return;

    const reordered = [...sorted];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);

    setMovingId(column.id);
    try {
      const normalized = await reorderISPColumns(
        ispId,
        reordered.map((c) => c.id)
      );
      const refreshed = sortColumns(normalized);
      setColumns(refreshed);
      onChange(refreshed);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reorder columns");
      await refreshColumns();
    } finally {
      setMovingId(null);
    }
  };

  const sortedColumns = sortColumns(columns);

  const firstMatchIndex = sortedColumns.findIndex(
    (c) => c.used_for_matching && !c.is_primary
  );
  const lastMatchIndex =
    firstMatchIndex === -1
      ? -1
      : sortedColumns.reduce(
          (last, c, i) =>
            c.used_for_matching && !c.is_primary ? i : last,
          firstMatchIndex
        );

  const canMoveUp = (column: ISPColumn, index: number) => {
    if (movingId !== null || column.is_primary || index === 0) return false;
    if (column.used_for_matching && !column.is_primary) {
      return index > firstMatchIndex;
    }
    if (firstMatchIndex >= 0 && index <= lastMatchIndex) return false;
    return true;
  };

  const canMoveDown = (column: ISPColumn, index: number) => {
    if (movingId !== null || column.is_primary || index === sortedColumns.length - 1) {
      return false;
    }
    if (column.used_for_matching && !column.is_primary) {
      return index < lastMatchIndex;
    }
    const next = sortedColumns[index + 1];
    if (next?.used_for_matching && !next.is_primary) return false;
    return true;
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Define the columns for <strong>{ispName}</strong>&apos;s CRM table. Add,
        edit, or remove columns to match this ISP&apos;s spreadsheet layout.
      </Typography>

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={openAdd}
        sx={{ mb: 2 }}
      >
        Add Columns
      </Button>

      {columns.length === 0 ? (
        <Typography color="text.secondary">
          No columns yet. Add columns before importing customers for this ISP.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Column Name</TableCell>
              <TableCell>Key</TableCell>
              <TableCell>Flags</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedColumns.map((column, index) => (
              <TableRow key={column.id}>
                <TableCell>{column.label}</TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {column.column_key}
                  </Typography>
                </TableCell>
                <TableCell>
                  {column.is_primary && (
                    <Chip
                      label="Primary"
                      size="small"
                      color="primary"
                      sx={{ mr: 0.5 }}
                    />
                  )}
                  {column.used_for_matching && (
                    <Chip label="Match key" size="small" variant="outlined" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    disabled={!canMoveUp(column, index)}
                    onClick={() => moveColumn(column.id, -1)}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={!canMoveDown(column, index)}
                    onClick={() => moveColumn(column.id, 1)}
                  >
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => openEdit(column)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(column.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={addDialogOpen}
        onClose={() => !loading && setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Columns</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter each column on its own row. Use <strong>Primary</strong> for the
            customer name column and <strong>Match key</strong> for fields used
            to detect duplicate rows on import.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {draftRows.map((row, index) => (
              <Box
                key={row.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: { xs: "wrap", sm: "nowrap" },
                }}
              >
                <TextField
                  autoFocus={index === 0}
                  label="Column name"
                  value={row.label}
                  onChange={(e) =>
                    updateDraftRow(row.id, { label: e.target.value })
                  }
                  placeholder="e.g. Phone, ACCT#"
                  size="small"
                  sx={{ flex: 1, minWidth: 160 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (index === draftRows.length - 1) addDraftRow();
                    }
                  }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={row.isPrimary}
                      onChange={(e) =>
                        updateDraftRow(row.id, { isPrimary: e.target.checked })
                      }
                    />
                  }
                  label="Primary"
                  sx={{ mr: 0, whiteSpace: "nowrap" }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={row.usedForMatching}
                      onChange={(e) =>
                        updateDraftRow(row.id, {
                          usedForMatching: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Match key"
                  sx={{ mr: 0, whiteSpace: "nowrap" }}
                />
                {draftRows.length > 1 && (
                  <IconButton
                    size="small"
                    aria-label="Remove row"
                    onClick={() => removeDraftRow(row.id)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>

          <Button
            startIcon={<AddIcon />}
            onClick={addDraftRow}
            sx={{ mt: 2 }}
          >
            Add
          </Button>

          {addError && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {addError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveDrafts}
            disabled={loading || readyDraftRows.length === 0}
          >
            {loading ? "Saving..." : "Save Columns"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onClose={() => !loading && setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Column</DialogTitle>
        <DialogContent>
          <TextField
            inputRef={labelInputRef}
            autoFocus
            label="Column Name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            fullWidth
            sx={{ mt: 1, mb: 2 }}
            placeholder="e.g. ACCT#, Install Date"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleEditSave();
              }
            }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
              />
            }
            label="Primary column (customer name in tables)"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={usedForMatching}
                onChange={(e) => setUsedForMatching(e.target.checked)}
              />
            }
            label="Use for duplicate matching on import"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEditSave}
            disabled={loading}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
