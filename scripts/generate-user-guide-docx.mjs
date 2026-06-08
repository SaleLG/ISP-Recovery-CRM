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
        heading("ISP CRM — User Guide"),
        para(
          "This guide explains how to use the ISP CRM application for Miller Bros Sales Loss Recovery Division. It covers daily workflows for admins, managers, Senior Sales agents, and Recovery agents."
        ),
        para("Application: ISP CRM"),
        para(`Version: 1.0  |  Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`),

        heading("1. What This App Does", HeadingLevel.HEADING_2),
        para(
          "ISP CRM is a web-based customer recovery system. It helps your team:"
        ),
        bullet("Import customer lists from ISP Excel/CSV files"),
        bullet("Track call attempts and workflow stages"),
        bullet("Hand off leads from Senior Sales to Recovery after 3 attempts"),
        bullet("Assign Recovery leads to specific agents"),
        bullet("Log calls, notes, and outcomes on each customer"),
        bullet("Flag ISP complaints and price approvals for management review"),
        bullet("View dashboards and reports on recovery progress"),
        para(
          "All teams work from one master customer database. Records are never duplicated — team pages are filtered views of the same data."
        ),

        heading("2. Getting Started", HeadingLevel.HEADING_2),
        heading("2.1 Logging In", HeadingLevel.HEADING_3),
        numbered("Open the CRM in your browser (your Netlify URL or http://localhost:3000 for local use)"),
        numbered("Enter your email and password on the Login page"),
        numbered('Optional: check "Remember me" to stay signed in'),
        numbered("Click Sign In"),
        para(
          "If you forgot your password, click Forgot Password, enter your email, and follow the reset link sent to your inbox. The link opens a page where you set a new password."
        ),

        heading("2.2 Signing Up (New Users)", HeadingLevel.HEADING_3),
        numbered("Click Sign Up on the login page"),
        numbered("Enter your full name, email, and password"),
        numbered("Submit the form"),
        para(
          "New accounts are created as Senior Sales users and remain inactive until an admin approves them on the Users page. You will see a Pending Approval screen until activated. The admin sets your final role (Admin, Manager, Senior Sales, or Recovery) when approving you."
        ),

        heading("2.3 User Roles", HeadingLevel.HEADING_3),
        table(
          ["Role", "What You Can Access"],
          [
            [
              "Admin",
              "Everything — Dashboard, Import, Master CRM, Senior Sales, Recovery, Alerts, ISPs, Users, Profile",
            ],
            [
              "Manager",
              "Dashboard, Import, Master CRM, Senior Sales, Recovery, Alerts, ISPs, Profile (no Users page)",
            ],
            [
              "Senior Sales",
              "Dashboard and Senior Sales Team view only",
            ],
            [
              "Recovery",
              "Dashboard and Recovery Team view only (your assigned leads)",
            ],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("3. Navigation", HeadingLevel.HEADING_2),
        para(
          "After login, the blue sidebar on the left shows your available pages. Click any item to navigate. The top header shows your name and avatar — click it for Profile or Sign Out."
        ),
        table(
          ["Page", "Who Uses It", "Purpose"],
          [
            ["Dashboard", "Everyone", "Overview stats and charts"],
            ["Import Customers", "Admin, Manager", "Upload ISP Excel/CSV files"],
            ["Master CRM", "Admin, Manager", "Full customer list with all filters"],
            ["Senior Sales Team", "Admin, Manager, Senior Sales", "Leads for first 3 call attempts"],
            ["Recovery Team", "Admin, Manager, Recovery", "Recovery follow-up and install reschedules"],
            ["Alerts", "Admin, Manager", "ISP complaints and price approvals"],
            ["ISPs", "Admin, Manager", "Manage ISP names used for imports"],
            ["Users", "Admin only", "Approve and manage user accounts"],
            ["Profile", "Everyone", "Update name, avatar, password"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("4. Dashboard", HeadingLevel.HEADING_2),
        para("The Dashboard gives a quick snapshot of CRM activity:"),
        bullet("Total customers and breakdown by team"),
        bullet("Outcomes (Rescheduled, Recovered, Closed, etc.)"),
        bullet("Alerts needing attention"),
        bullet("Recent activity trends"),
        para("Use this page at the start of each day to see workload and results."),

        heading("5. Importing Customers", HeadingLevel.HEADING_2),
        para("Who: Admin or Manager"),
        para("Where: Import Customers page"),
        numbered('Select the ISP (e.g. Comcast, Spectrum) from the dropdown'),
        numbered("Upload an Excel (.xlsx) or CSV file from the ISP"),
        numbered(
          "Review column mapping — the system auto-maps common headers (Name, Number, ACCT#, Address, etc.)"
        ),
        numbered("Adjust any incorrect mappings manually"),
        numbered("Click Preview to see the first 20 rows"),
        numbered("Click Confirm Import to process the file"),
        para("After import, you see a summary:"),
        bullet("New records created"),
        bullet("Existing records updated"),
        bullet("Duplicates skipped"),
        bullet("Errors (if any)"),
        para("Duplicate detection order:"),
        numbered("Match by ISP + Account Number"),
        numbered("If no match, try ISP + Phone"),
        numbered("If no match, try ISP + Name + Address"),
        para(
          "New customers are assigned to Senior Sales Team with workflow stage New and 0 call attempts."
        ),

        heading("6. Master CRM", HeadingLevel.HEADING_2),
        para("Who: Admin and Manager"),
        para("Where: Master CRM page"),
        para("This is the full customer database. Use it to:"),
        bullet("Search by name, phone, account number, or address"),
        bullet("Filter by ISP, team, workflow stage, or transfer status"),
        bullet("Click any customer name to open their detail page"),
        bullet("Edit team and stage inline (when editable mode is on)"),
        para(
          "Use Master CRM when you need to find any customer regardless of which team they are on."
        ),

        heading("7. Senior Sales Team Workflow", HeadingLevel.HEADING_2),
        para("Who: Senior Sales agents (and managers overseeing them)"),
        para("Where: Senior Sales Team page"),
        para(
          "This view shows customers assigned to Senior Sales Team. Your job is to make up to 3 contact attempts before handing off to Recovery."
        ),

        heading("7.1 Finding a Lead", HeadingLevel.HEADING_3),
        numbered("Open Senior Sales Team from the sidebar"),
        numbered("Use search or filters to find your lead"),
        numbered("Click the customer name to open Customer Detail"),

        heading("7.2 Logging a Call", HeadingLevel.HEADING_3),
        numbered('Click "Log Call" in the Actions panel'),
        numbered("Select the call result (No Answer, Left Voicemail, Customer Answered, etc.)"),
        numbered("Add notes about what happened"),
        numbered('Click "Log Call" to save'),
        para("The system automatically:"),
        bullet("Increments the call attempt number"),
        bullet("Updates workflow stage (Attempt 1, Attempt 2, Attempt 3)"),
        bullet("Saves the call in Call Log History"),
        bullet(
          'After 3 attempts with no success, sets transfer status to "Move to Recovery Needed"'
        ),

        heading("7.3 Moving to Recovery", HeadingLevel.HEADING_3),
        para(
          'After 3 call attempts, a "Move to Recovery Team" button appears on the customer detail page.'
        ),
        numbered("Click Move to Recovery Team"),
        numbered("Confirm the transfer"),
        para("The customer:"),
        bullet('Moves to assigned_team = Recovery Team'),
        bullet('Gets workflow_stage = In Recovery'),
        bullet("Disappears from Senior Sales view and appears in Recovery Team view"),
        bullet("Stays as the same record — not copied"),

        heading("8. Recovery Team Workflow", HeadingLevel.HEADING_2),
        para("Who: Recovery agents and managers"),
        para("Where: Recovery Team page"),
        para(
          "Recovery handles customers who could not be reached or closed by Senior Sales. The primary goal is to reschedule install appointments for customers who did not complete their initial install."
        ),

        heading("8.1 Viewing Your Leads", HeadingLevel.HEADING_3),
        bullet(
          "Recovery agents only see leads assigned to them by a manager"
        ),
        bullet(
          "Managers and admins see all Recovery leads and can filter by agent"
        ),
        bullet(
          'Use the "Assigned To" filter: All agents, My leads, Unassigned, or a specific agent'
        ),

        heading("8.2 Assigning Leads (Managers)", HeadingLevel.HEADING_3),
        para("Managers assign Recovery agents in two ways:"),
        numbered(
          "On the Recovery Team table — use the Assigned To dropdown in each row"
        ),
        numbered(
          "On Customer Detail — use the Assigned Recovery Agent dropdown in Actions"
        ),
        para(
          "Unassigned leads are visible to managers. Assign them before agents can work them."
        ),

        heading("8.3 Logging Recovery Calls", HeadingLevel.HEADING_3),
        numbered("Open the customer from Recovery Team"),
        numbered('Click "Log Call"'),
        numbered(
          'Select a result — "Rescheduled" is the primary success outcome'
        ),
        numbered("Add notes (new install date, customer availability, etc.)"),
        numbered("Save the call"),
        para("Recovery-specific options:"),
        bullet(
          'Reschedule Install — opens the call log pre-filled with "Rescheduled"'
        ),
        bullet(
          'Quick log: Rescheduled — one-click log when the appointment is already confirmed'
        ),
        bullet(
          "3-way call with Senior Sales — check this box when a senior joins the call to help close the sale (for commission tracking)"
        ),
        bullet(
          "When 3-way is checked, select which senior assisted from the dropdown"
        ),

        heading("8.4 3-Way Calls", HeadingLevel.HEADING_3),
        para(
          "When a trainee Recovery agent adds a Senior Sales rep on a 3-way call to close a sale:"
        ),
        numbered('Log the call as usual'),
        numbered('Check "3-way call with Senior Sales"'),
        numbered("Select the senior who assisted"),
        numbered("Save"),
        para(
          "The call history shows a 3-way badge with the senior's name. This supports commission tracking."
        ),

        heading("8.5 Price Approval & ISP Complaints", HeadingLevel.HEADING_3),
        para("If the customer needs a price break or has an ISP issue:"),
        numbered('Log Call → select "Price Approval Needed" or "ISP Complaint"'),
        numbered("Add details in notes"),
        para("This creates an alert for management on the Alerts page."),

        heading("9. Customer Detail Page", HeadingLevel.HEADING_2),
        para(
          "Every customer has a detail page with full information and actions. Open it by clicking a customer name from any table."
        ),
        para("Left side — information panels:"),
        bullet("Customer Information (name, phone, address, ISP data from import)"),
        bullet("Workflow Status (team, assigned agent, stage, alerts, outcome)"),
        bullet("Call Log History (all past calls with agent, result, 3-way info)"),
        bullet("Notes (free-text notes from any team member)"),
        bullet("Activity Timeline (automatic log of changes and calls)"),
        para("Right side — Actions panel:"),
        bullet("Log Call"),
        bullet("Reschedule Install / Quick log (Recovery customers)"),
        bullet("Move to Recovery Team (after 3 Senior Sales attempts)"),
        bullet("Assigned Recovery Agent (managers)"),
        bullet("Manual field updates: team, stage, transfer status, alerts, outcome"),
        bullet("Follow-up date"),
        bullet("Add Note"),

        heading("10. Alerts Page", HeadingLevel.HEADING_2),
        para("Who: Admin and Manager"),
        para("Where: Alerts page"),
        para("Alerts appear when a call is logged with:"),
        bullet("ISP Complaint"),
        bullet("Price Approval Needed"),
        para("Management workflow:"),
        numbered("Review the alert on the Alerts page"),
        numbered("Send required email to the ISP (outside the CRM)"),
        numbered('Update alert status: Needs Email → Email Sent → In Review → Resolved'),
        numbered("For price requests: Approve or Deny"),
        numbered("Notify the Recovery agent of the decision"),
        numbered("Agent calls the customer back to close or explain"),

        heading("11. ISPs Page", HeadingLevel.HEADING_2),
        para("Who: Admin and Manager"),
        para("Manage the list of ISPs used when importing customer files."),
        numbered("Add new ISP names before importing their files"),
        numbered("Edit or deactivate ISPs as needed"),
        para("Each import must be linked to one ISP record."),

        heading("12. Users Page (Admin Only)", HeadingLevel.HEADING_2),
        para("Who: Admin"),
        para("Manage who can access the CRM:"),
        numbered("View all registered users"),
        numbered("Approve new signups (activate the account)"),
        numbered("Change roles: admin, manager, senior_sales, or recovery"),
        numbered(
          "Team is set automatically from role — Recovery role goes to Recovery Team; all other roles go to Senior Sales Team"
        ),
        numbered("Deactivate users who should no longer access the system"),

        heading("13. Profile Page", HeadingLevel.HEADING_2),
        para("Everyone can update their own profile:"),
        bullet("Full name"),
        bullet("Profile photo (avatar)"),
        bullet("Password change"),
        para("Click your avatar in the top-right header → Profile."),

        heading("14. Call Results Reference", HeadingLevel.HEADING_2),
        table(
          ["Call Result", "When to Use"],
          [
            ["No Answer", "Phone rang, nobody picked up"],
            ["Left Voicemail", "You left a voicemail message"],
            ["Customer Answered", "Spoke with the customer (general)"],
            ["Callback Requested", "Customer asked to be called back later"],
            [
              "Rescheduled",
              "Install appointment rescheduled (primary Recovery success)",
            ],
            ["New Account Created", "Customer signed up for a new account"],
            ["Not Interested", "Customer declined — close the lead"],
            ["Wrong Number", "Phone number is incorrect"],
            ["Do Not Call", "Customer requested no further contact"],
            ["ISP Complaint", "Customer has an issue with the ISP — creates alert"],
            [
              "Price Approval Needed",
              "Customer wants a discount — creates management alert",
            ],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("15. Workflow Stages Reference", HeadingLevel.HEADING_2),
        table(
          ["Stage", "Meaning"],
          [
            ["New", "Just imported, no calls yet"],
            ["Attempt 1 / 2 / 3", "Senior Sales call attempts"],
            ["Recovery Needed", "Flagged for Recovery handoff"],
            ["In Recovery", "Active on Recovery Team"],
            ["Callback Requested", "Customer wants a return call"],
            ["Rescheduled", "Install appointment set"],
            ["New Account Created", "Customer re-signed"],
            ["Closed", "Lead finished (not interested, DNC, etc.)"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("16. Key Business Rules", HeadingLevel.HEADING_2),
        bullet("One master database — no duplicate records between teams"),
        bullet("Senior Sales gets 3 call attempts before Recovery handoff"),
        bullet("Recovery does not automatically return leads to Senior Sales"),
        bullet("Primary Recovery goal: reschedule the install appointment"),
        bullet("Managers assign Recovery leads to specific agents"),
        bullet("3-way calls with seniors are logged for commission tracking"),
        bullet("ISP complaints and price requests go to Alerts for management"),
        bullet("Every call, note, and field change is tracked in the activity log"),

        heading("17. Quick Daily Checklist", HeadingLevel.HEADING_2),
        heading("Senior Sales Agent", HeadingLevel.HEADING_3),
        numbered("Check Dashboard for new imports"),
        numbered("Open Senior Sales Team — work your leads"),
        numbered("Log every call with result and notes"),
        numbered("Move to Recovery after 3 unsuccessful attempts"),

        heading("Recovery Agent", HeadingLevel.HEADING_3),
        numbered("Open Recovery Team — review your assigned leads"),
        numbered("Call customers to reschedule installs"),
        numbered("Log calls — use Rescheduled when successful"),
        numbered("Flag price/ISP issues for management"),
        numbered("Use 3-way call option when a senior helps close"),

        heading("Manager / Admin", HeadingLevel.HEADING_3),
        numbered("Import new ISP files as they arrive"),
        numbered("Assign Recovery leads to agents"),
        numbered("Review and resolve Alerts"),
        numbered("Monitor Dashboard for team performance"),
        numbered("Approve new user signups (admin)"),

        heading("18. Need Help?", HeadingLevel.HEADING_2),
        para(
          "For a step-by-step walkthrough of one customer from import to close, see the companion document: ISP_CRM_Example_Scenario.docx"
        ),
        para(
          "Generate updated guides anytime by running: node scripts/generate-user-guide-docx.mjs"
        ),
      ],
    },
  ],
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outputPath, buffer);
console.log(`Created: ${outputPath}`);
