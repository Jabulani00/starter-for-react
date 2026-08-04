import { useMemo } from "react";
import { Panel, MiniStat } from "../components/ui";
import { formatDate } from "../lib/stats";

export default function Anomalies({ scans, stats, onSelectPerson }) {
  const notIdentified = useMemo(
    () =>
      scans
        .filter((s) => String(s.event).toLowerCase() !== "access granted")
        .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)),
    [scans],
  );

  const imbalances = useMemo(
    () =>
      stats.people
        .map((p) => ({ ...p, gap: p.inside - p.outside }))
        .filter((p) => p.gap !== 0)
        .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
        .slice(0, 12),
    [stats.people],
  );

  const totalGap = stats.inside - stats.outside;

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat
          label="Unidentified scans"
          value={notIdentified.length}
          sub={`${((notIdentified.length / stats.total) * 100 || 0).toFixed(1)}% of all`}
          accent={notIdentified.length ? "var(--warn)" : "var(--text)"}
        />
        <MiniStat
          label="People with a gap"
          value={imbalances.length}
          sub="entries ≠ exits"
          accent={imbalances.length ? "var(--warn)" : "var(--inside)"}
        />
        <MiniStat
          label="Net entries − exits"
          value={`${totalGap > 0 ? "+" : ""}${totalGap}`}
          sub={totalGap > 0 ? "more entries logged" : totalGap < 0 ? "more exits logged" : "balanced"}
          accent={totalGap !== 0 ? "var(--warn)" : "var(--inside)"}
        />
        <MiniStat
          label="Unknown identities"
          value={notIdentified.filter((s) => !s.personId || s.personName === "Unknown").length}
          sub="no ID on the scan"
        />
      </div>

      <Panel
        title="Entry / exit imbalance"
        subtitle="A large gap means scans are being missed (e.g. tailgating, or leaving without scanning out). Click a name for details."
        className="mb-6"
      >
        {imbalances.length ? (
          <div className="flex flex-col gap-2.5">
            {imbalances.map((p) => (
              <button
                key={p.name}
                onClick={() => onSelectPerson?.(p.name)}
                className="flex items-center gap-3 text-left"
              >
                <div className="w-28 shrink-0 truncate text-sm hover:underline" title={p.name}>
                  {p.name}
                </div>
                <div className="flex flex-1 items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                  <span style={{ color: "var(--inside)" }}>{p.inside} in</span>
                  <span>/</span>
                  <span style={{ color: "var(--outside)" }}>{p.outside} out</span>
                </div>
                <div
                  className="w-16 shrink-0 rounded-md px-2 py-0.5 text-right text-xs tabular-nums"
                  style={{ background: "rgba(245,158,11,0.12)", color: "var(--warn)" }}
                >
                  {p.gap > 0 ? "+" : ""}
                  {p.gap}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm" style={{ color: "var(--inside)" }}>
            <i className="fa-solid fa-circle-check" /> Everyone&apos;s entries and exits balance.
          </p>
        )}
      </Panel>

      <Panel title="Unidentified scans" subtitle={`${notIdentified.length} failed / unknown reads`}>
        {notIdentified.length ? (
          <div className="max-h-[460px] overflow-y-auto overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr
                  className="sticky top-0 text-left text-xs uppercase"
                  style={{ color: "var(--muted)", background: "var(--panel)", borderBottom: "1px solid var(--border)" }}
                >
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium">Reader</th>
                  <th className="py-2 pr-3 font-medium">Event</th>
                </tr>
              </thead>
              <tbody>
                {notIdentified.slice(0, 200).map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-1.5 pr-3 tabular-nums">{formatDate(s.date)}</td>
                    <td className="py-1.5 pr-3 tabular-nums" style={{ color: "var(--muted)" }}>{s.time}</td>
                    <td className="py-1.5 pr-3">
                      {s.reader === "inside" ? (
                        <span><i className="fa-solid fa-right-to-bracket" /> Entry</span>
                      ) : (
                        <span><i className="fa-solid fa-right-from-bracket" /> Exit</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3" style={{ color: "var(--warn)" }}>{s.event}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {notIdentified.length > 200 && (
              <p className="mt-2 text-center text-xs" style={{ color: "var(--muted)" }}>
                Showing first 200 of {notIdentified.length}.
              </p>
            )}
          </div>
        ) : (
          <p className="py-6 text-center text-sm" style={{ color: "var(--inside)" }}>
            <i className="fa-solid fa-circle-check" /> No unidentified scans.
          </p>
        )}
      </Panel>
    </>
  );
}
