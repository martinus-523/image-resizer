import * as Comlink from "comlink";
import type { ImageApi } from "../worker/imageWorker";

let cached: Comlink.Remote<ImageApi> | null = null;

export function getWorker(): Comlink.Remote<ImageApi> {
  if (cached) return cached;
  const worker = new Worker(
    new URL("../worker/imageWorker.ts", import.meta.url),
    { type: "module" },
  );
  cached = Comlink.wrap<ImageApi>(worker);
  return cached;
}
