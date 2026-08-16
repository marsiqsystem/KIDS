/**
 * A QR code as inline SVG, for print.
 *
 * Inline vector rather than a raster: this is printed at 32 mm, and a PNG at
 * that size prints soft enough that a cheap phone camera struggles with it. An
 * SVG path is exact at any size and costs about 2 KB.
 *
 * The payload is always the student's own verification link — the same one on
 * their admit card, regenerated from `signUid` rather than stored. Nothing else
 * is ever encoded here.
 *
 * Runs of dark modules are emitted as one horizontal `h` segment each instead
 * of a rect per module, which is what keeps it small: ~45×45 modules would be
 * 2,000 elements drawn naively.
 */
import QRCode from "qrcode";

export function qrSvg(text: string, className = "qr"): string {
  // Medium error correction, and a 4-module quiet zone — the printed minimum.
  // A marksheet gets folded and photocopied; M survives that, L often does not.
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const quiet = 4;
  const dim = size + quiet * 2;

  const parts: string[] = [];
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (data[y * size + x]) {
        let run = 1;
        while (x + run < size && data[y * size + x + run]) run++;
        parts.push(`M${x + quiet} ${y + quiet}h${run}v1h-${run}z`);
        x += run;
      } else {
        x++;
      }
    }
  }

  return (
    `<svg class="${className}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" ` +
    `role="img" aria-label="Verification QR code">` +
    `<rect width="${dim}" height="${dim}" fill="#fff"/>` +
    `<path fill="#2B1A1C" d="${parts.join("")}"/></svg>`
  );
}
