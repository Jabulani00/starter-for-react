const TABS = [
  { id: "overview", label: "Overview", icon: "fa-solid fa-gauge-high" },
  { id: "people", label: "People", icon: "fa-solid fa-users" },
  { id: "attendance", label: "Attendance", icon: "fa-solid fa-calendar-check" },
  { id: "performance", label: "Performance", icon: "fa-solid fa-ranking-star" },
  { id: "trends", label: "Trends", icon: "fa-solid fa-arrow-trend-up" },
  { id: "anomalies", label: "Anomalies", icon: "fa-solid fa-triangle-exclamation" },
];

export default function Nav({ view, onChange, counts = {} }) {
  return (
    <nav
      className="no-scrollbar mb-6 flex gap-1 overflow-x-auto rounded-2xl border p-1"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      {TABS.map((t) => {
        const active = view === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all"
            style={{
              background: active
                ? "linear-gradient(135deg, var(--accent), var(--accent-2))"
                : "transparent",
              color: active ? "#fff" : "var(--muted)",
              boxShadow: active ? "0 6px 16px -8px var(--accent)" : "none",
            }}
          >
            <i className={`${t.icon} text-[13px]`} aria-hidden="true"></i>
            {t.label}
            {counts[t.id] != null && (
              <span
                className="rounded-full px-1.5 text-xs"
                style={{
                  background: active ? "rgba(255,255,255,0.25)" : "var(--panel-2)",
                  color: active ? "#fff" : "var(--muted)",
                }}
              >
                {counts[t.id]}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
