import { useRef, useState } from "react";
import { parseAccessLog, detectReader } from "../lib/parseAccessLog";
import { importScans } from "../lib/accessLogs";
import { Panel } from "./ui";

function readFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = (e) => resolve(String(e.target.result || ""));
    fr.onerror = reject;
    fr.readAsText(file);
  });
}

export default function ImportPanel({ disabled, onImported }) {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]); // { name, reader, scans }
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  async function addFiles(fileList) {
    const next = [];
    for (const file of fileList) {
      if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") continue;
      const text = await readFile(file);
      const reader = detectReader(file.name);
      const scans = parseAccessLog(text, { reader, source: file.name });
      next.push({ name: file.name, reader, scans });
    }
    if (next.length) {
      setResult(null);
      setFiles((prev) => [...prev, ...next]);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    addFiles([...e.dataTransfer.files]);
  }

  function setReader(idx, reader) {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === idx
          ? { ...f, reader, scans: f.scans.map((s) => ({ ...s, reader })) }
          : f,
      ),
    );
  }

  function removeFile(idx) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const allScans = files.flatMap((f) => f.scans);
  const readyToImport =
    files.length > 0 && files.every((f) => f.reader === "inside" || f.reader === "outside");

  async function doImport() {
    if (!readyToImport || busy) return;
    setBusy(true);
    setResult(null);
    setProgress({ done: 0, total: allScans.length });
    try {
      const res = await importScans(allScans, { onProgress: setProgress });
      setResult(res);
      setFiles([]);
      onImported?.();
    } catch (err) {
      setResult({ error: err?.message || "Import failed" });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;

  return (
    <Panel
      title="Import access reports"
      subtitle="Drop the CSV exports from the door readers — they're saved to Appwrite."
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
        style={{
          borderColor: dragging ? "var(--accent)" : "var(--border)",
          background: dragging ? "rgba(253,54,110,0.06)" : "transparent",
        }}
      >
        <div className="text-2xl" style={{ color: "var(--accent)" }}>
          <i className="fa-solid fa-file-arrow-up" />
        </div>
        <div className="mt-2 text-sm font-medium">
          {dragging ? "Drop to add" : "Drag & drop CSV files, or click to browse"}
        </div>
        <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
          Accepts the <code>formatted_access_logs_*.csv</code> exports
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles([...e.target.files]);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
              style={{ borderColor: "var(--border)", background: "var(--panel-2)" }}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium" title={f.name}>
                  {f.name}
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  {f.scans.length.toLocaleString()} scans
                </div>
              </div>
              <select
                value={f.reader}
                onChange={(e) => setReader(i, e.target.value)}
                className="rounded-md border px-2 py-1 text-sm"
                style={{
                  borderColor: f.reader ? "var(--border)" : "var(--warn)",
                  background: "var(--panel)",
                  color: "var(--text)",
                }}
              >
                <option value="">Pick reader…</option>
                <option value="inside">🚪 Entry (inside)</option>
                <option value="outside">🏃 Exit (outside)</option>
              </select>
              <button
                onClick={() => removeFile(i)}
                className="rounded-md px-2 py-1 text-xs"
                style={{ color: "var(--muted)" }}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}

          <div className="mt-1 flex items-center gap-3">
            <button
              onClick={doImport}
              disabled={!readyToImport || busy || disabled}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ background: "var(--accent)" }}
            >
              {busy
                ? `Importing… ${pct}%`
                : `Import ${allScans.length.toLocaleString()} scans to Appwrite`}
            </button>
            {!readyToImport && (
              <span className="text-xs" style={{ color: "var(--warn)" }}>
                Pick a reader for every file first.
              </span>
            )}
          </div>

          {busy && (
            <div
              className="mt-1 h-2 w-full overflow-hidden rounded-full"
              style={{ background: "var(--panel-2)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: "var(--accent)" }}
              />
            </div>
          )}
        </div>
      )}

      {result && !result.error && (
        <div
          className="mt-4 rounded-lg border p-3 text-sm"
          style={{ borderColor: "var(--inside)", background: "rgba(16,185,129,0.08)" }}
        >
          <i className="fa-solid fa-circle-check" /> Imported{" "}
          <b>{result.created.toLocaleString()}</b> new scans
          {result.skipped > 0 && <> · {result.skipped.toLocaleString()} already existed</>}
          {result.failed > 0 && (
            <span style={{ color: "var(--bad)" }}> · {result.failed} failed</span>
          )}
          .
        </div>
      )}
      {result?.error && (
        <div
          className="mt-4 rounded-lg border p-3 text-sm"
          style={{ borderColor: "var(--bad)", background: "rgba(239,68,68,0.08)" }}
        >
          <i className="fa-solid fa-circle-xmark" /> {result.error}
        </div>
      )}
    </Panel>
  );
}
