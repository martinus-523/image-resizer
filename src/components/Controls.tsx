import type { OutputFormat } from "../types";
import { FORMAT_META } from "../lib/format";

interface Props {
  format: OutputFormat;
  quality: number;
  width: number | null;
  height: number | null;
  aspectLocked: boolean;
  naturalWidth: number;
  naturalHeight: number;
  onFormat: (f: OutputFormat) => void;
  onQuality: (q: number) => void;
  onWidth: (w: number | null) => void;
  onHeight: (h: number | null) => void;
  onAspectLocked: (locked: boolean) => void;
  onResetDimensions: () => void;
}

export function Controls({
  format,
  quality,
  width,
  height,
  aspectLocked,
  naturalWidth,
  naturalHeight,
  onFormat,
  onQuality,
  onWidth,
  onHeight,
  onAspectLocked,
  onResetDimensions,
}: Props) {
  const supportsQuality = FORMAT_META[format].supportsQuality;
  const ratio = naturalWidth > 0 && naturalHeight > 0
    ? naturalWidth / naturalHeight
    : null;

  const handleWidthChange = (raw: string) => {
    const v = raw === "" ? null : Math.max(1, Math.floor(Number(raw)));
    if (v !== null && Number.isNaN(v)) return;
    onWidth(v);
    if (aspectLocked && ratio && v !== null) {
      onHeight(Math.max(1, Math.round(v / ratio)));
    }
  };

  const handleHeightChange = (raw: string) => {
    const v = raw === "" ? null : Math.max(1, Math.floor(Number(raw)));
    if (v !== null && Number.isNaN(v)) return;
    onHeight(v);
    if (aspectLocked && ratio && v !== null) {
      onWidth(Math.max(1, Math.round(v * ratio)));
    }
  };

  return (
    <section className="controls">
      <div className="control-row">
        <label className="control-label">Format</label>
        <div className="segmented">
          {(Object.keys(FORMAT_META) as OutputFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`segment ${format === f ? "active" : ""}`}
              onClick={() => onFormat(f)}
            >
              {FORMAT_META[f].label}
            </button>
          ))}
        </div>
      </div>

      <div className="control-row">
        <label className="control-label" htmlFor="quality">
          Quality <span className="control-value">{supportsQuality ? quality : "—"}</span>
        </label>
        <input
          id="quality"
          type="range"
          min={1}
          max={100}
          value={quality}
          disabled={!supportsQuality}
          onChange={(e) => onQuality(Number(e.target.value))}
        />
      </div>

      <div className="control-row">
        <div className="control-label">
          <span>Dimensions</span>
          {naturalWidth > 0 && (
            <button
              type="button"
              className="link-btn"
              onClick={onResetDimensions}
              title="Reset to original"
            >
              Reset
            </button>
          )}
        </div>
        <div className="dim-row">
          <input
            type="number"
            inputMode="numeric"
            className="dim-input"
            min={1}
            placeholder="W"
            value={width ?? ""}
            onChange={(e) => handleWidthChange(e.target.value)}
            aria-label="Width"
          />
          <input
            type="number"
            inputMode="numeric"
            className="dim-input"
            min={1}
            placeholder="H"
            value={height ?? ""}
            onChange={(e) => handleHeightChange(e.target.value)}
            aria-label="Height"
          />
          <button
            type="button"
            className={`lock-btn ${aspectLocked ? "active" : ""}`}
            onClick={() => onAspectLocked(!aspectLocked)}
            aria-pressed={aspectLocked}
            aria-label={aspectLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
            title={aspectLocked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
          >
            {aspectLocked ? "🔒" : "🔓"}
          </button>
        </div>
        {naturalWidth > 0 && (
          <span className="dim-hint">
            Original: {naturalWidth} × {naturalHeight}
          </span>
        )}
      </div>
    </section>
  );
}
