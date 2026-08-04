import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { isConfigured, PROJECT_NAME } from "./appwriteConfig";
import { fetchAllScans, clearAllScans } from "./lib/accessLogs";
import { computeStats } from "./lib/stats";
import { computePerformance } from "./lib/performance";
import { SESSION_KEY } from "./lib/auth";
import { Panel, ZigzagBar, Diamonds } from "./components/ui";
import Nav from "./components/Nav";
import ImportPanel from "./components/ImportPanel";
import ImportGate from "./components/ImportGate";
import ScansTable from "./components/ScansTable";
import Overview from "./pages/Overview";
import People from "./pages/People";
import Attendance from "./pages/Attendance";
import Performance from "./pages/Performance";
import Trends from "./pages/Trends";
import Anomalies from "./pages/Anomalies";

function ConfigNotice() {
  return (
    <div
      className="mb-6 rounded-xl border p-4 text-sm"
      style={{ borderColor: "var(--warn)", background: "rgba(245,158,11,0.08)" }}
    >
      <b>Appwrite isn&apos;t fully configured yet.</b> Set <code>VITE_APPWRITE_DB_ID</code> and{" "}
      <code>VITE_APPWRITE_TABLE_ID</code> in <code>.env</code>, then create the matching database
      &amp; table. See <code>README.md → Appwrite setup</code>. Import/stats are disabled until then.
    </div>
  );
}

export default function App() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [view, setView] = useState("overview");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [adminUnlocked, setAdminUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1",
  );

  const unlockAdmin = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setAdminUnlocked(true);
  };
  const lockAdmin = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAdminUnlocked(false);
  };

  const load = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    setError(null);
    try {
      setScans(await fetchAllScans());
    } catch (err) {
      setError(err?.message || "Could not load data from Appwrite.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => computeStats(scans), [scans]);
  const performance = useMemo(
    () => (scans.length ? computePerformance(scans) : null),
    [scans],
  );
  const perfByName = useMemo(() => {
    const m = {};
    performance?.people.forEach((p) => {
      m[p.name] = p;
    });
    return m;
  }, [performance]);
  const hasData = scans.length > 0;

  function selectPerson(name) {
    setSelectedPerson(name);
    setView("people");
  }

  async function handleClear() {
    if (!window.confirm("Delete ALL saved access-log rows from Appwrite? This cannot be undone."))
      return;
    setClearing(true);
    try {
      await clearAllScans();
      await load();
    } catch (err) {
      setError(err?.message || "Clear failed.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div>
      <ZigzagBar className="mb-5 rounded-t" height={14} />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
          >
            <i className="fa-solid fa-fingerprint" aria-hidden="true"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Innovation Lab{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
              >
                Access Dashboard
              </span>
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm" style={{ color: "var(--muted)" }}>
              {PROJECT_NAME} · biometric door-reader analytics
            </p>
            <Diamonds className="mt-2" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={!isConfigured || loading}
            className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-[var(--panel-2)] disabled:opacity-40"
            style={{ borderColor: "var(--border)" }}
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? "fa-spin" : ""}`} />{" "}
            {loading ? "Loading…" : "Refresh"}
          </button>
          {hasData && adminUnlocked && (
            <button
              onClick={handleClear}
              disabled={clearing}
              className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-[var(--panel-2)] disabled:opacity-40"
              style={{ borderColor: "var(--border)", color: "var(--bad)" }}
            >
              <i className="fa-solid fa-trash-can" /> {clearing ? "Clearing…" : "Clear all data"}
            </button>
          )}
        </div>
      </header>

      {!isConfigured && <ConfigNotice />}
      {error && (
        <div
          className="mb-6 rounded-xl border p-4 text-sm"
          style={{ borderColor: "var(--bad)", background: "rgba(239,68,68,0.08)" }}
        >
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      {hasData && (
        <Nav
          view={view}
          onChange={setView}
          counts={{ people: stats.uniquePeople, anomalies: stats.denied }}
        />
      )}

      {(view === "overview" || !hasData) && (
        <div className="mb-6">
          <ImportGate unlocked={adminUnlocked} onUnlock={unlockAdmin} onLock={lockAdmin}>
            <ImportPanel disabled={!isConfigured} onImported={load} />
          </ImportGate>
        </div>
      )}

      {hasData ? (
        <>
          {view === "overview" && (
            <>
              <Overview stats={stats} onSelectPerson={selectPerson} />
              <div className="mt-6">
                <ScansTable scans={scans} />
              </div>
            </>
          )}
          {view === "people" && (
            <People
              scans={scans}
              stats={stats}
              periodDays={stats.days}
              perfByName={perfByName}
              selected={selectedPerson}
              onSelect={setSelectedPerson}
            />
          )}
          {view === "attendance" && (
            <Attendance scans={scans} onSelectPerson={selectPerson} />
          )}
          {view === "performance" && (
            <Performance perf={performance} stats={stats} onSelectPerson={selectPerson} />
          )}
          {view === "trends" && <Trends scans={scans} stats={stats} />}
          {view === "anomalies" && (
            <Anomalies scans={scans} stats={stats} onSelectPerson={selectPerson} />
          )}
        </>
      ) : (
        !loading &&
        isConfigured && (
          <Panel>
            <div className="py-10 text-center">
              <div className="text-3xl" style={{ color: "var(--accent)" }}>
                <i className="fa-solid fa-chart-column" />
              </div>
              <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
                No data yet. Import a CSV above to populate the dashboard.
              </p>
            </div>
          </Panel>
        )
      )}
    </div>
  );
}
