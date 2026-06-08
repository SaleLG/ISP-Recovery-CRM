# ISP CRM

A web-based Recovery CRM for ISP customer recovery workflows. Manages ISP customer uploads, Senior Sales and Recovery team workflows, call logging, alerts, and admin visibility.

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Supabase** (Database, Auth, RLS)
- **Material UI** (blue primary theme)
- **xlsx** (Excel/CSV parsing)

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon key** from Settings → API.
3. Also copy the **service_role key** (needed for admin user creation only — never expose to client).

### 2. Run the Database Schema

1. Open the Supabase SQL Editor.
2. Copy and paste the entire contents of `supabase/schema.sql`.
3. Run the script. This creates all tables, indexes, RLS policies, and the auto-profile trigger.

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Configure Supabase Auth Settings

In Supabase Dashboard → **Authentication → URL Configuration**:

1. Set **Site URL** to your production domain (e.g. `https://your-app.netlify.app`)
2. Add **Redirect URLs** (wildcards are supported):
   - `http://localhost:3000/**`
   - `https://your-production-domain.com/**`

In **Authentication → Providers → Email**:

1. **Disable "Confirm email"** — signups do not require email confirmation
2. For production, configure **Custom SMTP** under Authentication → Emails (Supabase's built-in email is rate-limited to ~4/hour)

In **Authentication → Email Templates → Reset Password**, use this template for Next.js SSR (PKCE):

```html
<h2>Reset your password</h2>
<p>We received a request to reset your password. Follow the link below to choose a new one.</p>
<p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Reset password</a></p>
```

Set `NEXT_PUBLIC_SITE_URL` in Netlify (and locally) to your public site origin so password reset links use the correct domain.

### 6. Create the First Admin User

Since there are no users yet, create one via Supabase Dashboard:

1. Go to **Authentication → Users → Add User**.
2. Enter email and password.
3. In **User Metadata**, add:
   ```json
   {
     "full_name": "Eddie Admin",
     "role": "admin",
     "team": "Senior Sales Team",
     "approved": true
   }
   ```
4. The trigger will auto-create a matching `profiles` row.
5. Activate the profile:
   ```sql
   UPDATE profiles SET role = 'admin', is_active = true WHERE email = 'your@email.com';
   ```

**Or** use the **Sign Up** page — then approve yourself in SQL:

```sql
UPDATE profiles SET role = 'admin', is_active = true WHERE email = 'your@email.com';
```

### 7. Seed an ISP (Optional)

```sql
INSERT INTO isps (name) VALUES ('Comcast'), ('Spectrum'), ('AT&T');
```

## Project Structure

```
src/
├── actions/          # Server actions (customers, import, dashboard, etc.)
├── app/
│   ├── (app)/      # Authenticated pages with sidebar layout
│   │   ├── dashboard/
│   │   ├── import/
│   │   ├── customers/
│   │   ├── senior-sales/
│   │   ├── recovery/
│   │   ├── alerts/
│   │   ├── isps/
│   │   └── users/
│   └── login/
├── components/     # UI components (tables, dialogs, charts)
├── lib/            # Utilities (auth, import, workflow, phone normalize)
├── theme/          # MUI theme (blue primary)
└── middleware.ts   # Auth redirect guard
supabase/
└── schema.sql      # Full database schema + RLS
```

## Key Business Rules

| Rule | Implementation |
|------|----------------|
| Single master customer database | One `customers` table, filtered by team in views |
| No record duplication between teams | Team views filter `assigned_team`; transfers update fields |
| Senior Sales: 3 attempts | `call_attempt_number` tracks attempts; stages Attempt 1–3 |
| Auto-flag for recovery after 3 no-answer | `transfer_status = 'Move to Recovery Needed'` |
| Manual move to Recovery | "Move to Recovery Team" button on customer detail |
| Recovery never auto-returns to Senior Sales | No automatic reverse transfer logic |
| Duplicate prevention on import | Match: isp+account → isp+phone → isp+name+address |
| Email alerts | `alert_status = 'Needs Email'` for ISP Complaint / Price Approval |
| Price approval | Only admin/manager can approve/deny on Alerts page |

## User Roles & Access

| Role | Access |
|------|--------|
| `admin` | Full access to all pages and records |
| `manager` | All pages except Users; can approve prices |
| `senior_sales` | Dashboard + Senior Sales Team view |
| `recovery` | Dashboard + Recovery Team view |

## Pages

1. **Login** — Supabase email/password auth
2. **Dashboard** — Stat cards + bar charts
3. **Import Customers** — Excel upload, column mapping, preview, confirm
4. **Master CRM** — Full customer table with search/filters (admin/manager)
5. **Senior Sales Team** — Filtered view for first 3 call attempts
6. **Recovery Team** — Filtered view for recovery follow-up
7. **Customer Detail** — Full info, call log, notes, activity timeline, actions
8. **Alerts** — Management review for complaints and price approvals
9. **ISPs** — CRUD for ISP records
10. **Users** — Admin user management

## Import Flow

1. Select ISP and upload Excel/CSV file
2. System auto-maps known ISP columns (Status, Name, Number, ACCT#, etc.)
3. Manually adjust column mapping if needed
4. Preview first 20 rows
5. Confirm import — creates new or updates existing customers
6. Summary shows new/updated/skipped/error counts

## Deployment

```bash
npm run build
npm start
```

Deploy to Vercel and set the same environment variables in the Vercel dashboard.
