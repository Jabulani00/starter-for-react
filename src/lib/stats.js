// Turn a flat list of scan rows into everything the dashboard displays.
// Pure functions, no Appwrite dependency -> easy to reason about and test.

import { canonName } from "./names";
import { WORK, expectedEnd, isWorkday } from "./roles";

const GRANTED = "access granted";
const isGranted = (event) => String(event || "").toLowerCase() === GRANTED;

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Canonical identity for a scan — merges aliases and whitespace variants so the
// same person recorded under different names on each reader counts as one.
export function personKey(s) {
  return canonName(s.personName);
}

export function minutesOf(time) {
  const [h, m] = String(time).split(":");
  return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
}

export function weekdayOf(date) {
  const d = new Date(`${date}T12:00:00`);
  return d.getDay();
}

// ---- top-level dashboard stats -------------------------------------------
export function computeStats(scans) {
  const empty = {
    total: 0, granted: 0, denied: 0, inside: 0, outside: 0,
    uniquePeople: 0, days: 0, firstDate: null, lastDate: null,
    busiestDay: null, peakHour: null, byDay: [], byHour: [],
    byWeekday: [], heatmap: [], people: [], readerSplit: { inside: 0, outside: 0 },
  };
  if (!scans || !scans.length) return empty;

  const dayCount = new Map();
  const hourCount = new Array(24).fill(0);
  const weekdayCount = new Array(7).fill(0);
  const heatmap = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const people = new Map();
  let granted = 0, denied = 0, inside = 0, outside = 0;

  for (const s of scans) {
    const ok = isGranted(s.event);
    ok ? granted++ : denied++;
    if (s.reader === "inside") inside++;
    else if (s.reader === "outside") outside++;

    dayCount.set(s.date, (dayCount.get(s.date) || 0) + 1);
    const h = Number(s.hour) || 0;
    if (h >= 0 && h < 24) hourCount[h]++;
    const wd = weekdayOf(s.date);
    weekdayCount[wd]++;
    if (h >= 0 && h < 24) heatmap[wd][h]++;

    const key = personKey(s);
    const p = people.get(key) || {
      name: key, personId: s.personId || "",
      total: 0, inside: 0, outside: 0, denied: 0,
      days: new Set(), firstSeen: s.date, lastSeen: s.date,
    };
    p.total++;
    if (s.reader === "inside") p.inside++;
    else if (s.reader === "outside") p.outside++;
    if (!ok) p.denied++;
    p.days.add(s.date);
    if (s.date < p.firstSeen) p.firstSeen = s.date;
    if (s.date > p.lastSeen) p.lastSeen = s.date;
    people.set(key, p);
  }

  const byDay = [...dayCount.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const byHour = hourCount.map((count, hour) => ({ hour, count }));
  const byWeekday = weekdayCount.map((count, wd) => ({ wd, label: WEEKDAYS[wd], count }));

  const peopleList = [...people.values()]
    .map((p) => ({ ...p, activeDays: p.days.size, days: undefined }))
    .sort((a, b) => b.total - a.total);

  const busiestDay = byDay.reduce((best, d) => (!best || d.count > best.count ? d : best), null);
  let peakHour = null;
  hourCount.forEach((count, hour) => {
    if (count > 0 && (!peakHour || count > peakHour.count)) peakHour = { hour, count };
  });

  return {
    total: scans.length, granted, denied, inside, outside,
    uniquePeople: people.size, days: byDay.length,
    firstDate: byDay[0]?.date ?? null, lastDate: byDay[byDay.length - 1]?.date ?? null,
    busiestDay, peakHour, byDay, byHour, byWeekday, heatmap,
    people: peopleList, readerSplit: { inside, outside },
  };
}

// ---- per-person deep dive -------------------------------------------------
export function computePerson(scans, key, totalPeriodDays) {
  const mine = scans
    .filter((s) => personKey(s) === key)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  if (!mine.length) return null;

  const dayMap = new Map(); // date -> { arrivals:[], departures:[], count }
  const weekday = new Array(7).fill(0);
  let inside = 0, outside = 0, denied = 0;

  for (const s of mine) {
    if (s.reader === "inside") inside++;
    else if (s.reader === "outside") outside++;
    if (!isGranted(s.event)) denied++;
    weekday[weekdayOf(s.date)]++;
    const d = dayMap.get(s.date) || { firstIn: null, lastOut: null, count: 0 };
    d.count++;
    const mins = minutesOf(s.time);
    if (s.reader === "inside" && (d.firstIn == null || mins < d.firstIn)) d.firstIn = mins;
    if (s.reader === "outside" && (d.lastOut == null || mins > d.lastOut)) d.lastOut = mins;
    dayMap.set(s.date, d);
  }

  const dates = [...dayMap.keys()].sort();
  const arrivals = dates.map((d) => dayMap.get(d).firstIn).filter((v) => v != null);
  const departures = dates.map((d) => dayMap.get(d).lastOut).filter((v) => v != null);
  const durations = dates
    .map((d) => dayMap.get(d))
    .filter((d) => d.firstIn != null && d.lastOut != null && d.lastOut > d.firstIn)
    .map((d) => d.lastOut - d.firstIn);

  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);

  // longest streak of consecutive calendar days present
  let longestStreak = dates.length ? 1 : 0;
  let cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(`${dates[i - 1]}T12:00:00`);
    const now = new Date(`${dates[i]}T12:00:00`);
    const diff = Math.round((now - prev) / 86400000);
    if (diff === 1) cur++;
    else cur = 1;
    if (cur > longestStreak) longestStreak = cur;
  }

  const byDay = dates.map((d) => ({ date: d, count: dayMap.get(d).count }));

  // punctuality vs the working-hours rules (workdays only)
  let onTime = 0, late = 0, earlyLeave = 0, latenessSum = 0;
  for (const d of dates) {
    if (!isWorkday(d)) continue;
    const dm = dayMap.get(d);
    if (dm.firstIn != null) {
      if (dm.firstIn <= WORK.arriveBy) onTime++;
      else {
        late++;
        latenessSum += dm.firstIn - WORK.arriveBy;
      }
    }
    if (dm.lastOut != null && dm.lastOut < expectedEnd(d) - WORK.earlyLeaveGrace) earlyLeave++;
  }

  return {
    key,
    name: key,
    personId: mine[0].personId || "",
    onTime,
    late,
    onTimeRate: onTime + late ? onTime / (onTime + late) : null,
    avgLateness: late ? Math.round(latenessSum / late) : null,
    earlyLeave,
    total: mine.length,
    inside, outside, denied,
    activeDays: dates.length,
    attendanceRate: totalPeriodDays ? dates.length / totalPeriodDays : null,
    firstSeen: dates[0],
    lastSeen: dates[dates.length - 1],
    avgArrival: avg(arrivals),
    earliestArrival: arrivals.length ? Math.min(...arrivals) : null,
    latestArrival: arrivals.length ? Math.max(...arrivals) : null,
    avgDeparture: avg(departures),
    avgDuration: avg(durations),
    longestStreak,
    balance: inside - outside,
    byWeekday: weekday.map((count, wd) => ({ wd, label: WEEKDAYS[wd], count })),
    byDay,
    recent: mine.slice(-25).reverse(),
  };
}

// ---- formatting -----------------------------------------------------------
export function formatHour(h) {
  const hr = ((h + 11) % 12) + 1;
  return `${hr}${h < 12 ? "am" : "pm"}`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

export function formatMinutes(mins) {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDuration(mins) {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
