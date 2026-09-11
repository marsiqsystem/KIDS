/**
 * Build every launcher icon, for Android and for the web, from one logo.
 *
 *   node native/build-icons.mjs
 *
 * Run it when public/android-chrome-512x512.png changes. Nothing else reads
 * that file to make an icon, so without this the app silently keeps the old
 * one at four different sizes.
 *
 * What it is fixing, so it is not undone by the next person who regenerates
 * icons with a web tool: until 11 Sep 2026 ONE 512x512 file was copied into
 * every density AND into all three roles, foreground included - twenty
 * identical 253 KB copies. An adaptive icon"s foreground has its outer quarter
 * cropped away by whatever mask the launcher draws, so full-bleed artwork gets
 * eaten: the circle cut through the logo"s square and took the figure"s leg.
 *
 * The rules that matter:
 *   - The artwork sits at 62% of the adaptive canvas. The safe zone allows
 *     66.7%, but the guarantee is only that the inner 72dp is never CLIPPED,
 *     and a squircle takes more off the corners than a circle does.
 *   - The backdrop is the artwork itself, blown up and blurred, over Design"s
 *     --gradient-sky. A flat colour or a freshly drawn gradient both leave a
 *     seam along the square"s edge, because the square carries its own
 *     compressed gradient.
 *   - The iOS icon is FLATTENED. iOS composites a home-screen icon onto black
 *     wherever it is transparent, so a transparent margin comes out as black
 *     wings around the artwork.
 *
 * Check the result by rendering what a launcher draws - crop to the 72dp
 * viewport, then apply a circle and a squircle - not by looking at the files.
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RES = join(ROOT, "android/app/src/main/res");
const SRC = join(ROOT, "public/android-chrome-512x512.png");
const PUBLIC = join(ROOT, "public");


const TEAL_DARK = { r: 0x0c, g: 0x2a, b: 0x2e };
const TEAL = { r: 0x1e, g: 0x9e, b: 0x8c };

/** Adaptive icons are 108dp; the middle 72dp is all that is guaranteed to show. */
const ADAPTIVE = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
/** The legacy square/round icons are 48dp. */
const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

/**
 * The backdrop.
 *
 * Not a flat colour and not Design"s --gradient-sky drawn from scratch: either
 * leaves a visible seam where the artwork"s own square sits on it, because the
 * square carries its own compressed gradient. Instead the artwork is blown up
 * to cover the canvas and blurred, so whatever colour the foreground has at any
 * point, the background has it too. The result reads as one picture rather than
 * a sticker on a card.
 *
 * The sky gradient remains underneath it as the floor, for the corners the
 * blown-up artwork does not reach.
 */
async function backdrop(size) {
  const cover = await sharp(SRC)
    .trim({ threshold: 10 })
    .resize(size, size, { fit: "cover", position: "centre" })
    .blur(Math.max(2, size / 12))
    .toBuffer();
  return sharp(skyPng(size))
    .composite([{ input: cover }])
    .png()
    .toBuffer();
}

/** --gradient-sky, rendered. Vertical, teal-dark at the top. */
function skyPng(size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgb(${TEAL_DARK.r},${TEAL_DARK.g},${TEAL_DARK.b})"/>
      <stop offset="100%" stop-color="rgb(${TEAL.r},${TEAL.g},${TEAL.b})"/>
    </linearGradient></defs>
    <rect width="${size}" height="${size}" fill="url(#s)"/>
  </svg>`;
  return Buffer.from(svg);
}

function circleMask(size) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>
     </svg>`,
  );
}

/**
 * The artwork, trimmed of its transparent margin and scaled to `fraction` of a
 * square canvas of `size`. 0.62 rather than the 0.667 the safe zone allows:
 * the guarantee is that the inner 72dp is never clipped, not that it looks
 * comfortable there, and a launcher that draws a squircle takes more off the
 * corners than a circle does.
 */
async function artwork(size, fraction) {
  const inner = Math.round(size * fraction);
  const trimmed = await sharp(SRC).trim({ threshold: 10 }).toBuffer();
  const fitted = await sharp(trimmed)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: fitted, gravity: "centre" }])
    .png()
    .toBuffer();
}

for (const [density, size] of Object.entries(ADAPTIVE)) {
  const dir = join(RES, `mipmap-${density}`);
  mkdirSync(dir, { recursive: true });

  writeFileSync(
    join(dir, "ic_launcher_foreground.png"),
    await artwork(size, 0.62),
  );
  writeFileSync(
    join(dir, "ic_launcher_background.png"),
    await backdrop(size),
  );

  // Legacy, for Android 7 and anything that ignores the adaptive icon: the two
  // layers already flattened, square and round.
  const legacy = LEGACY[density];
  const flat = await sharp(await backdrop(legacy))
    .composite([{ input: await artwork(legacy, 0.70), gravity: "centre" }])
    .png()
    .toBuffer();
  writeFileSync(join(dir, "ic_launcher.png"), flat);
  writeFileSync(
    join(dir, "ic_launcher_round.png"),
    await sharp(flat)
      .composite([{ input: circleMask(legacy), blend: "dest-in" }])
      .png()
      .toBuffer(),
  );
}

// The adaptive icon now has a drawable background, not a colour.
const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
for (const f of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
  writeFileSync(join(RES, "mipmap-anydpi-v26", f), xml, "utf8");
}



/**
 * iOS. 180x180, and FLATTENED — iOS composites a home-screen icon onto black
 * wherever it is transparent, so the old one's transparent margin came out as
 * black wings around the artwork. It then rounds the corners with a superellipse,
 * which is why the artwork is kept to 74%.
 */
const apple = await sharp(await backdrop(180))
  .composite([{ input: await artwork(180, 0.74), gravity: "centre" }])
  .flatten({ background: { r: 0x0c, g: 0x2a, b: 0x2e } })
  .removeAlpha()
  .png()
  .toBuffer();
writeFileSync(`${PUBLIC}/apple-touch-icon.png`, apple);

/**
 * The maskable PWA icons. Android crops a maskable icon to whatever shape the
 * launcher uses, exactly as it does a native adaptive icon, so these keep the
 * same safe margin. The plain square originals stay as they are for anything
 * that wants an un-cropped icon.
 */
for (const size of [192, 512]) {
  const out = await sharp(await backdrop(size))
    .composite([{ input: await artwork(size, 0.62), gravity: "centre" }])
    .flatten({ background: { r: 0x0c, g: 0x2a, b: 0x2e } })
  .removeAlpha()
    .png()
    .toBuffer();
  writeFileSync(`${PUBLIC}/maskable-icon-${size}.png`, out);
}


console.log("icons rebuilt: android mipmaps, apple-touch-icon, maskable web icons");
