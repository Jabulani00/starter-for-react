import { personKey, minutesOf } from "./stats";
import { WORK, expectedEnd, isWorkday, DEPARTED } from "./roles";

// Turn scans into attendance analytics against the working-hours rules.
// - Holidays are filtered out: a workday only counts as an "operating day" if at
//   least `minPresent` people showed up (otherwise absence is meaningless).
// - "Regulars" are people present on at least `regularPct` of operating days —
//   the core team we measure absence/punctuality against (visitors excluded).
export function computeAttendance(scans, { minPresent = 5, regularPct = 0.35 } = {}) {
  // date -> (personKey -> { firstIn, lastOut, count })
  const days = new Map();
  const weekendByPerson = new Map();

  for (const s of scans) {
    const key = personKey(s);
    if (key === "Unknown") continue;

    let dm = days.get(s.date);
    if (!dm) {
      dm = new Map();
      days.set(s.date, dm);
    }
    let pd = dm.get(key);
    if (!pd) {
      pd = { firstIn: null, lastOut: null, count: 0 };
      dm.set(key, pd);
    }
    pd.count++;
    const mins = minutesOf(s.time);
    if (s.reader === "inside" && (pd.firstIn == null || mins < pd.firstIn)) pd.firstIn = mins;
    if (s.reader === "outside" && (pd.lastOut == null || mins > pd.lastOut)) pd.lastOut = mins;

    if (!isWorkday(s.date)) {
      const w = weekendByPerson.get(key) || new Set();
      w.add(s.date);
      weekendByPerson.set(key, w);
    }
  }

  const allDates = [...days.keys()].sort();
  const operating = allDates.filter((d) => isWorkday(d) && days.get(d).size >= minPresent);
  const closedWorkdays = allDates.filter((d) => isWorkday(d) && days.get(d).size < minPresent);

  // presence per person across operating days
  const presence = new Map(); // key -> Set(date)
  for (const d of operating) {
    for (const key of days.get(d).keys()) {
      const set = presence.get(key) || new Set();
      set.add(d);
      presence.set(key, set);
    }
  }

  const regulars = [...presence.entries()]
    .filter(([, set]) => set.size >= regularPct * operating.length)
    .map(([key]) => key)
    .sort();
  const regularSet = new Set(regulars);

  // Each regular's "expected" window. For people who left, it ends on their last
  // day on site; for current staff it runs to the end of the data. Only operating
  // days inside this window count toward their attendance / absence.
  const datasetEnd = operating[operating.length - 1];
  const windows = new Map();
  for (const key of regulars) {
    const ds = [...presence.get(key)].sort();
    const firstSeen = ds[0];
    const lastSeen = ds[ds.length - 1];
    const end = DEPARTED.has(key) ? lastSeen : datasetEnd;
    const expectedDays = operating.filter((d) => d >= firstSeen && d <= end).length;
    windows.set(key, { firstSeen, lastSeen, end, expectedDays, departed: DEPARTED.has(key) });
  }
  const expectedOn = (key, date) => {
    const w = windows.get(key);
    return w && date >= w.firstSeen && date <= w.end;
  };

  // per operating day: who among the *expected* regulars was present / absent
  const perDay = operating
    .map((date) => {
      const dm = days.get(date);
      const expected = regulars.filter((k) => expectedOn(k, date));
      const present = expected.filter((k) => dm.has(k));
      const absent = expected.filter((k) => !dm.has(k));
      const late = present.filter((k) => {
        const f = dm.get(k).firstIn;
        return f != null && f > WORK.arriveBy;
      });
      return {
        date,
        present,
        absent,
        presentCount: present.length,
        lateCount: late.length,
        lateSet: new Set(late),
      };
    })
    .reverse(); // most recent first

  // punctuality per regular
  const punctuality = regulars
    .map((key) => {
      const dates = [...(presence.get(key) || [])];
      let onTime = 0, late = 0, earlyLeave = 0, latenessSum = 0;
      const arrivals = [];
      for (const d of dates) {
        const pd = days.get(d).get(key);
        if (pd.firstIn != null) {
          arrivals.push(pd.firstIn);
          if (pd.firstIn <= WORK.arriveBy) onTime++;
          else {
            late++;
            latenessSum += pd.firstIn - WORK.arriveBy;
          }
        }
        if (pd.lastOut != null && pd.lastOut < expectedEnd(d) - WORK.earlyLeaveGrace) earlyLeave++;
      }
      const arrN = arrivals.length;
      const avgArrival = arrN ? Math.round(arrivals.reduce((s, v) => s + v, 0) / arrN) : null;
      // standard deviation of arrival time = how consistent they are
      const arrivalStd =
        arrN > 1
          ? Math.round(
              Math.sqrt(arrivals.reduce((s, v) => s + (v - avgArrival) ** 2, 0) / arrN),
            )
          : 0;
      const w = windows.get(key);
      return {
        key,
        name: key,
        departed: w.departed,
        lastSeen: w.lastSeen,
        daysPresent: dates.length,
        expectedDays: w.expectedDays,
        absent: Math.max(0, w.expectedDays - dates.length),
        attendanceRate: w.expectedDays ? dates.length / w.expectedDays : 0,
        onTime,
        late,
        onTimeRate: onTime + late ? onTime / (onTime + late) : null,
        avgArrival,
        avgLateness: late ? Math.round(latenessSum / late) : null,
        arrivalStd,
        earlyLeave,
      };
    })
    .sort((a, b) => b.attendanceRate - a.attendanceRate);

  const weekendWorkers = [...weekendByPerson.entries()]
    .filter(([key]) => key !== "Unknown")
    .map(([key, set]) => ({ key, name: key, days: set.size }))
    .sort((a, b) => b.days - a.days);

  const teamOnTime = punctuality.reduce((a, p) => a + p.onTime, 0);
  const teamLate = punctuality.reduce((a, p) => a + p.late, 0);

  return {
    operating,
    closedWorkdays,
    regulars,
    regularSet,
    windows,
    perDay,
    punctuality,
    weekendWorkers,
    teamOnTimeRate: teamOnTime + teamLate ? teamOnTime / (teamOnTime + teamLate) : null,
    avgPresent: perDay.length ? Math.round(perDay.reduce((a, d) => a + d.presentCount, 0) / perDay.length) : 0,
    avgAbsent: perDay.length
      ? (perDay.reduce((a, d) => a + d.absent.length, 0) / perDay.length).toFixed(1)
      : 0,
  };
}
