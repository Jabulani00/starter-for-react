import { useState } from "react";
import { PATTERN_OBJECTS, checkAuth, AUTH_PATTERN } from "../lib/auth";

export default function ImportGate({ unlocked, onUnlock, onLock, children }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [seq, setSeq] = useState([]);
  const [error, setError] = useState("");

  function tap(id) {
    setError("");
    setSeq((s) => {
      if (s.includes(id)) return s; // already used
      if (s.length >= AUTH_PATTERN.length) return s;
      return [...s, id];
    });
  }

  function submit() {
    if (!username.trim()) return setError("Enter your username.");
    if (seq.length < AUTH_PATTERN.length) return setError("Tap all 4 objects in order.");
    if (checkAuth(username, seq)) {
      onUnlock();
      setOpen(false);
      setUsername("");
      setSeq([]);
      setError("");
    } else {
      setError("Wrong username or pattern. Try again.");
      setSeq([]);
    }
  }

  // ---- unlocked: show a slim admin bar + the import panel -----------------
  if (unlocked) {
    return (
      <div>
        <div
          className="mb-3 flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm"
          style={{ borderColor: "var(--inside)", background: "rgba(16,185,129,0.08)" }}
        >
          <span className="flex items-center gap-2 font-medium">
            <i className="fa-solid fa-lock-open" style={{ color: "var(--inside)" }} /> Admin unlocked
          </span>
          <button
            onClick={onLock}
            className="rounded-lg border px-3 py-1 text-xs transition-colors hover:bg-[var(--panel-2)]"
            style={{ borderColor: "var(--border)" }}
          >
            Lock
          </button>
        </div>
        {children}
      </div>
    );
  }

  // ---- locked: teaser card, expands into the login ------------------------
  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-3 p-5 text-left transition-colors hover:bg-[var(--panel-2)]"
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
              style={{ background: "var(--panel-2)", color: "var(--accent-2)" }}
            >
              <i className="fa-solid fa-lock" />
            </div>
            <div>
              <div className="font-semibold">Import &amp; manage data</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                Admin only — unlock to upload access reports
              </div>
            </div>
          </div>
          <span
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            Unlock
          </span>
        </button>
      ) : (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Admin login</h3>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Enter your username, then tap the 4 pattern objects in order.
              </p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                setSeq([]);
                setError("");
              }}
              className="text-sm"
              style={{ color: "var(--muted)" }}
            >
              ✕
            </button>
          </div>

          <label className="mb-1 block text-xs font-medium" style={{ color: "var(--muted)" }}>
            Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your username"
            autoComplete="off"
            className="mb-5 w-full max-w-xs rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)", background: "var(--panel-2)", color: "var(--text)" }}
          />

          {/* sequence preview */}
          <div className="mb-3 flex items-center gap-2 text-lg">
            {Array.from({ length: AUTH_PATTERN.length }).map((_, i) => {
              const id = seq[i];
              const obj = id != null ? PATTERN_OBJECTS[id] : null;
              return (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg border"
                    style={{
                      borderColor: obj ? "var(--accent)" : "var(--border)",
                      background: obj ? "rgba(253,54,110,0.12)" : "var(--panel-2)",
                    }}
                  >
                    {obj ? obj.icon : <span className="text-xs" style={{ color: "var(--muted)" }}>{i + 1}</span>}
                  </div>
                  {i < AUTH_PATTERN.length - 1 && (
                    <span style={{ color: "var(--muted)" }}>→</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* the maze of objects */}
          <div className="grid max-w-md grid-cols-5 gap-2 sm:gap-3">
            {PATTERN_OBJECTS.map((obj) => {
              const order = seq.indexOf(obj.id);
              const picked = order !== -1;
              return (
                <button
                  key={obj.id}
                  onClick={() => tap(obj.id)}
                  className="relative flex aspect-square items-center justify-center rounded-xl border text-2xl transition-all active:scale-95"
                  style={{
                    borderColor: picked ? "var(--accent)" : "var(--border)",
                    background: picked ? "rgba(253,54,110,0.14)" : "var(--panel-2)",
                    transform: picked ? "scale(1.03)" : undefined,
                  }}
                >
                  {obj.icon}
                  {picked && (
                    <span
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: "var(--accent)" }}
                    >
                      {order + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {error && (
            <p className="mt-3 text-sm" style={{ color: "var(--bad)" }}>
              {error}
            </p>
          )}

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={submit}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--accent)" }}
            >
              Unlock
            </button>
            <button
              onClick={() => {
                setSeq([]);
                setError("");
              }}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              Reset pattern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
