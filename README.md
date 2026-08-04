# Innovation Lab · Access Dashboard

A React + Appwrite dashboard that imports biometric door-reader CSV exports,
saves every scan to an Appwrite database, and shows attendance/traffic stats.

## 🚀 Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure Appwrite** — see [Appwrite setup](#-appwrite-setup) below. You must
   create the database + table once in the console, then paste the IDs into `.env`.
3. **Run the app**
   ```bash
   npm run dev
   ```
4. Open the app, drag the `formatted_access_logs_*.csv` files onto the import panel,
   confirm each file's reader (entry/exit), and click **Import to Appwrite**.

## 🔧 Appwrite setup

The browser SDK can create rows but **cannot create a database or table schema** —
that's an admin action. Do this once in the [Appwrite console](https://cloud.appwrite.io):

### 1. Create the database

- **Databases → Create database**
- Name: `Access Reports`  ·  **Database ID:** `access_reports`

### 2. Create the table

- Inside that database: **Create table**
- Name: `Access Logs`  ·  **Table ID:** `access_logs`

> The IDs above must match `VITE_APPWRITE_DB_ID` and `VITE_APPWRITE_TABLE_ID` in
> `.env`. Use different IDs if you like — just keep the two in sync.

### 3. Add these columns (attributes)

| Key            | Type    | Size | Required | Notes                          |
| -------------- | ------- | ---- | -------- | ------------------------------ |
| `date`         | String  | 10   | ✅       | `YYYY-MM-DD`                   |
| `time`         | String  | 8    | ✅       | `HH:MM:SS`                     |
| `event`        | String  | 64   | ✅       | e.g. `Access granted`          |
| `personId`     | String  | 32   | ❌       | the reader's `Id` column       |
| `personName`   | String  | 128  | ✅       | the `Name` column              |
| `registration` | String  | 64   | ❌       |                                |
| `portal`       | String  | 64   | ❌       |                                |
| `reader`       | String  | 16   | ✅       | `inside` (entry) / `outside` (exit) |
| `source`       | String  | 256  | ❌       | original filename              |
| `hour`         | Integer | —    | ❌       | 0–23, used for the hourly chart |

### 4. Set permissions (table → Settings → Permissions)

For quick local/dev use, grant role **Any**: `Create`, `Read`, `Delete`.
(These let the anonymous browser client insert, load, and clear rows. For production,
put the app behind Appwrite auth and scope permissions to a team/user instead.)

### 5. Fill in `.env`

```env
VITE_APPWRITE_ENDPOINT   = "https://fra.cloud.appwrite.io/v1"
VITE_APPWRITE_PROJECT_ID = "6a718c40003619684e62"
VITE_APPWRITE_DB_ID      = "access_reports"
VITE_APPWRITE_TABLE_ID   = "access_logs"
```

Restart `npm run dev` after editing `.env`. The warning banner disappears once the
IDs resolve.

## ⚡ Optional: scripts (server-side, needs an API key)

The browser SDK can only create **one row per request**, so large imports are
slow. Two Node scripts use the Appwrite **server** SDK for speed. They read
credentials from `.env` (`API_ENDPOINT`, `API_SECRETE` + the `VITE_*` values) —
add an API key with **Databases** scopes as `API_SECRETE`.

```bash
# Create the table + all columns + permissions automatically (idempotent):
node scripts/setup-table.mjs

# Bulk-import CSVs (500 rows/request — seconds instead of minutes):
node scripts/bulk-import.mjs "path/to/inside.csv" "path/to/outside.csv"
```

Reader (inside/outside) is auto-detected from each filename; override by
appending `:inside` or `:outside` to a path. Both scripts are idempotent —
re-running skips rows/columns that already exist.

> 🔐 `API_SECRETE` is **not** `VITE_`-prefixed, so Vite never ships it to the
> browser. `.env` is git-ignored. Rotate/delete the key when you're done.

## 📊 What the dashboard shows

Four pages (tab navigation):

- **Overview** — KPIs (total scans, unique people, entries vs exits, unidentified,
  busiest day, peak hour, avg scans/day, most active), daily & hourly charts, a
  top-people leaderboard, and a searchable/paginated access-log table.
