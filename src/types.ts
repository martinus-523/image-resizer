export type OutputFormat = "jpeg" | "webp" | "png";
export type InputFormat = OutputFormat | "heic";

export interface ProcessOptions {
  format: OutputFormat;
  quality: number;
  targetWidth: number | null;
  targetHeight: number | null;
}

export interface ProcessResult {
  bytes: Uint8Array;
  width: number;
  height: number;
  durationMs: number;
}

export interface Dimensions {
  width: number;
  height: number;
}
