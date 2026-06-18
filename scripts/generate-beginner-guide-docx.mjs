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
  "ISP_CRM_Client_Step_by_Step_Guide.docx"
);

const generated = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ text, heading: level, spacing: { after: 200 } });
}

function para(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun(text)],
  });
}

function boldPara(label, text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: label, bold: true }),
      new TextRun(text),
    ],
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

function tip(text) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: "TIP: ", bold: true, italics: true }),
      new TextRun({ text, italics: true }),
    ],
  });
}

function warning(text) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: "IMPORTANT: ", bold: true }),
      new TextRun(text),
    ],
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
        heading("ISP Recovery CRM — Client Step-by-Step Guide"),
        para(
          "This guide is written for new users who have never used this CRM before. Every section tells you exactly where to click, what you will see, and what happens next. Read the section that matches your job role."
        ),
        para(`Generated: ${generated}`),

        // ─── PART 0: BASICS ───
        heading("Part 1 — Understand the Basics (Read This First)", HeadingLevel.HEADING_2),

        heading("1.1 What is this app?", HeadingLevel.HEADING_3),
        para(
          "ISP Recovery CRM is a website your team uses in a web browser (Chrome, Edge, etc.). It stores customer records from ISP spreadsheets and tracks every text, call, and status change."
        ),
        para("Think of it as one shared notebook for the whole company:"),
        bullet("Each customer has ONE record (never duplicated)"),
        bullet("Customers move through teams: Junior Sales → Senior Sales → Recycle Hold"),
        bullet("Every action is logged so managers can see who did what"),

        heading("1.2 The customer journey (simple picture)", HeadingLevel.HEADING_3),
        para("Import file → Junior texts customer (up to 3 tries) →"),
        para("  • Customer wants a phone call? → Senior Sales (manager assigns a senior rep)"),
        para("  • No reply after 3 texts? → Recycle Hold for 30 days (manager only)"),
        para("  • Customer says not interested? → Closed"),
        para("Senior rep calls → Rescheduled or New Account Created or Closed"),

        heading("1.3 Words you will see on screen", HeadingLevel.HEADING_3),
        table(
          ["Word on screen", "Plain English meaning"],
          [
            ["Assigned Team", "Which queue the customer is in right now (Junior, Senior, or Recycle)"],
            ["Workflow Stage", "How far along outreach is (New, Attempt 1, Closed, etc.) — set automatically when you log"],
            ["Transfer Status", "Extra flag (e.g. waiting for manager to assign a senior rep)"],
            ["Assigned To", "Which SENIOR rep owns the lead — only used on Senior Sales Team"],
            ["Attempt #", "How many texts or calls have been logged so far"],
            ["Outcome", "Final result (Pending, Rescheduled, Closed, New Account Created)"],
            ["ISP tab", "Filter the table to one internet provider (Comcast, HBC, etc.)"],
            ["Primary column", "The main name column you click to open a customer"],
            ["Match key", "Account # or phone used to find duplicates on import"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        warning(
          "Junior Sales leads are NOT assigned to individual junior reps. All juniors share the same Junior Sales list. Only Senior Sales leads get an Assigned To person (manager picks the senior rep)."
        ),

        heading("1.4 What the screen looks like", HeadingLevel.HEADING_3),
        boldPara("Left side — blue sidebar: ", "Menu links (Dashboard, Junior Sales Team, etc.). Click a link to change pages."),
        boldPara("Top — header bar: ", "Shows your name and photo. Click your photo → Profile or Sign Out."),
        boldPara("Main area — center: ", "Tables, forms, and customer details."),
        tip("If you do not see a menu item, your role does not have access. Ask your admin to check your role on the Users page."),

        heading("1.5 Login and first-time setup", HeadingLevel.HEADING_3),
        numbered("Open your CRM website URL in the browser"),
        numbered("Enter email and password → click Sign In"),
        numbered("New user? Click Sign Up, then wait — an admin must approve you before you can work"),
        numbered("Forgot password? Click Forgot Password on the login page"),
        para("After login, juniors only see Dashboard + Junior Sales Team. Seniors only see Dashboard + Senior Sales Team. Managers and admins see more menu items."),

        // ─── PART 2: MANAGER/ADMIN SETUP ───
        heading("Part 2 — Manager / Admin: Set Up Before Anyone Works", HeadingLevel.HEADING_2),
        para("Do these steps ONCE per ISP before importing customers."),

        heading("2.1 Add the ISP", HeadingLevel.HEADING_3),
        numbered("Sidebar → ISPs"),
        numbered('Click the "Add ISP" button'),
        numbered('Type the ISP name exactly how your team knows it (example: "HBC", "Comcast")'),
        numbered("Save"),
        para('You should now see the ISP in the list with buttons: Columns, View CRM, Edit'),

        heading("2.2 Add columns (required — import will fail without this)", HeadingLevel.HEADING_3),
        numbered('On the ISPs page, click "Columns" on that ISP row'),
        numbered("A dialog opens. For each column in your spreadsheet, add a row:"),
        bullet('Column name — type the header from Excel exactly (example: "Name", "ACCT#", "Number")'),
        bullet('Check "Primary" on ONE column — usually Name (this is what you click in tables)'),
        bullet('Check "Use for duplicate matching" on ONE column — usually ACCT# or Phone (stops duplicate customers on re-import)'),
        numbered('Click "Add" for each column row'),
        numbered('When all columns are listed, click "Save Columns"'),
        warning(
          "If column names do not match the spreadsheet headers, import mapping will be wrong. Copy names from row 1 of your Excel file."
        ),

        heading("2.3 Import the customer file", HeadingLevel.HEADING_3),
        numbered("Sidebar → Import Customers"),
        numbered("Step 1: Choose the ISP from the dropdown"),
        numbered('Step 2: Click "Choose File" and select your .xlsx or .csv file'),
        numbered("Step 3: Check the column mapping — each spreadsheet column should map to your CRM column"),
        numbered('Step 4: Click "Preview" — you should see the first 20 rows filled in correctly'),
        numbered('Step 5: Click "Confirm Import"'),
        para("On the summary screen you will see:"),
        bullet("New — brand-new customers added"),
        bullet("Updated — existing customers matched by account/phone; spreadsheet data refreshed"),
        bullet("Re-initialized — customers who were already Closed or New Account Created start over on Junior Sales as New"),
        bullet("Errors — rows that failed (fix the file and import again)"),
        tip("After import, juniors open Junior Sales Team → select the ISP tab → customers appear with stage New and 0 attempts."),

        heading("2.4 Approve new users (Admin only)", HeadingLevel.HEADING_3),
        numbered("Sidebar → Users"),
        numbered("Find users with inactive / pending status"),
        numbered("Activate the account and set the correct role: admin, manager, junior_sales, or senior_sales"),
        numbered("Save"),
        para("Junior role → works Junior Sales Team. Senior role → works Senior Sales Team only after manager assigns leads."),

        // ─── PART 3: JUNIOR ───
        heading("Part 3 — Junior Sales: Your Daily Steps", HeadingLevel.HEADING_2),
        para("Your job: send texts to customers on the Junior Sales list. You log every text in the CRM. You do NOT assign leads to yourself — everyone on the team shares the same list."),

        heading("3.1 Open your work list", HeadingLevel.HEADING_3),
        numbered("Sidebar → Junior Sales Team"),
        numbered("At the top, click the ISP tab (example: HBC) — only customers for that ISP show"),
        numbered("Use the search box to find a name or phone"),
        numbered("Click the customer name (blue link) in the first column — the customer detail page opens"),

        heading("3.2 Log a text (every time you text a customer)", HeadingLevel.HEADING_3),
        numbered("On the customer detail page, look at the right side — the Actions card"),
        numbered('Click the blue "Log Text" button'),
        numbered("A popup opens titled Log Text — Customer Name (Attempt #X)"),
        numbered('Open the "Text Result" dropdown and pick what happened'),
        numbered("Type notes (example: Sent intro text, no reply yet)"),
        numbered('Click "Log Text" at the bottom to save'),
        warning(
          "You must log every text. If you forget, the attempt count and stage will be wrong and the customer may not move to Recycle Hold when they should."
        ),

        heading("3.3 Which Text Result should I pick?", HeadingLevel.HEADING_3),
        table(
          ["Pick this result", "When this happened", "What the CRM does next"],
          [
            ["No Text Reply", "You texted; customer did not answer", "Attempt goes up (1, 2, 3). After 3rd No Text Reply → auto moves to Recycle Hold"],
            ["Simple Reschedule", "Customer texted back a new date — confirmed by text only", "Stays on Junior Sales. Stage becomes Rescheduled"],
            ["Call Requested", "Customer wants someone to CALL them", "Moves to Senior Sales. Manager must assign a senior rep"],
            ["Reschedule by Phone", "Customer needs a phone call to reschedule", "Moves to Senior Sales. Manager must assign a senior rep"],
            ["ISP Complaint", "Customer has a problem with the ISP", "Alert for manager + moves to Senior Sales"],
            ["Price Approval Needed", "Customer wants a better price", "Alert for manager + moves to Senior Sales"],
            ["Not Interested", "Customer said no", "Lead Closed — finished"],
            ["Wrong Number", "Bad phone number", "Lead Closed — finished"],
            ["Do Not Call", "Customer said stop contacting them", "Lead Closed — finished"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("3.4 Example: texting with no reply three times", HeadingLevel.HEADING_3),
        numbered("Day 1: Log Text → No Text Reply → stage becomes Attempt 1"),
        numbered("Day 2: Log Text → No Text Reply → stage becomes Attempt 2"),
        numbered("Day 3: Log Text → No Text Reply → stage becomes Attempt 3, then customer DISAPPEARS from your list"),
        para("That customer is now in Recycle Hold. Only managers see them. You do nothing else — the system moved them automatically."),

        heading("3.5 Example: customer wants a call", HeadingLevel.HEADING_3),
        numbered("Customer texts: Please call me tomorrow"),
        numbered("Log Text → Call Requested → add note with time they want"),
        numbered("Customer disappears from Junior Sales list"),
        numbered("Tell your manager — they must assign a senior rep on Senior Sales Team page"),
        tip("After logging Call Requested, you may be redirected back to the Junior Sales list automatically."),

        heading("3.6 What juniors CANNOT do", HeadingLevel.HEADING_3),
        bullet("Cannot assign customers to yourself or another junior"),
        bullet("Cannot change Team or Stage manually (chips on the page are read-only)"),
        bullet("Cannot see Senior Sales, Recycle Hold, Import, or Alerts (unless you are also a manager)"),
        bullet("Cannot log a Call — only Log Text on Junior Sales leads"),

        // ─── PART 4: MANAGER ASSIGN SENIOR ───
        heading("Part 4 — Manager: Assign Senior Reps", HeadingLevel.HEADING_2),
        para("When a junior logs Call Requested, Reschedule by Phone, ISP Complaint, or Price Approval Needed, the customer moves to Senior Sales Team with Assigned To = Unassigned. You must assign a senior rep."),

        heading("4.1 Assign from the Senior Sales table", HeadingLevel.HEADING_3),
        numbered("Sidebar → Senior Sales Team"),
        numbered("Select the ISP tab"),
        numbered('Use filter "Assigned To" → Unassigned to see only leads needing assignment'),
        numbered("In the Assigned To column, open the dropdown on that row"),
        numbered("Pick the senior rep who will call this customer"),
        para("The senior rep will now see this customer on their Senior Sales Team page."),

        heading("4.2 Assign from customer detail (alternative)", HeadingLevel.HEADING_3),
        numbered("Open the customer (click their name)"),
        numbered("On the Actions card (right side), find Assigned Senior Sales Rep"),
        numbered("Choose the senior from the dropdown — saves automatically"),
        warning(
          "Assigned To only appears for Senior Sales Team customers. Junior Sales and Recycle Hold show a dash (—) — you cannot assign individuals there."
        ),

        // ─── PART 5: SENIOR ───
        heading("Part 5 — Senior Sales: Your Daily Steps", HeadingLevel.HEADING_2),
        para("You only see customers assigned TO YOU by a manager. If your list is empty, ask the manager to assign escalations from Senior Sales Team."),

        heading("5.1 Open your assigned leads", HeadingLevel.HEADING_3),
        numbered("Sidebar → Senior Sales Team"),
        numbered("Select ISP tab"),
        numbered("Click customer name to open detail"),

        heading("5.2 Log a call", HeadingLevel.HEADING_3),
        numbered('Actions card → click "Log Call"'),
        numbered("Pick Call Result from dropdown"),
        numbered("Add notes (callback time, new install date, etc.)"),
        numbered('Click "Log Call" to save'),

        heading("5.3 Which Call Result should I pick?", HeadingLevel.HEADING_3),
        table(
          ["Pick this result", "When this happened", "What happens"],
          [
            ["No Answer / Left Voicemail / Customer Answered", "Routine call attempt", "Attempt count goes up; lead stays open"],
            ["Callback Requested", "Customer wants another call later", "Stage = Callback Requested"],
            ["Rescheduled", "Install date confirmed", "Stage = Rescheduled"],
            ["New Account Created", "Customer signed up — SUCCESS", "Stage = New Account Created — lead finished"],
            ["Not Interested / Wrong Number / Do Not Call", "Customer done — negative", "Stage = Closed — lead finished"],
            ["ISP Complaint / Price Approval Needed", "Needs management", "Alert created for manager — lead NOT finished yet"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("5.4 Finish a lead (how to close it)", HeadingLevel.HEADING_3),
        para("There is NO separate Close button. To finish:"),
        numbered("Log Call with New Account Created (success) OR Not Interested / Wrong Number / Do Not Call (closed)"),
        para("Workflow Stage chip on the customer page will change to New Account Created or Closed."),

        heading("5.5 Reschedule shortcuts", HeadingLevel.HEADING_3),
        numbered('"Reschedule Install" — opens Log Call with Rescheduled pre-selected'),
        numbered('"Quick log: Rescheduled" — one-click log if you already confirmed the date'),
        numbered("Set Follow-up Date in Actions if you need a reminder date on the record"),

        // ─── PART 6: ALERTS ───
        heading("Part 6 — Manager: Alerts Page (Complaints & Price Approval)", HeadingLevel.HEADING_2),
        warning(
          "Resolving an alert does NOT close the customer. It only means you handled the ISP email or price decision. The senior rep still must Log Call to finish the lead."
        ),

        numbered("Sidebar → Alerts (red badge = items needing email)"),
        numbered("Select ISP tab at top"),
        numbered("For each alert row, use buttons in the Actions column:"),
        bullet("Needs Email → click Email Sent (after you email the ISP)"),
        bullet("Email Sent → click In Review"),
        bullet("Price approval → Approve or Deny, then Resolved"),
        bullet("ISP complaint → click Resolved when ISP issue handled"),
        para("Then open the customer on Senior Sales Team and have the senior rep complete the call."),

        // ─── PART 7: RECYCLE ───
        heading("Part 7 — Manager: No Reply — Recycle", HeadingLevel.HEADING_2),
        numbered("Sidebar → No Reply — Recycle"),
        numbered("Customers appear here automatically after 3 No Text Reply logs on Junior Sales"),
        numbered("Each row has a follow-up date (import date + 30 days)"),
        numbered('Filter Ready when 30 days have passed'),
        numbered("Open customer → Actions → Send back to Junior Sales"),
        para("Customer returns to Junior Sales as New with 0 attempts for a fresh text round."),

        // ─── PART 8: CUSTOMER DETAIL TOUR ───
        heading("Part 8 — Customer Detail Page (Full Tour)", HeadingLevel.HEADING_2),
        para("Open any customer by clicking their name in a table."),

        boldPara("Left column — Customer Information: ", "Fields from your ISP spreadsheet (name, phone, account, address, etc.)"),
        boldPara("Workflow Status: ", "Chips for Team, Stage, Transfer Status, Outcome, Alerts — you cannot edit Team/Stage by typing; they change when you Log Text/Call"),
        boldPara("Call Log History: ", "Table of every logged text/call with date, agent, result, notes"),
        boldPara("Notes: ", "Free-text notes any user added via Add Note"),
        boldPara("Activity Timeline: ", "Automatic history (imports, escalations, team moves)"),

        boldPara("Right column — Actions: ", "Log Text or Log Call, assign senior (managers), follow-up date, Add Note"),

        heading("8.1 Add a note without logging a call/text", HeadingLevel.HEADING_3),
        numbered("Actions card → scroll to Add Note"),
        numbered("Type your note → Save Note"),
        para("This does NOT change stage or attempt count. Use Log Text/Log Call for outreach attempts."),

        // ─── PART 9: FAQ ───
        heading("Part 9 — Common Questions & Problems", HeadingLevel.HEADING_2),
        table(
          ["Problem", "What to do"],
          [
            ["Junior Sales table is empty", "Check ISP tab at top — wrong tab selected. Or no import yet. Or all customers escalated/closed/recycled."],
            ["Senior sees zero customers", "Manager has not assigned leads. Go to Senior Sales → filter Unassigned → assign."],
            ["Customer disappeared from Junior list", "They escalated to Senior, moved to Recycle Hold, or were Closed. Check Senior Sales or ask manager."],
            ["Cannot find Log Call button", "Customer is on Junior Sales Team — juniors use Log Text. Seniors see Log Call only on Senior Sales leads assigned to them."],
            ["Log Text / Log Call error after deploy", "Hard refresh browser (Ctrl+Shift+R) or close tab and log in again."],
            ["Import shows 0 new rows", "Rows matched existing customers (Updated). Or wrong ISP selected. Or column mapping wrong."],
            ["Want to assign lead to a junior", "Not supported — juniors share the pool. Only seniors get Assigned To."],
            ["Alert resolved but lead still open", "Expected — resolve alert, then senior Logs Call with final result."],
            ["Re-imported customer back to New", "They were Closed or New Account Created before — system restarted them for a new outreach round."],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        heading("Part 10 — Who Does What (Quick Reference)", HeadingLevel.HEADING_2),
        table(
          ["Task", "Who"],
          [
            ["Create ISP & columns", "Admin / Manager"],
            ["Import spreadsheet", "Admin / Manager"],
            ["Approve users", "Admin"],
            ["Text customers & Log Text", "Junior Sales"],
            ["Assign senior rep", "Manager / Admin"],
            ["Call customers & Log Call", "Senior Sales (assigned leads)"],
            ["Handle Alerts (complaint/price)", "Manager / Admin"],
            ["Send Recycle → Junior Sales", "Manager / Admin"],
            ["View all customers & delete", "Manager / Admin (Master CRM)"],
          ]
        ),
        new Paragraph({ spacing: { after: 200 } }),

        para("Related documents: ISP_CRM_User_Guide.docx (full reference), ISP_CRM_Example_Scenario.docx (story walkthrough), ISP_CRM_Workflow_Reference.docx (what each log result does)."),
        para("Regenerate: npm run docs:beginner-guide"),
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
  } else {
    throw err;
  }
}
