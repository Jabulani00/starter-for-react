import { canonName } from "./names";

// Parse a biometric access-log CSV exported from the door readers.
// Expected columns (";" or "," delimited): Date;Time;Event;Id;Name;Registration;Portal
// Date is DD/MM/YY (also tolerates DD-MM-YYYY / DD.MM.YY). Header row is optional.

const HEADER_KEYS = [
  "date",
  "time",
  "event",
  "id",
  "name",
  "registration",
  "portal",
];

// Guess whether a file is the entry ("inside") or exit ("outside") reader
// from its filename, so the user rarely has to pick manually.
export function detectReader(filename = "") {
  const f = filename.toLowerCase();
  if (f.includes("inside") || f.includes("001dbb") || f.includes("entry") || f.includes(" in"))
    return "inside";
  if (f.includes("outside") || f.includes("004380") || f.includes("exit") || f.includes(" out"))
    return "outside";
  return "";
}

// DD/MM/YY -> YYYY-MM-DD (sortable). Returns "" when unparseable.
function toISODate(raw) {
  const parts = String(raw)
    .trim()
    .split(/[/\-.]/)
    .map((s) => s.trim());
  if (parts.length < 3) return "";
  let [d, m, y] = parts;
  if (!d || !m || !y) return "";
  if (y.length === 2) y = "20" + y;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function normalizeTime(t) {
  const s = String(t).trim();
  if (!s) return "";
  const p = s.split(":");
  if (p.length === 2) return `${p[0].padStart(2, "0")}:${p[1].padStart(2, "0")}:00`;
  if (p.length === 3)
    return `${p[0].padStart(2, "0")}:${p[1].padStart(2, "0")}:${p[2].padStart(2, "0")}`;
  return s;
}

export function parseAccessLog(text, { reader = "", source = "" } = {}) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];

  const delim = lines[0].split(";").length >= lines[0].split(",").length ? ";" : ",";
  const head = lines[0].split(delim).map((s) => s.trim().toLowerCase());
  const idx = {};
  HEADER_KEYS.forEach((k) => {
    idx[k] = head.indexOf(k);
  });

  const hasHeader = idx.date !== -1 && idx.time !== -1;
  const start = hasHeader ? 1 : 0;
  const pick = (parts, key, fallbackCol) => {
    const i = hasHeader ? idx[key] : fallbackCol;
    return i != null && i >= 0 && parts[i] != null ? String(parts[i]).trim() : "";
  };

  const out = [];
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(delim);
    const date = toISODate(pick(parts, "date", 0));
    const time = normalizeTime(pick(parts, "time", 1));
    if (!date || !time) continue; // skip blank / malformed / stray header rows

    out.push({
      date,
      time,
      event: pick(parts, "event", 2) || "Access granted",
      personId: pick(parts, "id", 3),
      personName: canonName(pick(parts, "name", 4)),
      registration: pick(parts, "registration", 5),
      portal: pick(parts, "portal", 6),
      reader,
      source,
      hour: parseInt(time.slice(0, 2), 10) || 0,
    });
  }
  return out;
}

// Deterministic <=36-char row id so re-importing the same file is idempotent:
// a duplicate create returns 409, which the importer counts as "skipped".
export function scanId(scan) {
  const raw = `${scan.reader}|${scan.date}|${scan.time}|${scan.personId}|${scan.event}`;
  let h = 5381;
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) >>> 0;
  const prefix = scan.reader === "inside" ? "i" : scan.reader === "outside" ? "o" : "x";
  const id = `${prefix}${h.toString(36)}${scan.personId || "0"}`;
  return id.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 36);
}
