import { useMemo, useState } from "react";
import { Panel, MiniStat, Legend } from "../components/ui";
import { computeAttendance } from "../lib/attendance";
import { formatDate, formatMinutes } from "../lib/stats";
import { roleOf, WORK } from "../lib/roles";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dow = (iso) => WD[new Date(`${iso}T12:00:00`).getDay()];

function RoleTag({ name }) {
  const role = roleOf(name);
  if (!role) return null;
  return (
    <span
      className="ml-1 rounded px-1 text-[10px]"
      style={{ background: "var(--panel-2)", color: "var(--muted)" }}
    >
      {role}
    </span>
  );
}

function pctColor(r) {
  if (r == null) return "var(--muted)";
  if (r >= 0.9) return "var(--inside)";
  if (r >= 0.75) return "var(--warn)";
  return "var(--bad)";
}

export default function Attendance({ scans, onSelectPerson }) {
  const a = useMemo(() => computeAttendance(scans), [scans]);
  const [dayIdx, setDayIdx] = useState(0);

  if (!a.operating.length) {
    return (
      <Panel>
        <div className="py-12 text-center text-sm" style={{ color: "var(--muted)" }}>
          Not enough data yet to compute attendance.
        </div>
      </Panel>
    );
  }

  const day = a.perDay[Math.min(dayIdx, a.perDay.length - 1)];
  const matrixDays = a.perDay.slice(0, 20); // most recent 20 operating days
  // only show people whose tenure overlaps the visible matrix window
  const matrixMin = matrixDays[matrixDays.length - 1]?.date ?? "";
  const matrixMax = matrixDays[0]?.date ?? "";
  const matrixPeople = a.regulars.filter((name) => {
    const w = a.windows.get(name);
    return w && w.firstSeen <= matrixMax && w.end >= matrixMin;
  });

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label="Operating days" value={a.operating.length} sub="Mon–Fri, lab open" />
        <MiniStat label="Team size" value={a.regulars.length} sub="regular attendees" accent="var(--accent)" />
        <MiniStat label="Avg present / day" value={a.avgPresent} sub={`${a.avgAbsent} absent avg`} />
        <MiniStat
          label="Team on-time rate"
          value={a.teamOnTimeRate != null ? `${Math.round(a.teamOnTimeRate * 100)}%` : "—"}
          sub={`by ${formatMinutes(WORK.arriveBy)}`}
          accent={pctColor(a.teamOnTimeRate)}
        />
      </div>

      <Panel
        title="Absentees by day"
        subtitle="Regular team members who didn't show up on a working day (holidays excluded)"
        className="mb-6"
        right={
          <select
            value={dayIdx}
            onChange={(e) => setDayIdx(Number(e.target.value))}
            className="rounded-md border px-2 py-1 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
          >
            {a.perDay.map((d, i) => (
              <option key={d.date} value={i}>
                {dow(d.date)} {formatDate(d.date)}
              </option>
            ))}
          </select>
        }
      >
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <span>
            <b style={{ color: "var(--inside)" }}>{day.presentCount}</b>
            <span style={{ color: "var(--muted)" }}> present</span>
          </span>
          <span>
            <b style={{ color: "var(--bad)" }}>{day.absent.length}</b>
            <span style={{ color: "var(--muted)" }}> absent</span>
          </span>
          <span>
            <b style={{ color: "var(--warn)" }}>{day.lateCount}</b>
            <span style={{ color: "var(--muted)" }}> late</span>
          </span>
        </div>
        {day.absent.length ? (
          <div className="flex flex-wrap gap-2">
            {day.absent.map((name) => (
              <button
                key={name}
                onClick={() => onSelectPerson?.(name)}
                className="rounded-lg border px-2.5 py-1 text-sm"
                style={{ borderColor: "var(--bad)", background: "rgba(239,68,68,0.08)" }}
              >
                {name}
                <RoleTag name={name} />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--inside)" }}>
            <i className="fa-solid fa-circle-check" /> Full house — nobody absent.
          </p>
        )}
      </Panel>

      <Panel
        title="Attendance matrix"
        subtitle="Last 20 operating days · click a name for their profile"
        className="mb-6"
        right={
          <Legend
            items={[
              { label: "On time", color: "var(--inside)" },
              { label: "Late", color: "var(--warn)" },
              { label: "Absent", color: "var(--bad)" },
            ]}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-[var(--panel)] pr-3 text-left font-medium" style={{ color: "var(--muted)" }}></th>
                {matrixDays.map((d) => (
                  <th key={d.date} className="px-[3px] text-[9px] font-normal" style={{ color: "var(--muted)" }}>
                    <div>{dow(d.date).slice(0, 1)}</div>
                    <div>{d.date.slice(8, 10)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixPeople.map((name) => (
                <tr key={name}>
                  <td
                    className="sticky left-0 z-10 cursor-pointer whitespace-nowrap bg-[var(--panel)] pr-3 hover:underline"
                    onClick={() => onSelectPerson?.(name)}
                  >
                    {name}
                    <RoleTag name={name} />
                  </td>
                  {matrixDays.map((d) => {
                    const present = d.present.includes(name);
                    const absent = d.absent.includes(name);
                    const late = d.lateSet.has(name);
                    // neither present nor "absent" => outside their tenure (neutral)
                    const status = present ? (late ? "late" : "on time") : absent ? "absent" : "—";
                    const bg = present
                      ? late
                        ? "var(--warn)"
                        : "var(--inside)"
                      : absent
                        ? "rgba(239,68,68,0.5)"
                        : "var(--panel-2)";
                    return (
                      <td key={d.date} className="px-[3px] py-[3px]">
                        <div
                          className="h-4 w-4 rounded-[3px]"
                          title={`${name} · ${dow(d.date)} ${formatDate(d.date)}: ${status}`}
                          style={{ background: bg }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Punctuality & attendance" subtitle={`Per person · arrive by ${formatMinutes(WORK.arriveBy)}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                  <th className="py-2 pr-2 font-medium">Person</th>
                  <th className="py-2 pr-2 font-medium">Present</th>
                  <th className="py-2 pr-2 font-medium">On-time</th>
                  <th className="py-2 pr-2 font-medium">Avg in</th>
                  <th className="py-2 pr-2 font-medium">Early out</th>
                </tr>
              </thead>
              <tbody>
                {a.punctuality.map((p) => (
                  <tr key={p.key} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-1.5 pr-2">
                      <button onClick={() => onSelectPerson?.(p.name)} className="hover:underline">
                        {p.name}
                      </button>
                      <RoleTag name={p.name} />
                      {p.departed && (
                        <span
                          className="ml-1 rounded px-1 text-[10px]"
                          style={{ background: "rgba(148,148,164,0.15)", color: "var(--muted)" }}
                          title={`Left the lab · last seen ${formatDate(p.lastSeen)}`}
                        >
                          left {formatDate(p.lastSeen)}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums" style={{ color: pctColor(p.attendanceRate) }}>
                      {Math.round(p.attendanceRate * 100)}%
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums" style={{ color: pctColor(p.onTimeRate) }}>
                      {p.onTimeRate != null ? `${Math.round(p.onTimeRate * 100)}%` : "—"}
                      {p.avgLateness ? (
                        <span className="text-xs" style={{ color: "var(--muted)" }}> (+{p.avgLateness}m)</span>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums" style={{ color: "var(--muted)" }}>
                      {formatMinutes(p.avgArrival)}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums" style={{ color: "var(--muted)" }}>{p.earlyLeave}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Weekend workers" subtitle="Came in on a Saturday or Sunday">
          {a.weekendWorkers.length ? (
            <div className="flex flex-col gap-1.5">
              {a.weekendWorkers.map((w) => (
                <button
                  key={w.key}
                  onClick={() => onSelectPerson?.(w.name)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm"
                  style={{ background: "var(--panel-2)" }}
                >
                  <span>
                    {w.name}
                    <RoleTag name={w.name} />
                  </span>
                  <span className="tabular-nums" style={{ color: "var(--muted)" }}>
                    {w.days} weekend day{w.days === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No weekend activity.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
