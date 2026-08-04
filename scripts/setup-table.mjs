// One-time schema setup: ensures the access-log table has the columns +
// permissions the dashboard expects. Idempotent — safe to re-run (existing
// table/columns are left as-is). Reads credentials from .env.
//
// Usage (from project root):
//   node scripts/setup-table.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Client, TablesDB, Permission, Role } from "node-appwrite";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
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
  console.error("Missing config in .env (API_ENDPOINT, API_SECRETE, VITE_APPWRITE_PROJECT_ID, VITE_APPWRITE_DB_ID, VITE_APPWRITE_TABLE_ID).");
  process.exit(1);
}

const db = new TablesDB(new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(KEY));

const strings = [
  ["date", 10, true],
  ["time", 8, true],
  ["event", 64, true],
  ["personId", 32, false],
  ["personName", 128, true],
  ["registration", 64, false],
  ["portal", 64, false],
  ["reader", 16, true],
  ["source", 256, false],
];

async function ensure(label, fn) {
  try {
    await fn();
    console.log("  ✔ " + label);
  } catch (err) {
    if (err?.code === 409) console.log("  • " + label + " (already exists)");
    else throw err;
  }
}

async function main() {
  console.log(`Ensuring table "${TABLE}" in database "${DB}"…`);
  await ensure(`table ${TABLE}`, () =>
    db.createTable({
      databaseId: DB,
      tableId: TABLE,
      name: "Access Logs",
      permissions: [
        Permission.create(Role.any()),
        Permission.read(Role.any()),
        Permission.delete(Role.any()),
      ],
      rowSecurity: false,
      enabled: true,
    }),
  );

  console.log("Ensuring columns…");
  for (const [key, size, required] of strings) {
    await ensure(`string ${key}`, () =>
      db.createStringColumn({ databaseId: DB, tableId: TABLE, key, size, required }),
    );
    await new Promise((r) => setTimeout(r, 300)); // let each attribute finish provisioning
  }
  await ensure("integer hour", () =>
    db.createIntegerColumn({ databaseId: DB, tableId: TABLE, key: "hour", required: false, min: 0, max: 23 }),
  );

  console.log("\n✅ Schema ready. You can now import.");
}

main().catch((err) => {
  console.error("\n❌ Setup failed:", err?.message || err);
  process.exit(1);
});
