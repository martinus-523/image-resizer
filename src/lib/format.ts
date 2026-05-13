import type { OutputFormat } from "../types";

export const FORMAT_META: Record<OutputFormat, { label: string; mime: string; ext: string; supportsQuality: boolean }> = {
  jpeg: { label: "JPEG", mime: "image/jpeg", ext: "jpg", supportsQuality: true },
  webp: { label: "WebP", mime: "image/webp", ext: "webp", supportsQuality: true },
  png: { label: "PNG", mime: "image/png", ext: "png", supportsQuality: false },
};

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function deltaPct(original: number, next: number): string {
  if (original === 0) return "—";
  const pct = ((next - original) / original) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
