"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Card,
  CardContent,
  Step,
  StepLabel,
  Stepper,
  TextField,
  MenuItem,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  Stack,
  Chip,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { buildPreview } from "@/lib/import";
import { previewImport, confirmImport } from "@/actions/import";
import type { ISPColumn } from "@/lib/types";

interface ISP {
  id: string;
  name: string;
  columns?: ISPColumn[];
}

interface Props {
  isps: ISP[];
}

const STEPS = ["Upload File", "Map Columns", "Preview & Confirm", "Summary"];

export default function ImportWizard({ isps }: Props) {
  const [step, setStep] = useState(0);
  const [ispId, setIspId] = useState("");
  const [ispColumns, setIspColumns] = useState<ISPColumn[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<
    { rowNumber: number; mapped: Record<string, string | null> }[]
  >([]);
  const [allRows, setAllRows] = useState<Record<string, string | null>[]>([]);
  const [fileName, setFileName] = useState("");
  const [totalRows, setTotalRows] = useState(0);
  const [summary, setSummary] = useState<{
    total_rows: number;
    new_customers: number;
    updated_customers: number;
    skipped_rows: number;
    error_rows: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedIsp = isps.find((isp) => isp.id === ispId);
  const columnCount = selectedIsp?.columns?.length ?? 0;

  const mappedColumnKeys = [
    ...new Set(Object.values(columnMapping).filter(Boolean)),
  ];
  const mappedColumns = ispColumns.filter((c) =>
    mappedColumnKeys.includes(c.column_key)
  );

  const handleFileUpload = async () => {
    if (!file || !ispId) {
      setError("Please select an ISP and upload a file");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await previewImport(formData, ispId);
      setHeaders(result.headers);
      setColumnMapping(result.autoMapping);
      setIspColumns(result.ispColumns);
      setAllRows(result.rows);
      setPreviewRows(result.previewRows);
      setTotalRows(result.totalRows);
      setFileName(result.fileName);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (header: string, columnKey: string) => {
    setColumnMapping((prev) => {
      const next = { ...prev };
      if (columnKey) {
        next[header] = columnKey;
      } else {
        delete next[header];
      }
      return next;
    });
  };

  const handleGoToPreview = () => {
    setPreviewRows(buildPreview(allRows, columnMapping, 20));
    setStep(2);
  };

  const handleConfirm = async () => {
    if (!file) {
      setError("Original file is missing. Go back and upload the file again.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ispId", ispId);
      formData.append("fileName", fileName);
      formData.append("columnMapping", JSON.stringify(columnMapping));
      const result = await confirmImport(formData);
      setSummary(result);
      setStep(3);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Import failed";
      if (message.includes("unexpected response")) {
        setError(
          "Import failed — the file may be too large or the server timed out. Try a smaller file or check your internet connection."
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setFile(null);
    setHeaders([]);
    setColumnMapping({});
    setIspColumns([]);
    setPreviewRows([]);
    setAllRows([]);
    setSummary(null);
    setError("");
  };

  return (
    <Box>
      <Stepper activeStep={step} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {step === 0 && (
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <TextField
                select
                label="Select ISP"
                value={ispId}
                onChange={(e) => setIspId(e.target.value)}
                fullWidth
                required
              >
                {isps.map((isp) => (
                  <MenuItem key={isp.id} value={isp.id}>
                    {isp.name}
                    {isp.columns ? ` (${isp.columns.length} columns)` : ""}
                  </MenuItem>
                ))}
              </TextField>

              {ispId && columnCount === 0 && (
                <Alert severity="warning">
                  This ISP has no CRM columns yet.{" "}
                  <Link href="/isps">Add columns on the ISPs page</Link> before
                  importing.
                </Alert>
              )}

              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUploadIcon />}
                >
                  Choose Excel/CSV File
                  <input
                    type="file"
                    hidden
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </Button>
                {file && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Selected: {file.name}
                  </Typography>
                )}
              </Box>

              <Button
                variant="contained"
                onClick={handleFileUpload}
                disabled={loading || !file || !ispId || columnCount === 0}
              >
                {loading ? "Parsing..." : "Upload & Continue"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Column Mapping ({totalRows} rows detected)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Map spreadsheet columns to this ISP&apos;s CRM columns. Matching
              labels are auto-mapped.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Spreadsheet Column</TableCell>
                  <TableCell>ISP CRM Column</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {headers.map((header) => (
                  <TableRow key={header}>
                    <TableCell>{header}</TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={columnMapping[header] || ""}
                        onChange={(e) =>
                          handleMappingChange(header, e.target.value)
                        }
                        sx={{ minWidth: 220 }}
                      >
                        <MenuItem value="">— Skip —</MenuItem>
                        {ispColumns.map((col) => (
                          <MenuItem key={col.column_key} value={col.column_key}>
                            {col.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button onClick={() => setStep(0)}>Back</Button>
              <Button variant="contained" onClick={handleGoToPreview}>
                Preview
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Preview (first 20 rows)
            </Typography>
            {mappedColumns.length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                No columns mapped. Go back and map at least one spreadsheet column.
              </Alert>
            )}
            <Box sx={{ overflowX: "auto", mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    {mappedColumns.map((col) => (
                      <TableCell key={col.column_key}>{col.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewRows.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.rowNumber}</TableCell>
                      {mappedColumns.map((col) => (
                        <TableCell key={col.column_key}>
                          {row.mapped[col.column_key] || "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button onClick={() => setStep(1)}>Back</Button>
              <Button
                variant="contained"
                onClick={handleConfirm}
                disabled={loading || mappedColumns.length === 0}
              >
                {loading ? "Importing..." : `Confirm Import (${totalRows} rows)`}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {step === 3 && summary && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Import Complete
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
              <Chip label={`Total Rows: ${summary.total_rows}`} />
              <Chip label={`New: ${summary.new_customers}`} color="success" />
              <Chip label={`Updated: ${summary.updated_customers}`} color="info" />
              <Chip label={`Skipped: ${summary.skipped_rows}`} />
              <Chip
                label={`Errors: ${summary.error_rows}`}
                color={summary.error_rows > 0 ? "error" : "default"}
              />
            </Stack>
            <Button variant="contained" onClick={handleReset}>
              Import Another File
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
