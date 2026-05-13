import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getWorker } from "./lib/workerClient";
import { FORMAT_META, deltaPct, formatBytes } from "./lib/format";
import type { OutputFormat, ProcessResult } from "./types";
import { DropZone } from "./components/DropZone";
import { Controls } from "./components/Controls";
import { ComparePreview } from "./components/ComparePreview";

interface SourceImage {
  file: File;
  bytes: Uint8Array;
  url: string;
  width: number;
  height: number;
}

interface Output {
  url: string;
  bytes: Uint8Array;
  width: number;
  height: number;
  durationMs: number;
}

export default function App() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [format, setFormat] = useState<OutputFormat>("webp");
  const [quality, setQuality] = useState(75);
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [output, setOutput] = useState<Output | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const jobToken = useRef(0);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setOutput(null);
    setWidth(null);
    setHeight(null);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(bytes)], { type: file.type || "application/octet-stream" }),
    );
    let dims = await readDims(url).catch(() => ({ width: 0, height: 0 }));
    // HEIC and some other formats can't be read by HTMLImageElement; ask the
    // worker to decode just enough to report the real dimensions.
    if (dims.width === 0 || dims.height === 0) {
      try {
        dims = await getWorker().getDimensions(bytes, file.type);
      } catch {
        dims = { width: 0, height: 0 };
      }
    }
    setSource({ file, bytes, url, width: dims.width, height: dims.height });
    if (dims.width > 0 && dims.height > 0) {
      setWidth(dims.width);
      setHeight(dims.height);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (source) URL.revokeObjectURL(source.url);
    };
  }, [source]);

  useEffect(() => {
    return () => {
      if (output) URL.revokeObjectURL(output.url);
    };
  }, [output]);

  const run = useCallback(async () => {
    if (!source) return;
    const token = ++jobToken.current;
    setBusy(true);
    setError(null);
    try {
      const worker = getWorker();
      const result: ProcessResult = await worker.process(
        source.bytes,
        source.file.type,
        { format, quality, targetWidth: width, targetHeight: height },
      );
      if (token !== jobToken.current) return;
      const blob = new Blob([new Uint8Array(result.bytes)], { type: FORMAT_META[format].mime });
      const url = URL.createObjectURL(blob);
      setOutput((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return {
          url,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          durationMs: result.durationMs,
        };
      });
    } catch (e) {
      if (token !== jobToken.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (token === jobToken.current) setBusy(false);
    }
  }, [source, format, quality, width, height]);

  // Re-encode automatically when source/options change. Debounced so the
  // sliders and number inputs don't queue dozens of encode jobs.
  useEffect(() => {
    if (!source) return;
    if (width === null || height === null) return;
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [source, format, quality, width, height, run]);

  const downloadName = useMemo(() => {
    if (!source) return "";
    const base = source.file.name.replace(/\.[^.]+$/, "");
    return `${base}.${FORMAT_META[format].ext}`;
  }, [source, format]);

  const resetDimensions = useCallback(() => {
    if (source && source.width > 0) {
      setWidth(source.width);
      setHeight(source.height);
    }
  }, [source]);

  const stats = source && (
    <section className="stats">
      <div className="stat">
        <span className="stat-label">Original</span>
        <span className="stat-value">{formatBytes(source.bytes.byteLength)}</span>
        {source.width > 0 && (
          <span className="stat-sub">{source.width}×{source.height}</span>
        )}
      </div>
      <div className="stat">
        <span className="stat-label">Output</span>
        <span className="stat-value">
          {output ? formatBytes(output.bytes.byteLength) : "—"}
        </span>
        {output && (
          <span className="stat-sub">
            {output.width}×{output.height} · {Math.round(output.durationMs)}ms
          </span>
        )}
      </div>
      <div className="stat">
        <span className="stat-label">Change</span>
        <span className="stat-value">
          {output ? deltaPct(source.bytes.byteLength, output.bytes.byteLength) : "—"}
        </span>
      </div>
    </section>
  );

  const actions = source && (
    <div className="actions">
      {output && (
        <a className="btn primary" href={output.url} download={downloadName}>
          Download {FORMAT_META[format].label}
        </a>
      )}
      <button
        className="btn"
        type="button"
        onClick={() => {
          jobToken.current++;
          setSource(null);
          setOutput(null);
          setError(null);
          setWidth(null);
          setHeight(null);
        }}
      >
        Choose another
      </button>
    </div>
  );

  return (
    <main className={`app ${source ? "has-source" : ""}`}>
      {!source && <DropZone onFile={handleFile} />}

      {source && (
        <div className="workspace">
          <aside className="sidebar">
            <Controls
              format={format}
              quality={quality}
              width={width}
              height={height}
              aspectLocked={aspectLocked}
              naturalWidth={source.width}
              naturalHeight={source.height}
              onFormat={setFormat}
              onQuality={setQuality}
              onWidth={setWidth}
              onHeight={setHeight}
              onAspectLocked={setAspectLocked}
              onResetDimensions={resetDimensions}
            />
            {stats}
            {error && <div className="error">{error}</div>}
            {actions}
          </aside>

          <section className="stage">
            <ComparePreview
              sourceUrl={source.url}
              outputUrl={output?.url ?? null}
              busy={busy}
            />
          </section>
        </div>
      )}
    </main>
  );
}

function readDims(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("could not read dimensions"));
    img.src = url;
  });
}
