// Read JPEG EXIF Orientation (TIFF tag 0x0112) and apply it to a decoded
// ImageData so the encoded output looks correct without carrying the tag.
// Returns 1 (no rotation) when there's no EXIF or no orientation tag.

export function readJpegOrientation(bytes: Uint8Array): number {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let offset = 2;
  const end = bytes.length;
  while (offset + 4 <= end) {
    if (bytes[offset] !== 0xff) return 1;
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xda || marker === 0xd9) return 1; // SOS/EOI: no more metadata
    if (offset + 2 > end) return 1;
    const segLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segLength < 2 || offset + segLength > end) return 1;
    if (marker === 0xe1 && segLength >= 14) {
      // APP1 — check for "Exif\0\0"
      if (
        bytes[offset + 2] === 0x45 &&
        bytes[offset + 3] === 0x78 &&
        bytes[offset + 4] === 0x69 &&
        bytes[offset + 5] === 0x66 &&
        bytes[offset + 6] === 0x00 &&
        bytes[offset + 7] === 0x00
      ) {
        return parseTiffOrientation(bytes, offset + 8, segLength - 8);
      }
    }
    offset += segLength;
  }
  return 1;
}

function parseTiffOrientation(bytes: Uint8Array, tiffStart: number, len: number): number {
  if (len < 8) return 1;
  const dv = new DataView(bytes.buffer, bytes.byteOffset + tiffStart, len);
  const littleEndian = dv.getUint16(0, false) === 0x4949;
  const magic = dv.getUint16(2, littleEndian);
  if (magic !== 0x002a) return 1;
  const ifd0 = dv.getUint32(4, littleEndian);
  if (ifd0 + 2 > len) return 1;
  const count = dv.getUint16(ifd0, littleEndian);
  for (let i = 0; i < count; i++) {
    const entry = ifd0 + 2 + i * 12;
    if (entry + 12 > len) break;
    const tag = dv.getUint16(entry, littleEndian);
    if (tag === 0x0112) {
      const value = dv.getUint16(entry + 8, littleEndian);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

// Apply a JPEG EXIF orientation (1..8) to an ImageData, returning a new
// ImageData with pixels rotated/flipped so it visually matches what a
// browser would render. Uses OffscreenCanvas (available in workers).
export function applyOrientation(image: ImageData, orientation: number): ImageData {
  if (orientation <= 1 || orientation > 8) return image;
  const { width: w, height: h } = image;
  const swapAxes = orientation >= 5;
  const outW = swapAxes ? h : w;
  const outH = swapAxes ? w : h;

  const src = new OffscreenCanvas(w, h);
  src.getContext("2d")!.putImageData(image, 0, 0);

  const dst = new OffscreenCanvas(outW, outH);
  const ctx = dst.getContext("2d")!;
  switch (orientation) {
    case 2:
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(w, h);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, h);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -h);
      break;
    case 7:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(w, -h);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-w, 0);
      break;
  }
  ctx.drawImage(src, 0, 0);
  return ctx.getImageData(0, 0, outW, outH);
}
