import { Panel, StatCard, BarChart, Legend } from "../components/ui";
import { formatHour, formatDate } from "../lib/stats";

export default function Overview({ stats, onSelectPerson }) {
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total scans"
          value={stats.total.toLocaleString()}
          sub={`${formatDate(stats.firstDate)} – ${formatDate(stats.lastDate)}`}
          icon={<i className="fa-solid fa-hashtag" />}
        />
        <StatCard
          label="Unique people"
          value={stats.uniquePeople}
          sub={`${stats.days} active days`}
          accent="var(--accent)"
          icon={<i className="fa-solid fa-users" />}
        />
        <StatCard
          label="Entries · Exits"
          value={`${stats.inside.toLocaleString()} · ${stats.outside.toLocaleString()}`}
          sub="coming in vs going out"
          icon={<i className="fa-solid fa-door-open" />}
        />
        <StatCard
          label="Not identified"
          value={stats.denied.toLocaleString()}
          sub={`${((stats.denied / stats.total) * 100 || 0).toFixed(1)}% of scans`}
          accent={stats.denied ? "var(--warn)" : "var(--text)"}
          icon={<i className="fa-solid fa-triangle-exclamation" />}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Busiest day"
          value={stats.busiestDay ? formatDate(stats.busiestDay.date) : "—"}
          sub={stats.busiestDay ? `${stats.busiestDay.count} scans` : ""}
          icon={<i className="fa-solid fa-calendar-day" />}
        />
        <StatCard
          label="Peak hour"
          value={stats.peakHour ? formatHour(stats.peakHour.hour) : "—"}
          sub={stats.peakHour ? `${stats.peakHour.count} scans` : ""}
          icon={<i className="fa-solid fa-clock" />}
        />
        <StatCard
          label="Avg scans / day"
          value={stats.days ? Math.round(stats.total / stats.days) : 0}
          sub="across active days"
          icon={<i className="fa-solid fa-chart-line" />}
        />
        <StatCard
          label="Most active"
          value={stats.people[0]?.name ?? "—"}
          sub={stats.people[0] ? `${stats.people[0].total} scans` : ""}
          accent="var(--accent)"
          icon={<i className="fa-solid fa-medal" />}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Daily activity"
          subtitle="Scans per day across the period"
          right={<Legend items={[{ label: "Scans", color: "var(--accent)" }]} />}
        >
          <BarChart
            data={stats.byDay.map((d) => ({
              label: formatDate(d.date),
              value: d.count,
              title: `${formatDate(d.date)}: ${d.count} scans`,
            }))}
            color="var(--accent)"
            formatLabel={(d, i) =>
              stats.byDay.length <= 20 || i % 3 === 0 ? d.label.slice(0, 5) : ""
            }
          />
        </Panel>

        <Panel title="Hourly distribution" subtitle="When people scan in/out during the day">
          <BarChart
            data={stats.byHour.map((h) => ({
              label: formatHour(h.hour),
              value: h.count,
              title: `${formatHour(h.hour)}: ${h.count} scans`,
            }))}
            color="var(--outside)"
            formatLabel={(d, i) => (i % 3 === 0 ? d.label : "")}
          />
        </Panel>
      </div>

      <Panel
        title="Top people"
        subtitle="Most frequent scanners — click to see a full profile"
        right={
          <Legend
            items={[
              { label: "Entry", color: "var(--inside)" },
              { label: "Exit", color: "var(--outside)" },
            ]}
          />
        }
      >
        <div className="flex flex-col gap-2.5">
          {stats.people.slice(0, 10).map((p) => (
            <button
              key={p.name}
              onClick={() => onSelectPerson?.(p.name)}
              className="group flex items-center gap-3 text-left"
            >
              <div className="w-28 shrink-0 truncate text-sm group-hover:underline" title={p.name}>
                {p.name}
              </div>
              <div
                className="relative h-5 flex-1 overflow-hidden rounded"
                style={{ background: "var(--panel-2)" }}
              >
                <div
                  className="flex h-full"
                  style={{ width: `${(p.total / stats.people[0].total) * 100}%` }}
                >
                  <div style={{ width: `${(p.inside / p.total) * 100}%`, background: "var(--inside)" }} />
                  <div style={{ width: `${(p.outside / p.total) * 100}%`, background: "var(--outside)" }} />
                </div>
              </div>
              <div className="w-12 shrink-0 text-right text-sm tabular-nums" style={{ color: "var(--muted)" }}>
                {p.total}
              </div>
            </button>
          ))}
        </div>
      </Panel>
    </>
  );
}
