# ISP Recovery CRM

A web-based CRM for ISP customer recovery workflows. Manages ISP customer uploads, Junior/Senior sales teams, No Reply recycle holds, call logging, alerts, and admin visibility.

## Workflow

1. **Junior Sales** — First 3 outreach attempts on imported leads
2. **Senior Sales** — Callback/reschedule escalations (manager assigns reps)
3. **No Reply — Recycle** — Manager-only 30-day hold after 3 no-reply attempts; send back to Junior for another round

## User Roles

| Role | Access |
|------|--------|
| `admin` | Full access |
| `manager` | All pages except Users; assigns Senior reps; manages recycle basket; bulk-assigns junior leads |
| `va_manager` | Dashboard, Junior Sales, Senior Sales, Alerts; assigns senior reps |
| `junior_sales` | Dashboard + Junior Sales Team |
| `senior_sales` | Dashboard + Senior Sales Team (assigned leads) |

## Pages

- Dashboard, Import, Master CRM (admin/manager)
- Junior Sales Team, Senior Sales Team
- No Reply — Recycle (admin/manager)
- Alerts, ISPs, Users, Customer Detail

## Database setup

**One file (recommended):** paste and run `supabase/run_all.sql` in the Supabase SQL editor.

That file combines the full schema plus migrations `009`–`014` (Junior/Senior workflow, Recycle Hold, Recovery removal, data cleanup).

**Or run individually:** `009` → `010` → `011` → `012` → `013` → `014` in `supabase/migrations/`.

## Docs

Single user guide (Word):

```bash
npm run docs:user-guide
```

Or remove old copies and regenerate:

```bash
npm run docs:finalize
```

Output: `docs/ISP_CRM_User_Guide.docx`
