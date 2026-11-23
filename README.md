# Asset Management · Angels Resource Centres

The live version of the Asset Management module (QMS-05): request equipment, approvals, the Payment Request flow, receiving, PCZEN preparation, courier handover with e-signature, the asset register, incidents, the training and marketing store, deliveries and collections, donations, the monthly KPI report, and admin.

It is a React app (Vite) with a Supabase database. Sign-in is by an emailed link. Without a database connected it runs as a **demo** in the browser with sample data.

| | |
| --- | --- |
| Process documents | QMS-05 set (policy, SOP, WF-01 to WF-05, FRM-01 to FRM-08, REG-01, REG-02, GUI-01 to GUI-05) |
| Design | Asset Management design canvas (19 screens) |
| Build specification | *Asset Management Module — Development Briefing* |

---

## Setting it up (about 30 minutes, no coding)

You need three free accounts: **GitHub** (stores the code), **Supabase** (the online database) and **Vercel** (puts the website online). Sign up for Vercel with your GitHub account.

### 1. Create the database in Supabase

1. Go to [supabase.com](https://supabase.com), sign in and click **New project**.
   - Name: `angels-asset-management`
   - Database password: create a strong one and keep it safe.
   - Region: choose the one closest to South Africa that is offered. *POPIA: this stores staff names and equipment records outside South Africa. Confirm with the Information Officer that this is acceptable (POPIA section 72) before you load real data.*
2. When the project is ready, open **SQL Editor → New query**.
3. Open `supabase/schema.sql` from this folder, copy all of it, paste it into the query window and click **Run**. You should see *Success*.
4. Do the same with `supabase/seed.sql` (settings, department contacts and the store items).
5. Go to **Authentication → Sign In / Providers** and check that **Email** is on. Turn **Confirm email** on.
6. Go to **Project Settings → API** and copy two values for step 3:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long text starting with `eyJ`)

   The anon key is safe in a website: the database rules (row level security) decide what each person may see and do. **Never** use the `service_role` key in the app.

### 2. Put the code on GitHub

1. On [github.com](https://github.com), click **New repository**. Name it `angels-asset-management`, choose **Private**, and click **Create repository**.
2. Click **uploading an existing file**, drag in **everything inside** this folder (not the folder itself, and not `node_modules`), and click **Commit changes**.
   *Or use GitHub Desktop: File → Add local repository → choose this folder → Publish repository.*

### 3. Put it online with Vercel

1. On [vercel.com](https://vercel.com), click **Add New → Project** and import `angels-asset-management`.
2. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
3. Click **Deploy**. After about a minute you get a web address such as `https://angels-asset-management.vercel.app`.
4. Back in Supabase, go to **Authentication → URL Configuration**:
   - **Site URL**: your Vercel address
   - **Redirect URLs**: add the same address

*(Prefer GitHub Pages? The workflow in `.github/workflows/deploy-pages.yml` does the same: add the two values under Settings → Secrets and variables → Actions → **Variables**, then Settings → Pages → Source: **GitHub Actions**.)*

### 4. Make yourself the Asset Coordinator

1. Open your Vercel address, type your Angels email address and click **Email me a sign-in link**. Click the link in the email.
2. In Supabase → SQL Editor, run (with your own email address):

   ```sql
   update public.profiles
   set roles = '{staff,asset_coordinator,dept_contact}', full_name = 'Your Name', job_title = 'Operations and Programme Systems Coordinator', department = 'Operations'
   where email = 'your.email@angels...';
   ```
3. Refresh the website. You now see **Admin**.

### 5. Add everyone

Ask each person to sign in once with their Angels email address. They then appear under **Admin → People and roles**, where you set their department, line manager and roles:

| Person | Roles to tick |
| --- | --- |
| Everyone | Staff |
| Line managers and HODs | Line manager |
| Anton | Factotum, Department asset contact |
| Annemarie | Asset Coordinator, Department asset contact |
| Brent | Head of Operations and Systems, Line manager, Department asset contact |
| Jessica | Bookkeeper |
| Gerald | Head of Finance, Line manager |
| Lizelle | CEO |
| Jim | Board Treasurer |
| Information Officer | Information Officer |
| Jordan, Juliana, Melissa, Abongile (and backups) | Department asset contact |
| HR team | HR |

Then link the contacts under **Admin → Department contacts**, and check the **Settings** (CEO limit, PCZEN turnaround, and so on).

---

## Trying it without a database (demo)

Leave the two Vercel variables empty (or run it on your computer without a `.env.local` file). You choose who you are from a list (Thandi, Abongile, Anton, Annemarie, Jessica, Gerald…) and can walk a request all the way from asking to signing. The data stays in that browser only; **Reset demo** starts again.

To run it on your own computer (needs [Node.js](https://nodejs.org) 20 or later):

```bash
npm install
npm run dev        # opens on http://localhost:5173
```

---

## How it works

| Step | Who | Where in the app |
| --- | --- | --- |
| Ask for equipment | Staff, or HR for a new starter | Home → New request |
| Approve the need | Line manager (budget holder too if client-funded) | My approvals |
| Technical check: repair, stock or buy | Anton | Request → Your step |
| Quotes and Payment Request | Anton | Request → Your step |
| Pre-approval and budget check | Annemarie with Brent | Request → Payment Request |
| Compliance check, then final check | Jessica, then Gerald (CEO above the limit) | Payment Requests |
| Order, receive and register | Anton | Request → Your step |
| PCZEN preparation and return check | Anton | Request → Your step |
| Pre-handover check and courier | Anton | Request → Your step |
| Confirm receipt and sign | Staff member, then Anton, then Annemarie | Request → Sign; form locks |

The database enforces the main rules from the briefing, so they cannot be skipped. Among them:

- nobody approves their own request;
- only the right role can pre-approve, check compliance or give the final approval, in that order;
- the order unlocks only after Finance approves;
- the handover form is signed in order (staff member, Anton, Annemarie) and is locked once complete;
- the same store item cannot be double-booked, and client-branded items are only for that client;
- theft needs a police case number, and reports older than 24 hours are flagged as late;
- items that have left Angels keep their final status;
- every change is written to an append-only audit log.

## What is still a stand-in

| Item | Now | Later (Brent) |
| --- | --- | --- |
| Finance Management | The Bookkeeper and Head of Finance steps run on the Payment Requests screen in this app | Link to the Finance Management Payment Request (briefing section 8) |
| Notifications | In-app (Notifications page and counters) | Teams and email through a Supabase Edge Function |
| Sign-in | Emailed link | Microsoft (Entra ID) sign-in: Supabase → Authentication → Providers → Azure |
| PCZEN | "Email PCZEN" button on lost or stolen incidents; ticket numbers typed in | API if PCZEN offers one |
| Handover PDF | Print / Save as PDF from the form page; SHA-256 integrity code stored | Server-side PDF with the hash |
| Working days | Weekends and the public holidays in `src/lib/util.js` | A holiday table in settings |

## Project structure

```
supabase/schema.sql    tables, reference numbers, rules, audit log, security
supabase/seed.sql      settings, department contacts, store items
src/lib/db.js          Supabase connection, and the demo store
src/lib/lists.js       drop-down lists, roles, conditions of use
src/pages/             one file per screen
```

Questions about the process: the Asset Coordinator. Questions about the code: the Head of Operations and Systems.
