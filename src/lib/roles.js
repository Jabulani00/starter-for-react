// People roles and the lab's working-hours rules. Edit these to match reality.

export const ROLES = {
  Jabu: "Project Manager",
  Ntokozo: "Deputy Project Manager",
  Phomolo: "Coordinator",
  Sthenjwa: "Technical Support",
  Nkonzo: "Support",
  Nokwanda: "Support",
  Thabiso: "Support",
  Phume: "Cleaner",
};

export function roleOf(name) {
  return ROLES[name] || null;
}

// People who have left the lab. Their attendance/absence is only measured up to
// their last day on site (taken from the data), so they aren't flagged absent
// after they've gone. Add a name here when someone leaves.
export const DEPARTED = new Set(["Ndumiso", "Neliswa", "Nompilo"]);

export function hasDeparted(name) {
  return DEPARTED.has(name);
}

// Times are minutes-from-midnight so they compare directly with a scan's time.
export const WORK = {
  arriveFrom: 8 * 60, //        08:00 — window opens
  arriveBy: 8 * 60 + 30, //     08:30 — on-time cutoff (later = late)
  lunchStart: 12 * 60, //       12:00
  lunchEnd: 13 * 60, //         13:00
  endRegular: 16 * 60, //       16:00 knock-off Mon–Thu
  endFriday: 13 * 60, //        13:00 knock-off Friday
  earlyLeaveGrace: 15, //       leaving >15 min before knock-off counts as early
};

export function weekdayNum(date) {
  return new Date(`${date}T12:00:00`).getDay(); // 0 Sun … 6 Sat
}

export function isWorkday(date) {
  const d = weekdayNum(date);
  return d >= 1 && d <= 5;
}

export function isFriday(date) {
  return weekdayNum(date) === 5;
}

// Expected knock-off time (minutes) for a given date.
export function expectedEnd(date) {
  return isFriday(date) ? WORK.endFriday : WORK.endRegular;
}
