import { useMemo, useState } from "react";
import { Panel, MiniStat } from "../components/ui";
import { CATEGORY } from "../lib/performance";
import { formatMinutes } from "../lib/stats";
import { roleOf } from "../lib/roles";

const pctColor = (r) =>
  r == null ? "var(--muted)" : r >= 0.9 ? "var(--inside)" : r >= 0.7 ? "var(--warn)" : "var(--bad)";

function PersonCard({ p, onSelect }) {
  const c = CATEGORY[p.category];
  const att = Math.round((p.attendanceRate ?? 0) * 100);
  const ot = p.onTimeRate != null ? Math.round(p.onTimeRate * 100) : null;
  const role = roleOf(p.name);
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button onClick={() => onSelect?.(p.name)} className="truncate font-semibold hover:underline">
            {p.name}
          </button>
          {role && (
            <span className="ml-1 rounded px-1.5 py-0.5 text-[10px]" style={{ background: "var(--panel-2)", color: "var(--muted)" }}>
              {role}
            </span>
          )}
        </div>
        <div
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold"
          style={{ background: c.tint, color: c.color }}
        >
          <i className={c.icon} /> {p.score}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg py-1.5" style={{ background: "var(--panel-2)" }}>
          <div className="text-sm font-bold" style={{ color: pctColor(p.attendanceRate) }}>{att}%</div>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>attendance</div>
        </div>
        <div className="rounded-lg py-1.5" style={{ background: "var(--panel-2)" }}>
          <div className="text-sm font-bold" style={{ color: pctColor(p.onTimeRate) }}>{ot != null ? `${ot}%` : "—"}</div>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>on-time</div>
        </div>
        <div className="rounded-lg py-1.5" style={{ background: "var(--panel-2)" }}>
          <div className="text-sm font-bold" style={{ color: p.arrivalStd > 60 ? "var(--warn)" : "var(--text)" }}>±{p.arrivalStd}m</div>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>consistency</div>
        </div>
      </div>

      <p
        className="mt-3 rounded-lg border-l-4 px-3 py-2 text-xs leading-relaxed"
        style={{ borderColor: c.color, background: c.tint, color: "var(--text)" }}
      >
        {p.message}
      </p>
    </div>
  );
}

function Group({ cat, people, onSelect }) {
  if (!people.length) return null;
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <i className={cat.icon} style={{ color: cat.color }} /> {cat.label}
          <span className="rounded-full px-2 text-xs" style={{ background: cat.tint, color: cat.color }}>
            {people.length}
          </span>
        </span>
      }
      subtitle={cat.blurb}
      className="mb-6"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {people.map((p) => (
          <PersonCard key={p.key} p={p} onSelect={onSelect} />
        ))}
      </div>
    </Panel>
  );
}

// Full "expose all" comparison table.
function AllStatsTable({ people, peopleStats, onSelect }) {
  const [sortKey, setSortKey] = useState("score");
  const rows = useMemo(() => {
    const byName = Object.fromEntries(peopleStats.map((p) => [p.name, p]));
    return people
      .map((p) => {
        const sp = byName[p.name] || {};
        return {
          ...p,
          total: sp.total ?? 0,
          entries: sp.inside ?? 0,
          exits: sp.outside ?? 0,
        };
      })
      .sort((a, b) => {
        const va = a[sortKey] ?? 0;
        const vb = b[sortKey] ?? 0;
        return typeof va === "string" ? va.localeCompare(vb) : vb - va;
      });
  }, [people, peopleStats, sortKey]);

  const cols = [
    ["name", "Person"],
    ["score", "Score"],
    ["attendanceRate", "Attend"],
    ["onTimeRate", "On-time"],
    ["avgArrival", "Avg in"],
    ["arrivalStd", "±Consistency"],
    ["late", "Late days"],
    ["earlyLeave", "Early outs"],
    ["daysPresent", "Days"],
    ["total", "Scans"],
    ["entries", "Entries"],
    ["exits", "Exits"],
  ];

  const cell = (p, key) => {
    switch (key) {
      case "name": return p.name;
      case "score": return p.score;
      case "attendanceRate": return `${Math.round((p.attendanceRate ?? 0) * 100)}%`;
      case "onTimeRate": return p.onTimeRate != null ? `${Math.round(p.onTimeRate * 100)}%` : "—";
      case "avgArrival": return formatMinutes(p.avgArrival);
      case "arrivalStd": return `±${p.arrivalStd}m`;
      default: return p[key];
    }
  };

  return (
    <Panel title="All stats" subtitle="Every metric per person — click a header to sort, a name to open the profile">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase" style={{ color: "var(--muted)", borderBottom: "2px solid var(--border)" }}>
              {cols.map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => setSortKey(key)}
                  className="cursor-pointer py-2 pr-3 font-medium select-none hover:text-[var(--accent)]"
                  style={{ color: sortKey === key ? "var(--accent)" : undefined }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.key} style={{ borderBottom: "1px solid var(--border)" }}>
                {cols.map(([key], i) => (
                  <td key={key} className="py-1.5 pr-3 tabular-nums">
                    {i === 0 ? (
                      <button onClick={() => onSelect?.(p.name)} className="font-medium hover:underline">
                        {cell(p, key)}
                      </button>
                    ) : key === "score" ? (
                      <span
                        className="rounded px-1.5 py-0.5 text-xs font-semibold"
                        style={{ background: CATEGORY[p.category].tint, color: CATEGORY[p.category].color }}
                      >
                        {p.score}
                      </span>
                    ) : (
                      cell(p, key)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function Performance({ perf, stats, onSelectPerson }) {
  if (!perf) return null;
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MiniStat label="Team score" value={perf.avgScore} sub="avg / 100" accent="var(--accent)" />
        <MiniStat label="Top performers" value={perf.groups.high.length} accent="var(--inside)" />
        <MiniStat label="Dependable" value={perf.groups.steady.length} accent="var(--accent)" />
        <MiniStat label="Inconsistent" value={perf.groups.inconsistent.length} accent="var(--warn)" />
        <MiniStat label="Needs to improve" value={perf.groups.low.length} accent="var(--bad)" />
      </div>

      <Group cat={CATEGORY.high} people={perf.groups.high} onSelect={onSelectPerson} />
      <Group cat={CATEGORY.inconsistent} people={perf.groups.inconsistent} onSelect={onSelectPerson} />
      <Group cat={CATEGORY.low} people={perf.groups.low} onSelect={onSelectPerson} />
      <Group cat={CATEGORY.steady} people={perf.groups.steady} onSelect={onSelectPerson} />

      <AllStatsTable people={perf.people} peopleStats={stats.people} onSelect={onSelectPerson} />
    </>
  );
}
