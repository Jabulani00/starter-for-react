import { useMemo, useState } from "react";
import { Panel } from "./ui";
import { formatDate } from "../lib/stats";
import { canonName } from "../lib/names";

const PAGE_SIZE = 15;

export default function ScansTable({ scans }) {
  const [reader, setReader] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return scans
      .filter((s) => reader === "all" || s.reader === reader)
      .filter(
        (s) =>
          !needle ||
          canonName(s.personName).toLowerCase().includes(needle) ||
          (s.personId || "").toLowerCase().includes(needle),
      )
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }, [scans, reader, q]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const readerBadge = (r) =>
    r === "inside" ? (
      <span style={{ color: "var(--inside)" }}>
        <i className="fa-solid fa-right-to-bracket" /> Entry
      </span>
    ) : r === "outside" ? (
      <span style={{ color: "var(--outside)" }}>
        <i className="fa-solid fa-right-from-bracket" /> Exit
      </span>
    ) : (
      <span style={{ color: "var(--muted)" }}>—</span>
    );

  return (
    <Panel
      title="Access log"
      subtitle={`${filtered.length.toLocaleString()} scans`}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search name / id…"
            className="rounded-md border px-2.5 py-1 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
          />
          <select
            value={reader}
            onChange={(e) => {
              setReader(e.target.value);
              setPage(0);
            }}
            className="rounded-md border px-2 py-1 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
          >
            <option value="all">All readers</option>
            <option value="inside">Entry (inside)</option>
            <option value="outside">Exit (outside)</option>
          </select>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr
              className="text-left text-xs uppercase"
              style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}
            >
              <th className="py-2 pr-3 font-medium">Date</th>
              <th className="py-2 pr-3 font-medium">Time</th>
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">ID</th>
              <th className="py-2 pr-3 font-medium">Reader</th>
              <th className="py-2 pr-3 font-medium">Event</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="py-2 pr-3 tabular-nums">{formatDate(s.date)}</td>
                <td className="py-2 pr-3 tabular-nums" style={{ color: "var(--muted)" }}>
                  {s.time}
                </td>
                <td className="py-2 pr-3">{canonName(s.personName)}</td>
                <td className="py-2 pr-3" style={{ color: "var(--muted)" }}>
                  {s.personId || "—"}
                </td>
                <td className="py-2 pr-3">{readerBadge(s.reader)}</td>
                <td className="py-2 pr-3">
                  {String(s.event).toLowerCase() === "access granted" ? (
                    s.event
                  ) : (
                    <span style={{ color: "var(--warn)" }}>{s.event}</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center" style={{ color: "var(--muted)" }}>
                  No scans match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <button
            onClick={() => setPage(Math.max(0, current - 1))}
            disabled={current === 0}
            className="rounded-md border px-3 py-1 disabled:opacity-30"
            style={{ borderColor: "var(--border)" }}
          >
            ← Prev
          </button>
          <span style={{ color: "var(--muted)" }}>
            Page {current + 1} of {pages}
          </span>
          <button
            onClick={() => setPage(Math.min(pages - 1, current + 1))}
            disabled={current >= pages - 1}
            className="rounded-md border px-3 py-1 disabled:opacity-30"
            style={{ borderColor: "var(--border)" }}
          >
            Next →
          </button>
        </div>
      )}
    </Panel>
  );
}
