import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} from "docx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(
  __dirname,
  "..",
  "docs",
  "ISP_CRM_Workflow_Reference.docx"
);

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ text, heading: level, spacing: { after: 200 } });
}

function para(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun(text)],
  });
}

function bullet(text) {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function numbered(text) {
  return new Paragraph({
    text,
    numbering: { reference: "numbered-list", level: 0 },
    spacing: { after: 80 },
  });
}

function table(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(
          (h) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: h, bold: true })],
                }),
              ],
            })
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph(String(cell))],
                })
            ),
          })
      ),
    ],
  });
}

const generated = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "numbered-list",
        levels: [
          {
            level: 0,
            format: "decimal",
            text: "%1.",
            alignment: AlignmentType.START,
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {},
      children: [
        heading("ISP Recovery CRM — Workflow Reference"),
        para(
          "What happens after each Log Text (Junior Sales) or Log Call (Senior Sales) result. This reflects the current application logic."
        ),
        para(`Generated: ${generated}`),
        para("Application: ISP Recovery CRM"),

        heading("1. Pipeline Overview", HeadingLevel.HEADING_2),
        para("End-to-end flow:"),
        numbered("Import → new lead on Junior Sales Team, stage New, 0 attempts"),
        numbered(
          "Junior Sales — up to 3 text attempts (Log Text). No Text Reply × 3 → Recycle Hold for 30 days."
        ),
        numbered(
          "Escalation results from Junior → Senior Sales Team (manager assigns a senior rep)."
        ),
        numbered(
          "Senior Sales — Log Call to complete callback, reschedule, solve (New Account Created), or close the lead."
        ),
        numbered(
          "Recycle Hold — after 30 days, manager sends lead back to Junior Sales for a new round."
        ),
        numbered(
          "Re-import — finished leads (Closed or New Account Created) that match again are re-initialized to Junior Sales / New."
        ),
        para("Every log always:"),
        bullet("Increments attempt number by 1"),
        bullet("Updates last contact date"),
        bullet("Saves an entry in Call Log History"),
        bullet("Logs activity on the customer timeline"),

        heading("2. Junior Sales — Log Text Results", HeadingLevel.HEADING_2),
        para(
          "Junior outreach is text-only. Results below apply when assigned_team = Junior Sales Team."
        ),
        table(
          [
            "Log Result",
            "Team After",
            "Stage After",
            "Transfer Status",
            "Alert",
            "Notes",
          ],
          [
            [
              "No Text Reply (attempt 1–2)",
              "Junior Sales",
              "Attempt 1 / 2 / 3",
              "None",
              "—",
              "Stays on Junior Sales",
            ],
            [
              "No Text Reply (attempt 3)",
              "Recycle Hold",
              "No Reply - Hold",
              "Recycle in 30 Days",
              "—",
              "follow_up_date = today + 30 days; junior rep redirected to list",
            ],
            [
              "Simple Reschedule",
              "Junior Sales",
              "Rescheduled",
              "None",
              "—",
              "Outcome = Rescheduled; does NOT escalate",
            ],
            [
              "Call Requested",
              "Senior Sales",
              "Callback Requested",
              "Senior Review",
              "—",
              "Assignee cleared; manager assigns senior rep",
            ],
            [
              "Reschedule by Phone",
              "Senior Sales",
              "Callback Requested",
              "Senior Review",
              "—",
              "Same as Call Requested",
            ],
            [
              "ISP Complaint",
              "Senior Sales",
              "(unchanged)",
              "Senior Review",
              "ISP Complaint → Needs Email",
              "Escalates + management alert",
            ],
            [
              "Price Approval Needed",
              "Senior Sales",
              "(unchanged)",
              "Senior Review",
              "Price Approval → Needs Email",
              "price_approval_status = Pending",
            ],
            [
              "Not Interested",
              "Junior Sales",
              "Closed",
              "None",
              "—",
              "Outcome = Not Interested — lead finished",
            ],
            [
              "Wrong Number",
              "Junior Sales",
              "Closed",
              "None",
              "—",
              "Outcome = Wrong Number — lead finished",
            ],
            [
              "Do Not Call",
              "Junior Sales",
              "Closed",
              "None",
              "—",
              "Outcome = Do Not Call — lead finished",
            ],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("3. Senior Sales — Log Call Results", HeadingLevel.HEADING_2),
        para(
          "Senior reps log phone calls. Results below apply when assigned_team = Senior Sales Team. Senior leads do NOT auto-move to Recycle Hold."
        ),
        table(
          [
            "Log Result",
            "Team After",
            "Stage After",
            "Transfer Status",
            "Alert",
            "Notes",
          ],
          [
            [
              "No Answer",
              "Senior Sales",
              "(usually unchanged)",
              "(unchanged)",
              "—",
              "Attempt +1 only",
            ],
            [
              "Left Voicemail",
              "Senior Sales",
              "(unchanged)",
              "(unchanged)",
              "—",
              "Attempt +1 only",
            ],
            [
              "Customer Answered",
              "Senior Sales",
              "(unchanged)",
              "(unchanged)",
              "—",
              "Attempt +1 only",
            ],
            [
              "Callback Requested",
              "Senior Sales",
              "Callback Requested",
              "(unchanged)",
              "—",
              "Stays with senior rep",
            ],
            [
              "Rescheduled",
              "Senior Sales",
              "Rescheduled",
              "(unchanged)",
              "—",
              "Outcome = Rescheduled",
            ],
            [
              "New Account Created",
              "Senior Sales",
              "New Account Created",
              "(unchanged)",
              "—",
              "Outcome = New Account Created — lead SOLVED",
            ],
            [
              "Not Interested",
              "Senior Sales",
              "Closed",
              "(unchanged)",
              "—",
              "Outcome = Not Interested — lead finished",
            ],
            [
              "Wrong Number",
              "Senior Sales",
              "Closed",
              "(unchanged)",
              "—",
              "Outcome = Wrong Number — lead finished",
            ],
            [
              "Do Not Call",
              "Senior Sales",
              "Closed",
              "(unchanged)",
              "—",
              "Outcome = Do Not Call — lead finished",
            ],
            [
              "ISP Complaint",
              "Senior Sales",
              "(unchanged)",
              "Management Review",
              "ISP Complaint → Needs Email",
              "Shows on Alerts page; does not finish lead",
            ],
            [
              "Price Approval Needed",
              "Senior Sales",
              "(unchanged)",
              "Management Review",
              "Price Approval → Needs Email",
              "Pending price approval; does not finish lead",
            ],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("4. Decision Order (What the System Checks)", HeadingLevel.HEADING_2),
        para("When any log is saved, the system applies rules in this order:"),
        numbered("Increment attempt number and set last contact date"),
        numbered(
          "If terminal result → set workflow stage and outcome (New Account Created = solved; Not Interested / Wrong Number / Do Not Call = Closed)"
        ),
        numbered(
          "Else if Junior Sales and attempt ≤ 3 → set stage to Attempt 1, 2, or 3 (for results like No Text Reply)"
        ),
        numbered(
          "If ISP Complaint or Price Approval Needed → create alert (Needs Email) and set transfer to Management Review"
        ),
        numbered(
          "If on Junior Sales and result escalates (Call Requested, Reschedule by Phone, ISP Complaint, Price Approval Needed) → move to Senior Sales, Senior Review, clear assignee"
        ),
        numbered(
          "If on Junior Sales and 3rd attempt is No Text Reply → move to Recycle Hold, 30-day follow-up"
        ),
        para(
          "Note: For Junior ISP Complaint / Price Approval, escalation to Senior Sales runs after the alert is set, so transfer ends as Senior Review."
        ),

        heading("5. Visual Flow — Junior Sales", HeadingLevel.HEADING_2),
        para("Import (New, 0 attempts)"),
        para("    ↓"),
        para("Log Text — Attempt 1"),
        para("    ├─ No Text Reply → Attempt 1 stage, stay Junior"),
        para("    ├─ Simple Reschedule → Rescheduled stage, stay Junior"),
        para("    ├─ Call Requested / Reschedule by Phone → ESCALATE to Senior Sales"),
        para("    ├─ ISP Complaint / Price Approval → ESCALATE + Alert"),
        para("    └─ Not Interested / Wrong # / DNC → CLOSED"),
        para("    ↓"),
        para("Log Text — Attempt 2 (same branches)"),
        para("    ↓"),
        para("Log Text — Attempt 3"),
        para("    ├─ No Text Reply → RECYCLE HOLD (30 days)"),
        para("    └─ (other results same as above)"),

        heading("6. Visual Flow — Senior Sales", HeadingLevel.HEADING_2),
        para("Escalated lead (Senior Review, unassigned until manager assigns)"),
        para("    ↓"),
        para("Manager assigns senior rep"),
        para("    ↓"),
        para("Log Call"),
        para("    ├─ No Answer / Voicemail / Answered → stay Senior, attempt +1"),
        para("    ├─ Callback Requested → stage Callback Requested"),
        para("    ├─ Rescheduled → stage Rescheduled"),
        para("    ├─ New Account Created → SOLVED"),
        para("    ├─ Not Interested / Wrong # / DNC → CLOSED"),
        para("    └─ ISP Complaint / Price Approval → Alert (manager resolves on Alerts page)"),

        heading("7. Alerts vs Finishing the Lead", HeadingLevel.HEADING_2),
        para(
          "Resolving an alert on the Alerts page (Needs Email → Email Sent → In Review → Resolved, plus Approve/Deny for price) only closes the management task."
        ),
        para("It does NOT:"),
        bullet("Change assigned team or workflow stage to finished"),
        bullet("Clear transfer status automatically"),
        bullet("Mark the lead as solved or closed"),
        para(
          "After the alert is resolved, the manager or assigned senior rep must open the customer and Log Call with New Account Created (solved) or a closed result (Not Interested, Wrong Number, Do Not Call)."
        ),

        heading("8. Re-Import Behavior", HeadingLevel.HEADING_2),
        para("When re-importing an ISP file and a row matches an existing customer (match-key column):"),
        bullet(
          "Active leads (in progress, Senior Sales, Recycle Hold) → spreadsheet fields updated only; workflow unchanged"
        ),
        bullet(
          "Finished leads (stage Closed or New Account Created, or matching terminal outcome) → re-initialized: Junior Sales Team, stage New, 0 attempts, outcome Pending, alerts cleared"
        ),
        bullet("Import summary shows a Re-initialized count for finished leads that were reset"),

        heading("9. Who Can Log", HeadingLevel.HEADING_2),
        table(
          ["Role", "Junior Sales leads", "Senior Sales leads", "Recycle Hold"],
          [
            [
              "Junior Sales",
              "Log Text",
              "No access",
              "No access",
            ],
            [
              "Senior Sales",
              "No access",
              "Log Call (assigned leads)",
              "No access",
            ],
            [
              "Manager / Admin",
              "Log Text",
              "Log Call",
              "Send back to Junior Sales (when ready)",
            ],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("10. Finished Lead States", HeadingLevel.HEADING_2),
        table(
          ["State", "Stage", "Outcome", "Re-import matched row"],
          [
            ["Solved", "New Account Created", "New Account Created", "Re-initialized to Junior / New"],
            ["Closed (negative)", "Closed", "Not Interested / Wrong Number / Do Not Call", "Re-initialized to Junior / New"],
            ["In progress", "New, Attempt 1–3, Callback Requested, Rescheduled, etc.", "Pending or Rescheduled", "Updated only — workflow kept"],
            ["Recycle Hold", "No Reply - Hold", "Pending", "Updated only — workflow kept"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        para(
          "Regenerate: npm run docs:workflow  |  Companion docs: ISP_CRM_User_Guide.docx, ISP_CRM_Example_Scenario.docx"
        ),
      ],
    },
  ],
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const buffer = await Packer.toBuffer(doc);
try {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created: ${outputPath}`);
} catch (err) {
  if (err?.code === "EBUSY") {
    const fallback = outputPath.replace(/\.docx$/, "_updated.docx");
    fs.writeFileSync(fallback, buffer);
    console.log(`Target locked — wrote: ${fallback}`);
    console.log("Close the open document and re-run to overwrite the main file.");
  } else {
    throw err;
  }
}
