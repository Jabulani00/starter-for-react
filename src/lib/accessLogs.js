import { Query } from "appwrite";
import { db, DB_ID, TABLE_ID } from "../appwriteConfig";
import { scanId } from "./parseAccessLog";

// Columns the table stores. Everything is a string except `hour` (integer).
const FIELDS = [
  "date",
  "time",
  "event",
  "personId",
  "personName",
  "registration",
  "portal",
  "reader",
  "source",
];

function toRow(scan) {
  const row = {};
  FIELDS.forEach((f) => {
    row[f] = scan[f] ?? "";
  });
  row.hour = Number(scan.hour) || 0;
  return row;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGE_SIZE = 1000; // Appwrite accepts up to 1000 rows per page here
const WAVE = 10; // pages fetched in parallel per wave

// Fetch every row using large pages fetched in parallel (offset pagination).
// ~8k rows load in one or two waves (~1–2s) instead of dozens of serial calls.
async function fetchAllRows(extraQueries = [], { onProgress } = {}) {
  const all = [];
  const seen = new Set();
  let base = 0;
  for (;;) {
    const offsets = Array.from({ length: WAVE }, (_, i) => base + i * PAGE_SIZE);
    const pages = await Promise.all(
      offsets.map((offset) =>
        db
          .listRows({
            databaseId: DB_ID,
            tableId: TABLE_ID,
            queries: [Query.limit(PAGE_SIZE), Query.offset(offset), ...extraQueries],
          })
          .then((r) => r.rows)
          .catch(() => null),
      ),
    );

    let reachedEnd = false;
    for (const rows of pages) {
      if (rows == null) {
        reachedEnd = true; // a page failed (e.g. offset past a hard cap) — stop
        continue;
      }
      for (const row of rows) {
        if (!seen.has(row.$id)) {
          seen.add(row.$id);
          all.push(row);
        }
      }
      if (rows.length < PAGE_SIZE) reachedEnd = true;
    }
    onProgress?.(all.length);
    if (reachedEnd) break;
    base += WAVE * PAGE_SIZE;
    if (base > 500000) break; // hard safety stop
  }
  return all;
}

export function fetchAllScans(opts = {}) {
  return fetchAllRows([], opts);
}

// Fetch just the existing row ids ($id only) so re-imports can skip rows that
// are already saved instead of firing a doomed request for each one.
async function fetchExistingIds() {
  const rows = await fetchAllRows([Query.select(["$id"])]);
  return new Set(rows.map((r) => r.$id));
}

// Create one row, retrying on rate-limit (429) and transient 5xx with
// exponential backoff so nothing is silently dropped during a big import.
async function createWithRetry(scan, maxRetries = 6) {
  for (let attempt = 0; ; attempt++) {
    try {
      await db.createRow({
        databaseId: DB_ID,
        tableId: TABLE_ID,
        rowId: scanId(scan),
        data: toRow(scan),
      });
      return "created";
    } catch (err) {
      if (err?.code === 409) return "skipped"; // already exists
      const code = err?.code ?? 0;
      const retryable = code === 429 || code === 0 || code >= 500;
      if (!retryable || attempt >= maxRetries) throw err;
      const backoff = Math.min(8000, 400 * 2 ** attempt) + Math.random() * 250;
      await sleep(backoff);
    }
  }
}

// Import parsed scans as fast as the browser SDK allows: pre-skip rows already
// in the DB, then insert the rest through a concurrency pool with retry.
// Idempotent — safe to run the same file twice.
export async function importScans(
  scans,
  { onProgress, concurrency = 24, skipExisting = true } = {},
) {
  const total = scans.length;
  let created = 0;
  let skipped = 0;
  let failed = 0;
  let done = 0;
  let firstError = null;

  // 1) Drop rows we already have, so we don't waste requests on re-imports.
  let queue = scans;
  if (skipExisting) {
    try {
      const existing = await fetchExistingIds();
      if (existing.size) {
        queue = scans.filter((s) => !existing.has(scanId(s)));
        skipped = total - queue.length;
        done = skipped;
        onProgress?.({ done, total, created, skipped, failed });
      }
    } catch {
      // Couldn't pre-check (e.g. no read perm yet) — fall back to per-row 409s.
    }
  }
  queue = queue.slice();

  // 2) Insert the remaining rows in parallel with backoff.
  async function worker() {
    while (queue.length) {
      const scan = queue.shift();
      try {
        const result = await createWithRetry(scan);
        if (result === "created") created++;
        else skipped++;
      } catch (err) {
        failed++;
        if (!firstError) firstError = err;
      } finally {
        done++;
        onProgress?.({ done, total, created, skipped, failed });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, queue.length || 1)) }, worker),
  );
  return { created, skipped, failed, total, firstError };
}

// Delete every row (used by the "Clear all data" action).
export async function clearAllScans({ onProgress } = {}) {
  const rows = await fetchAllScans();
  const total = rows.length;
  let done = 0;
  for (const row of rows) {
    try {
      await db.deleteRow({ databaseId: DB_ID, tableId: TABLE_ID, rowId: row.$id });
    } catch {
      // ignore individual delete failures; keep going
    }
    done++;
    onProgress?.({ done, total });
  }
  return total;
}
