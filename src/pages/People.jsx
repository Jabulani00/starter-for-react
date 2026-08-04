import { useEffect, useMemo, useRef, useState } from "react";
import { Panel, BarChart, MiniStat } from "../components/ui";
import {
  computePerson,
  formatDate,
  formatMinutes,
  formatDuration,
} from "../lib/stats";
import { roleOf, hasDeparted } from "../lib/roles";
import { CATEGORY } from "../lib/performance";

function onTimeColor(r) {
  if (r == null) return "var(--text)";
  return r >= 0.9 ? "var(--inside)" : r >= 0.75 ? "var(--warn)" : "var(--bad)";
}

function Detail({ person: p }) {
  const pct = p.attendanceRate != null ? Math.round(p.attendanceRate * 100) : null;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        <MiniStat label="Total scans" value={p.total} accent="var(--accent)" />
        <MiniStat label="Entries" value={p.inside} accent="var(--inside)" />
        <MiniStat label="Exits" value={p.outside} accent="var(--outside)" />
        <MiniStat label="Attendance" value={pct != null ? `${pct}%` : "—"} sub={`${p.activeDays} days`} />
        <MiniStat
          label="On-time rate"
          value={p.onTimeRate != null ? `${Math.round(p.onTimeRate * 100)}%` : "—"}
          sub={p.late ? `${p.late} late${p.avgLateness ? ` · +${p.avgLateness}m` : ""}` : "by 08:30"}
          accent={onTimeColor(p.onTimeRate)}
        />
        <MiniStat label="Avg arrival" value={formatMinutes(p.avgArrival)} sub="first entry" />
        <MiniStat label="Avg departure" value={formatMinutes(p.avgDeparture)} sub="last exit" />
        <MiniStat label="Avg on site" value={formatDuration(p.avgDuration)} sub="entry → exit" />
        <MiniStat label="Early departures" value={p.earlyLeave} sub="before knock-off" />
        <MiniStat label="Longest streak" value={`${p.longestStreak}d`} sub="consecutive" />
        <MiniStat label="Earliest / latest" value={`${formatMinutes(p.earliestArrival)}`} sub={`latest ${formatMinutes(p.latestArrival)}`} />
        <MiniStat label="Scans / day" value={p.activeDays ? (p.total / p.activeDays).toFixed(1) : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
            Activity over time
          </div>
          <BarChart
            data={p.byDay.map((d) => ({ label: formatDate(d.date), value: d.count, title: `${formatDate(d.date)}: ${d.count}` }))}
            color="var(--accent)"
            height={110}
            formatLabel={(d, i) => (p.byDay.length <= 14 || i % 4 === 0 ? d.label.slice(0, 5) : "")}
          />
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
            Day-of-week pattern
          </div>
          <BarChart
            data={p.byWeekday.map((d) => ({ label: d.label, value: d.count, title: `${d.label}: ${d.count}` }))}
            color="var(--outside)"
            height={110}
            formatLabel={(d) => d.label}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>
          Recent activity
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] text-sm">
            <tbody>
              {p.recent.slice(0, 12).map((s, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-1.5 pr-3 tabular-nums">{formatDate(s.date)}</td>
                  <td className="py-1.5 pr-3 tabular-nums" style={{ color: "var(--muted)" }}>{s.time}</td>
                  <td className="py-1.5 pr-3">
                    {s.reader === "inside" ? (
                      <span style={{ color: "var(--inside)" }}>
                        <i className="fa-solid fa-right-to-bracket" /> Entry
                      </span>
                    ) : (
                      <span style={{ color: "var(--outside)" }}>
                        <i className="fa-solid fa-right-from-bracket" /> Exit
                      </span>
                    )}
                  </td>
                  <td className="py-1.5" style={{ color: s.event === "Access granted" ? "var(--muted)" : "var(--warn)" }}>
                    {s.event}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Row({ p, open, onToggle, scans, periodDays, perf, rowRef }) {
  const detail = useMemo(
    () => (open ? computePerson(scans, p.name, periodDays) : null),
    [open, scans, p.name, periodDays],
  );
  const role = roleOf(p.name);
  const gone = hasDeparted(p.name);
  const cat = perf ? CATEGORY[perf.category] : null;

  return (
    <div
      ref={rowRef}
      className="overflow-hidden rounded-xl border transition-colors"
      style={{ borderColor: open ? "var(--accent)" : "var(--border)", background: "var(--panel)" }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-[var(--panel-2)]"
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs transition-transform"
          style={{ background: "var(--panel-2)", transform: open ? "rotate(90deg)" : "none" }}
        >
          ▶
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold">{p.name}</span>
            {role && (
              <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "var(--panel-2)", color: "var(--muted)" }}>
                {role}
              </span>
            )}
            {gone && (
              <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "rgba(148,148,164,0.15)", color: "var(--muted)" }}>
                left
              </span>
            )}
            {cat && (
              <span
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{ background: cat.tint, color: cat.color }}
                title={cat.label}
              >
                <i className={cat.icon} /> {perf.score}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
            {p.activeDays} active days · {formatDate(p.firstSeen)}–{formatDate(p.lastSeen)}
          </div>
        </div>
        {/* inline entry/exit split */}
        <div className="hidden w-32 shrink-0 sm:block">
          <div className="mb-1 flex justify-between text-[10px]" style={{ color: "var(--muted)" }}>
            <span>{p.inside} in</span>
            <span>{p.outside} out</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full" style={{ background: "var(--panel-2)" }}>
            <div style={{ width: `${(p.inside / p.total) * 100}%`, background: "var(--inside)" }} />
            <div style={{ width: `${(p.outside / p.total) * 100}%`, background: "var(--outside)" }} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold tabular-nums">{p.total}</div>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>scans</div>
        </div>
      </button>
      {open && detail && (
        <div className="border-t px-3.5 py-4" style={{ borderColor: "var(--border)" }}>
          {cat && (
            <p
              className="mb-4 flex items-start gap-2 rounded-lg border-l-4 px-3 py-2 text-sm leading-relaxed"
              style={{ borderColor: cat.color, background: cat.tint, color: "var(--text)" }}
            >
              <i className={`${cat.icon} mt-0.5`} style={{ color: cat.color }} />
              <span>
                <b>{cat.label}.</b> {perf.message}
              </span>
            </p>
          )}
          <Detail person={detail} />
        </div>
      )}
    </div>
  );
}

export default function People({ scans, stats, periodDays, perfByName = {}, selected, onSelect }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("total");
  const [open, setOpen] = useState(selected || null);
  const rowRefs = useRef({});

  useEffect(() => {
    if (selected) {
      setOpen(selected);
      requestAnimationFrame(() =>
        rowRefs.current[selected]?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    }
  }, [selected]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return stats.people
      .filter((p) => !needle || p.name.toLowerCase().includes(needle))
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b[sort] - a[sort]));
  }, [stats.people, q, sort]);

  return (
    <Panel
      title="People"
      subtitle={`${stats.people.length} unique · tap a person to expand`}
      right={
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="min-w-0 flex-1 rounded-lg border px-2.5 py-1 text-sm sm:w-40 sm:flex-none"
            style={{ borderColor: "var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border px-2 py-1 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
          >
            <option value="total">Scans</option>
            <option value="activeDays">Days</option>
            <option value="name">Name</option>
          </select>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        {list.map((p) => (
          <Row
            key={p.name}
            p={p}
            open={open === p.name}
            onToggle={() => {
              const next = open === p.name ? null : p.name;
              setOpen(next);
              onSelect?.(next);
            }}
            scans={scans}
            periodDays={periodDays}
            perf={perfByName[p.name]}
            rowRef={(el) => (rowRefs.current[p.name] = el)}
          />
        ))}
        {list.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: "var(--muted)" }}>
            No people match.
          </p>
        )}
      </div>
    </Panel>
  );
}
