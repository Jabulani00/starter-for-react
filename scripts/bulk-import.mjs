// Fast, server-side bulk importer for the access-log dashboard.
// Uses the Appwrite server SDK's bulk `createRows` (up to 500 rows per request)
// instead of one HTTP request per scan — turning a ~90s browser import into
// a few seconds.
//
// Usage (from the project root):
//   node scripts/bulk-import.mjs "path/to/inside.csv" "path/to/outside.csv"
//
// Reader (inside/outside) is auto-detected from each filename. Override with
// a trailing :inside or :outside, e.g.  node scripts/bulk-import.mjs data.csv:outside
//
// Reads credentials from .env — nothing secret is hard-coded here:
//   API_ENDPOINT, API_SECRETE, VITE_APPWRITE_PROJECT_ID,
//   VITE_APPWRITE_DB_ID, VITE_APPWRITE_TABLE_ID

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client, TablesDB, Query } from "node-appwrite";
import { parseAccessLog, detectReader, scanId } from "../src/lib/parseAccessLog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BATCH = 100; // Appwrite caps createRows at 100 rows per request

// --- tiny .env loader (no dependency) -------------------------------------
function loadEnv() {
  const env = {};
  let text = "";
  try {
    text = readFileSync(resolve(ROOT, ".env"), "utf8");
  } catch {
    return env;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2].trim().replace(/^["']|["']$/g, "");
    env[m[1]] = v;
  }
  return env;
}

const env = { ...loadEnv(), ...process.env };
const ENDPOINT = env.API_ENDPOINT || env.VITE_APPWRITE_ENDPOINT;
const PROJECT = env.VITE_APPWRITE_PROJECT_ID;
const KEY = env.API_SECRETE || env.APPWRITE_API_KEY;
const DB = env.VITE_APPWRITE_DB_ID;
const TABLE = env.VITE_APPWRITE_TABLE_ID;

if (!ENDPOINT || !PROJECT || !KEY || !DB || !TABLE) {
  console.error(
    "Missing config. Need API_ENDPOINT, API_SECRETE, VITE_APPWRITE_PROJECT_ID, " +
      "VITE_APPWRITE_DB_ID, VITE_APPWRITE_TABLE_ID in .env",
  );
  process.exit(1);
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('No CSV files given. Example:\n  node scripts/bulk-import.mjs "inside.csv" "outside.csv"');
  process.exit(1);
}

const FIELDS = [
  "date", "time", "event", "personId", "personName",
  "registration", "portal", "reader", "source",
];
function toRow(scan) {
  const row = { $id: scanId(scan) };
  FIELDS.forEach((f) => { row[f] = scan[f] ?? ""; });
  row.hour = Number(scan.hour) || 0;
  return row;
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(KEY);
const db = new TablesDB(client);

async function fetchExistingIds() {
  const ids = new Set();
  let cursor = null;
  for (;;) {
    const queries = [Query.limit(100), Query.select(["$id"])];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const { rows } = await db.listRows({ databaseId: DB, tableId: TABLE, queries });
    for (const r of rows) ids.add(r.$id);
    if (rows.length < 100) break;
    cursor = rows[rows.length - 1].$id;
  }
  return ids;
}

async function main() {
  // 1) Parse every file into scans, de-duped by deterministic id.
  const byId = new Map();
  for (const arg of files) {
    const [path, readerOverride] = arg.split(/:(inside|outside)$/i).filter(Boolean).length === 2
      ? [arg.replace(/:(inside|outside)$/i, ""), arg.match(/:(inside|outside)$/i)[1].toLowerCase()]
      : [arg, ""];
    const abs = resolve(ROOT, path);
    const text = readFileSync(abs, "utf8");
    const reader = readerOverride || detectReader(path);
    if (reader !== "inside" && reader !== "outside") {
      console.error(`✖ Could not tell if "${path}" is inside or outside. Append :inside or :outside.`);
      process.exit(1);
    }
    const scans = parseAccessLog(text, { reader, source: path });
    for (const s of scans) byId.set(scanId(s), s);
    console.log(`• ${path} → ${scans.length} scans (${reader})`);
  }

  const allRows = [...byId.values()].map(toRow);
  console.log(`\nParsed ${allRows.length} unique scans across ${files.length} file(s).`);

  // 2) Skip rows already in the table.
  console.log("Checking what's already imported…");
  const existing = await fetchExistingIds();
  const rows = allRows.filter((r) => !existing.has(r.$id));
  const skipped = allRows.length - rows.length;
  if (skipped) console.log(`  ${skipped} already exist — skipping those.`);
  if (!rows.length) {
    console.log("\n✅ Nothing new to import. Table is up to date.");
    return;
  }

  // 3) Bulk insert in batches.
  console.log(`Importing ${rows.length} new rows in batches of ${BATCH}…`);
  let created = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await db.createRows({ databaseId: DB, tableId: TABLE, rows: chunk });
    created += chunk.length;
    process.stdout.write(`\r  ${created}/${rows.length}`);
  }
  console.log(`\n\n✅ Imported ${created} rows. Open the dashboard and click Refresh.`);
}

main().catch((err) => {
  console.error("\n❌ Import failed:", err?.message || err);
  process.exit(1);
});
