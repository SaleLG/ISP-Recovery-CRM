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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import {
  createISPColumn,
  updateISPColumn,
  deleteISPColumn,
  reorderISPColumns,
} from "@/actions/ispColumns";
import type { ISPColumn } from "@/lib/types";

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
  const [columns, setColumns] = useState(initialColumns);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ISPColumn | null>(null);
  const [label, setLabel] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [usedForMatching, setUsedForMatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dialogOpen) return;
    const timer = window.setTimeout(() => labelInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [dialogOpen]);

  const resetCreateForm = (columnCount: number) => {
    setEditing(null);
    setLabel("");
    setIsPrimary(columnCount === 0);
    setUsedForMatching(false);
    window.setTimeout(() => labelInputRef.current?.focus(), 50);
  };

  const openCreate = () => {
    setEditing(null);
    setLabel("");
    setIsPrimary(columns.length === 0);
    setUsedForMatching(false);
    setDialogOpen(true);
  };

  const openEdit = (column: ISPColumn) => {
    setEditing(column);
    setLabel(column.label);
    setIsPrimary(column.is_primary);
    setUsedForMatching(column.used_for_matching);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!label.trim()) return;
    setLoading(true);
    try {
      if (editing) {
        const updated = await updateISPColumn(editing.id, {
          label,
          is_primary: isPrimary,
          used_for_matching: usedForMatching,
        });
        const next = columns.map((c) =>
          c.id === editing.id
            ? updated
            : isPrimary
              ? { ...c, is_primary: false }
              : c
        );
        setColumns(next);
        onChange(next);
        setDialogOpen(false);
      } else {
        const created = await createISPColumn({
          ispId,
          label,
          is_primary: isPrimary,
          used_for_matching: usedForMatching,
        });
        const next = isPrimary
          ? columns.map((c) => ({ ...c, is_primary: false }))
          : columns;
        const updatedColumns = [...next, created];
        setColumns(updatedColumns);
        onChange(updatedColumns);
        resetCreateForm(updatedColumns.length);
      }
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
      await deleteISPColumn(id);
      const next = columns.filter((c) => c.id !== id);
      setColumns(next);
      onChange(next);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete column");
    }
  };

  const moveColumn = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;
    const reordered = [...columns];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    setColumns(reordered);
    onChange(reordered);
    try {
      await reorderISPColumns(
        ispId,
        reordered.map((c) => c.id)
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reorder columns");
      setColumns(columns);
      onChange(columns);
    }
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
        onClick={openCreate}
        sx={{ mb: 2 }}
      >
        Add Column
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
            {columns.map((column, index) => (
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
                    disabled={index === 0}
                    onClick={() => moveColumn(index, -1)}
                  >
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={index === columns.length - 1}
                    onClick={() => moveColumn(index, 1)}
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
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editing ? "Edit Column" : "Add Column"}</DialogTitle>
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
                handleSave();
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
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
