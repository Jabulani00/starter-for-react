import { computeAttendance } from "./attendance";

// Categorize each (current) team member by attendance, punctuality and how
// consistent their arrival time is. Produces a message meant to be read by the
// person themselves, since the dashboard is shared with the team.
//
// Tunables:
//   STD_OK   arrival std-dev (minutes) considered "consistent"
//   STD_BAD  arrival std-dev above which timing is "all over the place"

const STD_OK = 45;
const STD_BAD = 60;

export const CATEGORY = {
  high: {
    key: "high",
    label: "Top performer",
    icon: "fa-solid fa-award",
    color: "var(--inside)",
    tint: "rgba(0, 98, 129, 0.10)",
    blurb: "Excellent attendance, punctual and consistent",
  },
  steady: {
    key: "steady",
    label: "Dependable",
    icon: "fa-solid fa-thumbs-up",
    color: "var(--accent)",
    tint: "rgba(0, 98, 129, 0.08)",
    blurb: "Reliable — close to the top",
  },
  inconsistent: {
    key: "inconsistent",
    label: "Inconsistent timing",
    icon: "fa-solid fa-clock-rotate-left",
    color: "var(--warn)",
    tint: "rgba(201, 145, 21, 0.12)",
    blurb: "Shows up, but arrival times swing a lot",
  },
  low: {
    key: "low",
    label: "Needs to improve",
    icon: "fa-solid fa-socks",
    color: "var(--bad)",
    tint: "rgba(165, 50, 47, 0.10)",
    blurb: "Attendance / punctuality below par",
  },
};

function categorize(p) {
  const att = p.attendanceRate ?? 0;
  const ot = p.onTimeRate ?? 0;
  const std = p.arrivalStd ?? 0;
  const consistency = Math.max(0, Math.min(1, 1 - std / 90));
  const score = Math.round(100 * (0.45 * att + 0.4 * ot + 0.15 * consistency));

  let category, message;
  if (att < 0.7 || ot < 0.45) {
    category = "low";
    message =
      "Time to pull up your socks — your attendance and punctuality are below par. " +
      "Aim to badge in by 08:30 every working day and the numbers will turn around fast.";
  } else if (att >= 0.9 && ot >= 0.8 && std <= STD_OK) {
    category = "high";
    message =
      "Top performer — consistently present, on time and steady. " +
      "Keep leading by example; the team notices.";
  } else if (std > STD_BAD || ot < 0.7) {
    category = "inconsistent";
    message =
      "Your timekeeping is unpredictable — some days early, some days late. " +
      "Lock in a steady 08:00–08:30 arrival and you'll jump up the rankings.";
  } else {
    category = "steady";
    message =
      "Dependable and close to the top. Tighten up your arrival time a notch " +
      "and you're a top performer.";
  }
  return { category, message, score, consistency };
}

export function computePerformance(scans) {
  const attendance = computeAttendance(scans);
  const people = attendance.punctuality
    .filter((p) => !p.departed)
    .map((p) => ({ ...p, ...categorize(p) }))
    .sort((a, b) => b.score - a.score);

  const groups = { high: [], steady: [], inconsistent: [], low: [] };
  for (const p of people) groups[p.category].push(p);

  const avgScore = people.length
    ? Math.round(people.reduce((s, p) => s + p.score, 0) / people.length)
    : 0;

  return { people, groups, avgScore, attendance };
}
