import { useState } from "react";

interface Props {
  sourceUrl: string;
  outputUrl: string | null;
  busy: boolean;
}

export function ComparePreview({ sourceUrl, outputUrl, busy }: Props) {
  const [split, setSplit] = useState(50);

  return (
    <section className="preview">
      <div className="preview-stage">
        <img src={sourceUrl} alt="original" className="preview-img base" />
        {outputUrl && (
          <div
            className="preview-overlay"
            style={{ clipPath: `inset(0 0 0 ${split}%)` }}
          >
            <img src={outputUrl} alt="output" className="preview-img" />
          </div>
        )}
        {outputUrl && (
          <div className="preview-divider" style={{ left: `${split}%` }} aria-hidden />
        )}
        {busy && <div className="preview-spinner" aria-hidden />}
      </div>

      {outputUrl && (
        <div className="preview-slider-row">
          <span className="preview-slider-label">Original</span>
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            className="preview-slider"
            aria-label="Compare slider"
          />
          <span className="preview-slider-label">Output</span>
        </div>
      )}
    </section>
  );
}
