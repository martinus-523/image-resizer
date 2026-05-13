/// <reference lib="webworker" />
import * as Comlink from "comlink";
import type { Dimensions, InputFormat, ProcessOptions, ProcessResult } from "../types";
import { applyOrientation, readJpegOrientation } from "./orientation";

type Mime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic"
  | "image/heif";

function detectFormat(bytes: Uint8Array, mime: string): InputFormat {
  // Magic-byte sniffing so we don't trust the file extension alone.
  if (bytes.length >= 12) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
    if (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    ) return "png";
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) return "webp";
    // ISO base media file: bytes 4..8 = "ftyp", then a brand.
    if (
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
    ) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) {
        return "heic";
      }
    }
  }
  const m = mime.toLowerCase() as Mime;
  if (m === "image/jpeg") return "jpeg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/heic" || m === "image/heif") return "heic";
  throw new Error(`Unsupported input format (mime=${mime})`);
}

async function decode(bytes: Uint8Array, format: InputFormat): Promise<ImageData> {
  // jSquash decoders want a plain ArrayBuffer. Copy out of the Uint8Array view
  // in case the underlying buffer is a SharedArrayBuffer or has an offset.
  const buf = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  switch (format) {
    case "jpeg": {
      const { default: jpegDecode } = await import("@jsquash/jpeg/decode");
      const raw = await jpegDecode(buf);
      // mozjpeg ignores EXIF; rotate the pixels ourselves so the re-encoded
      // image (which carries no metadata) still looks visually correct.
      return applyOrientation(raw, readJpegOrientation(bytes));
    }
    case "png": {
      const { default: pngDecode } = await import("@jsquash/png/decode");
      return pngDecode(buf);
    }
    case "webp": {
      const { default: webpDecode } = await import("@jsquash/webp/decode");
      return webpDecode(buf);
    }
    case "heic":
      // libheif applies HEIC's own irot/imir transforms during decode, so the
      // ImageData it hands back is already display-oriented.
      return decodeHeic(bytes);
  }
}

async function decodeHeic(bytes: Uint8Array): Promise<ImageData> {
  const { default: libheif } = await import("libheif-js");
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(bytes);
  if (!images || images.length === 0) {
    throw new Error("HEIC file contains no decodable images");
  }
  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();
  const out = new ImageData(width, height);
  await new Promise<void>((resolve, reject) => {
    image.display(out, (display: ImageData | null) => {
      if (!display) reject(new Error("HEIC display failed"));
      else resolve();
    });
  });
  return out;
}

async function resize(
  image: ImageData,
  targetWidth: number | null,
  targetHeight: number | null,
): Promise<ImageData> {
  const w = targetWidth && targetWidth > 0 ? Math.round(targetWidth) : image.width;
  const h = targetHeight && targetHeight > 0 ? Math.round(targetHeight) : image.height;
  if (w === image.width && h === image.height) return image;
  const { default: resizeFn } = await import("@jsquash/resize");
  return resizeFn(image, {
    width: Math.max(1, w),
    height: Math.max(1, h),
    method: "lanczos3",
    premultiply: true,
    linearRGB: true,
  });
}

async function encode(
  image: ImageData,
  options: ProcessOptions,
): Promise<Uint8Array> {
  switch (options.format) {
    case "jpeg": {
      const { default: jpegEncode } = await import("@jsquash/jpeg/encode");
      const buf = await jpegEncode(image, { quality: options.quality });
      return new Uint8Array(buf);
    }
    case "webp": {
      const { default: webpEncode } = await import("@jsquash/webp/encode");
      const buf = await webpEncode(image, { quality: options.quality });
      return new Uint8Array(buf);
    }
    case "png": {
      const { default: pngEncode } = await import("@jsquash/png/encode");
      const buf = await pngEncode(image);
      return new Uint8Array(buf);
    }
  }
}

const api = {
  async process(
    input: Uint8Array,
    mime: string,
    options: ProcessOptions,
  ): Promise<ProcessResult> {
    const start = performance.now();
    const inputFormat = detectFormat(input, mime);
    const decoded = await decode(input, inputFormat);
    const resized = await resize(decoded, options.targetWidth, options.targetHeight);
    const bytes = await encode(resized, options);
    return {
      bytes,
      width: resized.width,
      height: resized.height,
      durationMs: performance.now() - start,
    };
  },
  async getDimensions(input: Uint8Array, mime: string): Promise<Dimensions> {
    const inputFormat = detectFormat(input, mime);
    const decoded = await decode(input, inputFormat);
    return { width: decoded.width, height: decoded.height };
  },
  detectFormat,
};

export type ImageApi = typeof api;

Comlink.expose(api);
