// Small presentational building blocks for the dashboard. No external chart
// library — the bars are plain divs so the bundle stays tiny.

// MUT signature: a chevron/zigzag strip in teal · gold · maroon.
export function ZigzagBar({ height = 14, className = "" }) {
  const w = 36;
  return (
    <svg className={className} width="100%" height={height} style={{ display: "block" }} aria-hidden="true">
      <defs>
        <pattern id="mut-zz" patternUnits="userSpaceOnUse" width={w} height={height}>
          <polygon points={`0,0 12,0 6,${height}`} fill="#006281" />
          <polygon points={`12,0 24,0 18,${height}`} fill="#c99115" />
          <polygon points={`24,0 36,0 30,${height}`} fill="#812b29" />
        </pattern>
      </defs>
      <rect width="100%" height={height} fill="url(#mut-zz)" />
    </svg>
  );
}

// MUT diamond separator — three small rotated squares.
export function Diamonds({ className = "" }) {
  const colors = ["#006281", "#c99115", "#812b29"];
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {colors.map((c) => (
        <span key={c} className="inline-block h-2 w-2 rotate-45" style={{ background: c }} />
      ))}
    </div>
  );
}

// MUT stats-band badge: solid colored circle + icon, big number, label.
export function KpiBadge({ icon, value, label, color, sub }) {
  return (
    <div className="flex flex-col items-center px-2 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full text-xl text-white shadow-md"
        style={{ background: color }}
      >
        <i className={icon} aria-hidden="true" />
      </div>
      <div className="mt-2.5 text-2xl leading-none font-extrabold" style={{ color: "var(--text)" }}>
        {value}
      </div>
      <div className="mt-1 text-xs font-medium" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      {sub && (
        <div className="text-[11px]" style={{ color: "var(--muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Panel({ title, subtitle, right, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border p-4 shadow-[0_1px_2px_rgba(21,37,46,0.04),0_10px_30px_-20px_rgba(21,37,46,0.25)] sm:p-5 ${className}`}
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      {(title || right) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-[15px] font-semibold">{title}</h3>}
            {subtitle && (
              <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, sub, accent = "var(--text)", icon }) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border p-4 shadow-[0_1px_2px_rgba(21,37,46,0.04),0_10px_30px_-20px_rgba(21,37,46,0.22)] transition-transform duration-150 hover:-translate-y-0.5"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <div
        className="absolute inset-x-0 top-0 h-[3px] opacity-80"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: "var(--muted)" }}>
          {label}
        </span>
        {icon && (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
            style={{ background: "var(--panel-2)" }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold sm:text-3xl" style={{ color: accent }}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// Vertical bar chart. data: [{ label, value, title?, color? }]
export function BarChart({ data, color = "var(--accent)", height = 180, formatLabel }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="overflow-x-auto">
      <div
        className="flex items-end gap-1"
        style={{ height, minWidth: data.length * 14 }}
      >
        {data.map((d, i) => (
          <div
            key={i}
            className="group flex min-w-[8px] flex-1 flex-col items-center justify-end"
            title={d.title || `${d.label}: ${d.value}`}
          >
            <div
              className="w-full rounded-t transition-opacity group-hover:opacity-80"
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? 2 : 0,
                background: d.color || color,
              }}
            />
          </div>
        ))}
      </div>
      {formatLabel && (
        <div
          className="mt-2 flex gap-1"
          style={{ minWidth: data.length * 14 }}
        >
          {data.map((d, i) => (
            <div
              key={i}
              className="min-w-[8px] flex-1 text-center text-[9px]"
              style={{ color: "var(--muted)" }}
            >
              {formatLabel(d, i)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Horizontal ranked bars. data: [{ label, value, parts?: [{value,color}] }]
export function RankedBars({ data, max, valueSuffix = "" }) {
  const top = Math.max(1, max ?? Math.max(...data.map((d) => d.value)));
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-28 shrink-0 truncate text-sm" title={d.label}>
            {d.label}
          </div>
          <div
            className="relative h-5 flex-1 overflow-hidden rounded"
            style={{ background: "var(--panel-2)" }}
          >
            <div className="flex h-full" style={{ width: `${(d.value / top) * 100}%` }}>
              {(d.parts || [{ value: d.value, color: "var(--accent)" }]).map((p, j) => (
                <div
                  key={j}
                  style={{
                    width: `${(p.value / d.value) * 100}%`,
                    background: p.color,
                  }}
                  title={p.title}
                />
              ))}
            </div>
          </div>
          <div className="w-12 shrink-0 text-right text-sm tabular-nums" style={{ color: "var(--muted)" }}>
            {d.value}
            {valueSuffix}
          </div>
        </div>
      ))}
    </div>
  );
}

// Weekday (rows) × hour (cols) intensity grid. data: number[7][24]
export function Heatmap({ data, rowLabels, colLabels, accent = "253,54,110" }) {
  const max = Math.max(1, ...data.flat());
  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 640 }}>
        <div className="flex">
          <div className="w-9 shrink-0" />
          {colLabels.map((c, i) => (
            <div
              key={i}
              className="flex-1 text-center text-[9px]"
              style={{ color: "var(--muted)" }}
            >
              {i % 3 === 0 ? c : ""}
            </div>
          ))}
        </div>
        {data.map((row, r) => (
          <div key={r} className="flex items-center">
            <div className="w-9 shrink-0 text-[10px]" style={{ color: "var(--muted)" }}>
              {rowLabels[r]}
            </div>
            {row.map((v, c) => (
              <div key={c} className="flex-1 px-[1px]">
                <div
                  className="h-4 rounded-[2px]"
                  title={`${rowLabels[r]} ${colLabels[c]}: ${v}`}
                  style={{
                    background: v ? `rgba(${accent},${0.12 + 0.88 * (v / max)})` : "var(--panel-2)",
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MiniStat({ label, value, sub, accent = "var(--text)" }) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{ background: "var(--panel-2)", borderColor: "var(--border)" }}
    >
      <div className="text-[11px] tracking-wide uppercase" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="mt-1 text-xl font-bold" style={{ color: accent }}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px]" style={{ color: "var(--muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-4">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: it.color }}
          />
          {it.label}
        </div>
      ))}
    </div>
  );
}
