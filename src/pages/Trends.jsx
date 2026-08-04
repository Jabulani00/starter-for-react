import { useMemo } from "react";
import { Panel, BarChart, Heatmap, Legend, MiniStat } from "../components/ui";
import { WEEKDAYS, formatHour, formatDate } from "../lib/stats";

// ISO-ish week key (year-Www) for weekly aggregation.
function weekKey(iso) {
  const d = new Date(`${iso}T12:00:00`);
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export default function Trends({ scans, stats }) {
  const { byWeek, entryExitByDay, busiestWeekday, quietestWeekday } = useMemo(() => {
    const weekMap = new Map();
    for (const s of scans) {
      const k = weekKey(s.date);
      weekMap.set(k, (weekMap.get(k) || 0) + 1);
    }
    const byWeek = [...weekMap.entries()].map(([w, c]) => ({ week: w, count: c })).sort((a, b) => a.week.localeCompare(b.week));

    const dayMap = new Map();
    for (const s of scans) {
      const d = dayMap.get(s.date) || { inside: 0, outside: 0 };
      if (s.reader === "inside") d.inside++;
      else if (s.reader === "outside") d.outside++;
      dayMap.set(s.date, d);
    }
    const entryExitByDay = [...dayMap.entries()]
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const sortedWd = [...stats.byWeekday].sort((a, b) => b.count - a.count);
    return {
      byWeek,
      entryExitByDay,
      busiestWeekday: sortedWd[0],
      quietestWeekday: [...stats.byWeekday].filter((d) => d.count > 0).sort((a, b) => a.count - b.count)[0],
    };
  }, [scans, stats]);

  const maxEE = Math.max(1, ...entryExitByDay.map((d) => d.inside + d.outside));

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label="Busiest weekday" value={busiestWeekday?.label ?? "—"} sub={`${busiestWeekday?.count ?? 0} scans`} accent="var(--accent)" />
        <MiniStat label="Quietest weekday" value={quietestWeekday?.label ?? "—"} sub={`${quietestWeekday?.count ?? 0} scans`} />
        <MiniStat label="Peak hour" value={stats.peakHour ? formatHour(stats.peakHour.hour) : "—"} sub={`${stats.peakHour?.count ?? 0} scans`} accent="var(--outside)" />
        <MiniStat label="Weeks tracked" value={byWeek.length} sub="in the period" />
      </div>

      <Panel
        title="Activity heatmap"
        subtitle="Darker = busier. Weekday (rows) × hour of day (columns)."
        className="mb-6"
      >
        <Heatmap
          data={stats.heatmap}
          rowLabels={WEEKDAYS}
          colLabels={Array.from({ length: 24 }, (_, h) => formatHour(h))}
        />
      </Panel>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Scans by day of week" subtitle="Totals across the whole period">
          <BarChart
            data={stats.byWeekday.map((d) => ({ label: d.label, value: d.count, title: `${d.label}: ${d.count}` }))}
            color="var(--accent)"
            formatLabel={(d) => d.label}
          />
        </Panel>
        <Panel title="Weekly volume" subtitle="Scans per calendar week">
          <BarChart
            data={byWeek.map((w) => ({ label: formatDate(w.week), value: w.count, title: `Week of ${formatDate(w.week)}: ${w.count}` }))}
            color="var(--outside)"
            formatLabel={(d, i) => (i % 2 === 0 ? d.label.slice(0, 5) : "")}
          />
        </Panel>
      </div>

      <Panel
        title="Entries vs exits over time"
        subtitle="Green = coming in, blue = going out, per day"
        right={<Legend items={[{ label: "Entry", color: "var(--inside)" }, { label: "Exit", color: "var(--outside)" }]} />}
      >
        <div className="overflow-x-auto">
          <div className="flex items-end gap-1" style={{ height: 200, minWidth: entryExitByDay.length * 14 }}>
            {entryExitByDay.map((d, i) => (
              <div
                key={i}
                className="flex min-w-[8px] flex-1 flex-col justify-end"
                title={`${formatDate(d.date)} — ${d.inside} in / ${d.outside} out`}
              >
                <div style={{ height: `${(d.outside / maxEE) * 100}%`, background: "var(--outside)" }} />
                <div style={{ height: `${(d.inside / maxEE) * 100}%`, background: "var(--inside)" }} className="rounded-b" />
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </>
  );
}
