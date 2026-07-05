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
const outputPath = path.join(__dirname, "..", "docs", "ISP_CRM_User_Guide.docx");

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
                  children: [new Paragraph(cell)],
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
        heading("ISP Recovery CRM — User Guide"),
        para(
          "This guide explains how to use ISP Recovery CRM for admins, managers, VA managers, Junior Sales agents, and Senior Sales agents."
        ),
        para("Application: ISP Recovery CRM"),
        para(`Version: 2.0  |  Generated: ${generated}`),

        heading("1. What This App Does", HeadingLevel.HEADING_2),
        para("ISP Recovery CRM is a web-based customer recovery system. It helps your team:"),
        bullet("Set up a separate CRM table for each ISP with custom columns"),
        bullet("Import customer lists from ISP Excel/CSV files — including large lists (1,000+ rows)"),
        bullet("Run first text outreach on the Junior Sales Team with lead ownership"),
        bullet("Escalate callback and reschedule requests to Senior Sales for manager assignment"),
        bullet("Auto-move no-reply leads to a manager-only 30-day recycle basket after 3 attempts"),
        bullet("Assign Senior Sales escalations and delegate Junior Sales leads to reps"),
        bullet("Log calls, notes, and outcomes on each customer"),
        bullet("Flag ISP complaints and price approvals for management review"),
        bullet("View dashboards and reports on outreach and outcomes"),
        para(
          "All teams work from one master customer database. Each ISP has its own column layout, but records are never duplicated — team pages are filtered views of the same data."
        ),

        heading("2. Getting Started", HeadingLevel.HEADING_2),
        heading("2.1 Logging In", HeadingLevel.HEADING_3),
        numbered("Open the CRM in your browser"),
        numbered("Enter your email and password on the Login page"),
        numbered('Optional: check "Remember me" to stay signed in'),
        numbered("Click Sign In"),
        para(
          "If you forgot your password, click Forgot Password, enter your email, and follow the reset link sent to your inbox."
        ),
        heading("2.2 Account Creation (Admin Only)", HeadingLevel.HEADING_3),
        para(
          "Public self-registration is disabled. Only admins can create new user accounts from the Users page. If you need access, contact your admin."
        ),
        numbered("Admin opens Users from the sidebar"),
        numbered('Click "Add User"'),
        numbered("Enter full name, email, password, and role"),
        numbered("Save — the user can sign in immediately"),

        heading("2.3 User Roles", HeadingLevel.HEADING_3),
        table(
          ["Role", "What You Can Access"],
          [
            [
              "Admin",
              "Everything — Dashboard, Import, Master CRM, Junior Sales, Senior Sales, No Reply — Recycle, Alerts, ISPs, Users, Profile",
            ],
            [
              "Manager",
              "Dashboard, Import, Master CRM, Junior Sales, Senior Sales, No Reply — Recycle, Alerts, ISPs, Profile (no Users page)",
            ],
            [
              "VA Manager",
              "Dashboard, Junior Sales, Senior Sales, Alerts — can assign senior reps and log calls; cannot import, manage ISPs, or manage users",
            ],
            ["Junior Sales", "Dashboard and Junior Sales Team view only"],
            [
              "Senior Sales",
              "Dashboard and Senior Sales Team view only (your assigned escalations)",
            ],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("3. Navigation", HeadingLevel.HEADING_2),
        para(
          "After login, the sidebar shows your available pages. Click your avatar in the top-right for Profile or Sign Out."
        ),
        table(
          ["Page", "Who Uses It", "Purpose"],
          [
            ["Dashboard", "Everyone", "Overview stats and charts"],
            ["Import Customers", "Admin, Manager", "Upload ISP Excel/CSV files"],
            ["Master CRM", "Admin, Manager", "Per-ISP customer tables, bulk assignment, bulk delete"],
            ["Junior Sales Team", "Admin, Manager, VA Manager, Junior Sales", "Text outreach on new and recycled leads"],
            ["Senior Sales Team", "Admin, Manager, VA Manager, Senior Sales", "Callback/reschedule escalations"],
            ["No Reply — Recycle", "Admin, Manager", "30-day hold for no-reply leads"],
            ["Alerts", "Admin, Manager, VA Manager", "ISP complaints and price approvals"],
            ["ISPs", "Admin, Manager", "Create ISPs and define CRM columns"],
            ["Users", "Admin only", "Create, search, and delete user accounts"],
            ["Profile (header menu)", "Everyone", "Update name, avatar, password"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("4. Dashboard", HeadingLevel.HEADING_2),
        para("The Dashboard is role-specific — each user sees stats for customers they can access."),
        heading("4.1 Admin / Manager Dashboard", HeadingLevel.HEADING_3),
        bullet("Total customers and breakdown by team"),
        bullet("Unassigned Senior Sales escalations awaiting assignment"),
        bullet("No Reply — Recycle Hold, Ready to Recycle, and alerts needing attention"),
        bullet("Charts by ISP, workflow stage, assigned team, and call attempts"),
        heading("4.2 Junior Sales Dashboard", HeadingLevel.HEADING_3),
        bullet("Leads on Junior Sales Team — New, Attempt 1, Attempt 2, Attempt 3"),
        bullet("Calls logged and outcomes on your leads"),
        bullet("Charts: leads by ISP, outreach progress, and calls by result"),
        heading("4.3 Senior Sales Dashboard", HeadingLevel.HEADING_3),
        bullet("My assigned escalations only"),
        bullet("Callback Requested, Rescheduled, New Accounts Created, Closed"),
        bullet("Charts: your leads by ISP, stage, and calls by result"),

        heading("5. Setting Up an ISP (Required Before Import)", HeadingLevel.HEADING_2),
        para("Who: Admin or Manager  |  Where: ISPs page"),
        heading("5.1 Create the ISP", HeadingLevel.HEADING_3),
        numbered('Click "Add ISP"'),
        numbered("Enter the ISP name (e.g. TEC, Comcast)"),
        numbered("Save"),
        heading("5.2 Define CRM Columns", HeadingLevel.HEADING_3),
        numbered('Click "Columns" on the ISP row'),
        numbered("Add each field from the spreadsheet — mark Primary and/or match key"),
        numbered('Click "Save Columns"'),
        bullet("Primary column — main customer identifier (usually Name)"),
        bullet("Match key — used for duplicate detection on import (usually ACCT# or Phone)"),
        bullet("Other columns — Address, Product, Status, etc."),

        heading("6. Importing Customers", HeadingLevel.HEADING_2),
        para("Who: Admin or Manager  |  Where: Import Customers page"),
        numbered("Select the ISP from the dropdown"),
        numbered("Upload an Excel (.xlsx) or CSV file"),
        numbered("Review and adjust column mapping"),
        numbered("Click Preview, then Confirm Import"),
        para("After import:"),
        bullet("New records are created on Junior Sales Team, stage New, 0 attempts"),
        bullet("Existing records are updated when a match key matches (no duplicates)"),
        bullet("Finished leads (Closed or New Account Created) are re-initialized for a new outreach round"),
        bullet("Large files (1,000+ rows) are fully processed — there is no row limit"),
        para(
          "Duplicate detection uses columns marked as match keys. Active pipeline leads are updated in place without resetting workflow."
        ),

        heading("7. Master CRM", HeadingLevel.HEADING_2),
        para("Who: Admin and Manager  |  Where: Master CRM page"),
        para(
          "Master CRM shows one ISP at a time using a searchable ISP dropdown (same as Junior and Senior Sales pages)."
        ),
        numbered("Select an ISP from the dropdown at the top"),
        numbered("Search and filter by team, stage, transfer status, or assignee"),
        numbered("Click a customer name to open Customer Detail"),
        heading("7.1 Assigning Junior Leads (Managers)", HeadingLevel.HEADING_3),
        para("Managers can delegate Junior Sales leads to specific reps in three ways:"),
        bullet("Inline — use the Assigned To dropdown on any Junior Sales row (Available = unclaimed)"),
        bullet("Delegate selected — check rows, click Delegate selected, pick a junior rep"),
        bullet(
          "Auto-distribute — click Auto-distribute leads, select reps, set leads per rep (e.g. 500), distribute unassigned leads for the current ISP"
        ),
        para(
          "Delegated leads are visible only to that junior (other juniors cannot see them). Unassigned leads remain in the pool for juniors to claim."
        ),
        heading("7.2 Assigning Senior Leads (Managers / VA Managers)", HeadingLevel.HEADING_3),
        bullet("Use the Assigned To dropdown on Senior Sales rows"),
        bullet("Or assign from Customer Detail on the Senior Sales lead"),
        heading("7.3 Bulk Delete", HeadingLevel.HEADING_3),
        bullet("Select customers with checkboxes, then click Delete selected"),

        heading("8. Junior Sales Team Workflow", HeadingLevel.HEADING_2),
        para("Who: Junior Sales agents (managers and VA managers can view and log)"),
        para("Where: Junior Sales Team page"),
        para(
          "Junior outreach is text-only. Juniors see unassigned (Available) leads and leads they own. Once a junior claims a lead, other juniors no longer see it."
        ),
        heading("8.1 Finding a Lead", HeadingLevel.HEADING_3),
        numbered("Open Junior Sales Team from the sidebar"),
        numbered("Select the ISP from the searchable dropdown"),
        numbered('Use "My leads" in the Assigned To filter to see only your owned leads'),
        numbered("Click the customer name to open Customer Detail"),
        heading("8.2 Claiming a Lead — Mark Text Attempt", HeadingLevel.HEADING_3),
        para(
          "The first step on an available lead is a one-click text attempt. No reason or notes are required."
        ),
        numbered("Open an Available (unclaimed) lead"),
        numbered('Click "Mark Text Attempt" in the Actions panel'),
        para("This automatically:"),
        bullet("Logs one outbound text attempt (No Text Reply)"),
        bullet("Claims ownership — the lead becomes yours"),
        bullet("Hides the lead from other juniors"),
        bullet("Increments the attempt number and updates the stage"),
        heading("8.3 Text Attempt Cooldown", HeadingLevel.HEADING_3),
        para(
          "After logging a text attempt, you must wait 60 minutes before logging another attempt on the same lead. The button shows a countdown (e.g. Wait 45 min to text again). This prevents repeated texting within a short window."
        ),
        heading("8.4 Logging a Text Result", HeadingLevel.HEADING_3),
        para(
          "When a customer replies, open your lead and use Log Text Result (or Log Text) to record what happened."
        ),
        numbered('Click "Log Text Result"'),
        numbered("Select the result (Simple Reschedule, Call Requested, Not Interested, etc.)"),
        numbered("Add notes"),
        numbered("Save"),
        heading("8.5 Escalating to Senior Sales", HeadingLevel.HEADING_3),
        para("Log text with one of these results to escalate:"),
        bullet("Call Requested — customer wants a phone call"),
        bullet("Reschedule by Phone — customer needs a call to reschedule"),
        bullet("ISP Complaint — creates a management alert"),
        bullet("Price Approval Needed — creates a management alert"),
        para("Simple Reschedule (confirmed by text) stays on Junior Sales."),
        heading("8.6 No Reply — Automatic Recycle Hold", HeadingLevel.HEADING_3),
        para(
          "After 3 text attempts logged as No Text Reply, the lead automatically moves to No Reply — Recycle Hold for 30 days. No manual action is needed."
        ),
        heading("8.7 Available vs Unassigned", HeadingLevel.HEADING_3),
        table(
          ["Label", "Meaning"],
          [
            ["Available", "Junior Sales lead with no owner — any junior can claim it"],
            ["Rep name", "Junior Sales lead owned by that rep — only they can see and work it"],
            ["Unassigned", "Lead not on Junior Sales Team with no rep (e.g. Senior lead awaiting assignment)"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("9. Senior Sales Team Workflow", HeadingLevel.HEADING_2),
        para("Who: Senior Sales agents, managers, and VA managers"),
        para("Where: Senior Sales Team page"),
        heading("9.1 Viewing Escalated Leads", HeadingLevel.HEADING_3),
        bullet("Senior agents see only leads assigned to them"),
        bullet("Managers, admins, and VA managers see all Senior Sales leads"),
        bullet('Filter by Assigned To: All, Unassigned, or a specific rep'),
        bullet("Select ISP from the searchable dropdown"),
        heading("9.2 Assigning Leads", HeadingLevel.HEADING_3),
        para("Managers and VA managers assign senior reps:"),
        numbered("On the Senior Sales table — Assigned To dropdown per row"),
        numbered("On Customer Detail — Assigned Senior Sales Rep dropdown"),
        heading("9.3 Logging Senior Sales Calls", HeadingLevel.HEADING_3),
        numbered("Open your assigned customer"),
        numbered('Click "Log Call"'),
        numbered("Select result and add notes"),
        numbered("Save"),

        heading("10. No Reply — Recycle Workflow", HeadingLevel.HEADING_2),
        para("Who: Admin and Manager  |  Where: No Reply — Recycle page"),
        bullet("Leads auto-enter after 3 No Text Reply attempts"),
        bullet("30-day hold — filter by Ready (30+ days) or Waiting"),
        numbered('When ready, open the lead and click "Send back to Junior Sales"'),
        para("Lead returns to Junior Sales Team as a new outreach round."),

        heading("11. Customer Detail Page", HeadingLevel.HEADING_2),
        para("Open from any table by clicking the customer name."),
        para("Information: customer fields, workflow status, call log, notes, activity timeline."),
        para("Actions (varies by role and team):"),
        bullet("Mark Text Attempt — juniors on unclaimed or owned Junior leads (one-click claim + attempt)"),
        bullet("Log Text / Log Text Result — juniors record text outcomes"),
        bullet("Log Call — senior reps and managers"),
        bullet("Reschedule Install / Quick log — senior reps"),
        bullet("Send back to Junior Sales — managers on Recycle Hold leads"),
        bullet("Assigned Senior Sales Rep — managers / VA managers on Senior leads"),

        heading("12. Alerts Page", HeadingLevel.HEADING_2),
        para("Who: Admin, Manager, VA Manager"),
        para("Alerts appear for ISP Complaint and Price Approval Needed."),
        numbered("Review the alert"),
        numbered("Send required email to the ISP (outside the CRM)"),
        numbered("Update status: Needs Email → Email Sent → In Review → Resolved"),
        para("Resolving an alert does not finish the sales lead — log a terminal result on the customer to close it."),

        heading("13. ISPs Page", HeadingLevel.HEADING_2),
        para("Who: Admin and Manager"),
        numbered("Add ISP names"),
        numbered("Define columns for each ISP"),
        numbered("View CRM opens that ISP on Master CRM"),

        heading("14. Users Page (Admin Only)", HeadingLevel.HEADING_2),
        para("Who: Admin"),
        bullet("Create new users (email, password, name, role) — no public signup"),
        bullet("Search users by name, email, or role"),
        bullet("Change roles: admin, manager, va_manager, junior_sales, senior_sales"),
        bullet("Delete users who should no longer access the system (permanent removal)"),
        para("Team is set automatically from role. You cannot delete your own account."),

        heading("15. Profile Page", HeadingLevel.HEADING_2),
        bullet("Full name"),
        bullet("Profile photo"),
        bullet("Password change"),
        para("Click your avatar → Profile."),

        heading("16. Junior Text Results", HeadingLevel.HEADING_2),
        table(
          ["Text Result", "When to Use"],
          [
            ["No Text Reply", "No response — counts as attempt; 3x triggers Recycle Hold"],
            ["Simple Reschedule", "Customer confirmed new date by text — stays on Junior Sales"],
            ["Call Requested", "Customer wants a phone call — escalates to Senior Sales"],
            ["Reschedule by Phone", "Customer needs a call to reschedule — escalates"],
            ["ISP Complaint", "Customer has ISP issue — alert + escalates"],
            ["Price Approval Needed", "Customer wants better price — alert + escalates"],
            ["Not Interested", "Customer declined — closes the lead"],
            ["Wrong Number", "Incorrect phone — closes the lead"],
            ["Do Not Call", "Customer requested no contact — closes the lead"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("17. Senior Call Results", HeadingLevel.HEADING_2),
        table(
          ["Call Result", "When to Use"],
          [
            ["No Answer", "Phone rang, nobody picked up"],
            ["Left Voicemail", "You left a voicemail"],
            ["Customer Answered", "Spoke with the customer"],
            ["Callback Requested", "Customer asked to be called back later"],
            ["Rescheduled", "Install appointment rescheduled"],
            ["New Account Created", "Customer signed up — lead solved"],
            ["Not Interested", "Customer declined — closes the lead"],
            ["Wrong Number", "Incorrect phone — closes the lead"],
            ["Do Not Call", "No further contact — closes the lead"],
            ["ISP Complaint", "Creates management alert"],
            ["Price Approval Needed", "Creates management alert"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("18. Workflow Stages Reference", HeadingLevel.HEADING_2),
        table(
          ["Stage", "Meaning"],
          [
            ["New", "Just imported or recycled, no attempts yet"],
            ["Attempt 1 / 2 / 3", "Junior Sales outreach attempts"],
            ["No Reply - Hold", "In 30-day recycle basket"],
            ["Callback Requested", "Customer wants a return call"],
            ["Rescheduled", "Install appointment set"],
            ["New Account Created", "Customer re-signed"],
            ["Closed", "Lead finished"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("19. Key Business Rules", HeadingLevel.HEADING_2),
        bullet("One master database — no duplicate records between teams"),
        bullet("Each ISP has its own column layout — set up columns before importing"),
        bullet("Large imports (1,000+ rows) are fully supported"),
        bullet("Junior Sales uses text-only outreach — 3 attempts before automatic recycle hold"),
        bullet("Juniors claim leads by marking a text attempt — owned leads are hidden from other juniors"),
        bullet("60-minute cooldown between text attempts on the same lead"),
        bullet("Managers can delegate or auto-distribute junior leads from Master CRM"),
        bullet("Call Requested, Reschedule by Phone, ISP Complaint, and Price Approval Needed escalate to Senior Sales"),
        bullet("Managers and VA managers assign Senior Sales reps to escalated leads"),
        bullet("Only admins can create or delete user accounts — no public signup"),
        bullet("ISP complaints and price requests go to Alerts"),
        bullet("Every interaction is tracked in the activity log"),

        heading("20. Quick Daily Checklist", HeadingLevel.HEADING_2),
        heading("Junior Sales Agent", HeadingLevel.HEADING_3),
        numbered("Open Junior Sales Team — select your ISP"),
        numbered('Filter "My leads" to see leads you own'),
        numbered("Claim available leads with Mark Text Attempt"),
        numbered("When customers reply, log the text result"),
        numbered("Escalate to Senior Sales when a call is needed"),
        heading("Senior Sales Agent", HeadingLevel.HEADING_3),
        numbered("Open Senior Sales Team — review assigned escalations"),
        numbered("Return callbacks and complete reschedules"),
        numbered("Log every call and close leads when resolved"),
        heading("Manager / Admin", HeadingLevel.HEADING_3),
        numbered("Import new ISP files and set up new ISPs"),
        numbered("Delegate or auto-distribute junior leads from Master CRM"),
        numbered("Assign Senior Sales escalations"),
        numbered("Review No Reply — Recycle and send ready leads back to Junior Sales"),
        numbered("Resolve Alerts"),
        numbered("Create user accounts (admin) and monitor Dashboard"),
        heading("VA Manager", HeadingLevel.HEADING_3),
        numbered("Assign Senior Sales reps to escalated leads"),
        numbered("Monitor Junior and Senior Sales pages and Alerts"),
        numbered("Log calls on leads as needed"),

        heading("21. Regenerating This Guide", HeadingLevel.HEADING_2),
        para("Developers can regenerate this document anytime with: npm run docs:user-guide"),
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