- **People** — a searchable/sortable roster; click anyone for a full **individual
  performance profile**: attendance rate, on-time rate, avg arrival & departure time,
  avg time on site, early departures, earliest/latest arrival, longest streak,
  entry/exit balance, activity-over-time and day-of-week charts, and recent activity.
- **Attendance** — measured against the working-hours rules: **absentees per working
  day** (holidays auto-excluded), on-time vs late (by 08:30), early-leavers (vs 16:00,
  Fri 13:00), an attendance matrix (people × days, on-time/late/absent), a punctuality
  table, and weekend workers.
- **Trends** — busiest/quietest weekday, an **hour × weekday heatmap**, scans by day of
  week, weekly volume, and entries-vs-exits over time.
- **Anomalies** — unidentified scans and **entry/exit imbalances** (people who enter but
  never scan out, or vice-versa — likely missed scans).

## 🧑‍🤝‍🧑 Identity merging (same person, different names)

The two readers are enrolled independently, so one person can be recorded under
slightly different names on each machine (e.g. **Thandazani** on the entry reader,
**Thandaza** on the exit reader). Identity is therefore keyed on the **name**, never
the ID — the same `personId` means *different people* on the two machines.

Merge rules live in [src/lib/names.js](src/lib/names.js):

```js
export const NAME_ALIASES = {
  thandazani: "Thandaza",
  "mr motsilili": "Phomolo",
};
```

Add `"variant (lowercase)": "Canonical Name"` pairs to merge more people. Matching is
case-insensitive and ignores extra spaces (so `"Dr  Mutanga"` and `"Dr Mutanga"` merge
with no rule). Changes apply instantly on the existing data — no re-import needed.

> Tip: the **Anomalies** page helps you find missing rules. Before these two aliases,
> Thandazani showed 164 entries / 0 exits and Thandaza 0 / 138 — a person appearing on
> only one reader is the classic sign of an unmatched name.

## 🔐 Admin lock (import area)

The import / "clear data" controls are hidden behind a lightweight login in
[src/lib/auth.js](src/lib/auth.js):

```js
export const AUTH_USERNAME = "admin";      // <-- your username
export const AUTH_PATTERN  = [4, 6, 8, 2]; // <-- tap these objects, in order
```

To unlock, a user clicks **Unlock**, types the username, then taps 4 of the 10
objects (the "maze") in the exact order of `AUTH_PATTERN`. The default pattern is
🔥 → 💎 → ⚡ → 🚀. Change the username and pattern to your own; the object ids are
0–9 in the `PATTERN_OBJECTS` grid order. The unlock lasts for the browser session.

> ⚠️ This is a **convenience lock, not real security** — the values are in the
> client bundle. For genuine protection, put imports behind Appwrite auth.

## 🕗 Roles & working-hours rules

Edit [src/lib/roles.js](src/lib/roles.js) to match your team and schedule:

- **`ROLES`** — `"Name": "Role"` (e.g. Jabu → Project Manager). Roles show on the
  People roster/profile and throughout the Attendance page.
- **`WORK`** — the schedule: arrive-by **08:30**, knock-off **16:00** (Fri **13:00**),
  lunch **12:00–13:00**. These drive the on-time / late / early-leave calculations.

The Attendance page also has two tunables in `computeAttendance` (in
[src/lib/attendance.js](src/lib/attendance.js)): `minPresent` (how many people must
show up for a workday to count as "open", so holidays aren't flagged as mass absence)
and `regularPct` (how often someone must attend to be treated as a regular vs a visitor).

## 🧠 How it works

- `src/lib/parseAccessLog.js` — parses the `;`/`,`-delimited CSVs and normalizes dates.
  Each scan gets a **deterministic row id**, so re-importing the same file is safe
  (duplicates are skipped, not duplicated).
- `src/lib/accessLogs.js` — Appwrite reads/writes (paginated fetch, concurrent import,
  clear-all).
- `src/lib/stats.js` — pure function that turns the rows into all dashboard metrics.
- `src/App.jsx` — composes the import panel, stat cards, charts, and table.

## 💡 Notes

- Imports are **idempotent** — run them as many times as you want.
- "Not identified" events are counted separately so failed scans don't inflate
  attendance.
"# AttendanceRegister" 
