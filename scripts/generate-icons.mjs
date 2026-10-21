// Renders every app icon / splash / favicon PNG from assets/icon-source.svg.
// Run: npm run icons
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BURGUNDY = '#6A0C1F';
const CREAM = '#F6F1E7';
const WHITE = '#FFFFFF';
// Extra outline (viewBox units) that thickens the thin line art so it stays legible at
// home-screen (~60px) and Settings (~29px) sizes.
const WEIGHT = 1.4;

const source = readFileSync(new URL('../assets/icon-source.svg', import.meta.url), 'utf8');
const shapes = source.match(/<g[^>]*>([\s\S]*)<\/g>/)[1];

// Tight bounds of the drawing (in viewBox units) so it can be centred and sized exactly.
const bbox = new Resvg(source).innerBBox();

/** SVG of `size` px with the drawing filling `fraction` of the canvas, centred. */
function compose(size, fraction, fill, background) {
  const scale = (size * fraction) / Math.max(bbox.width, bbox.height);
  const tx = (size - bbox.width * scale) / 2 - bbox.x * scale;
  const ty = (size - bbox.height * scale) / 2 - bbox.y * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
  <g fill="${fill}" stroke="${fill}" stroke-width="${WEIGHT}" stroke-linejoin="round" transform="translate(${tx} ${ty}) scale(${scale})">${shapes}</g>
</svg>`;
}

const rgba = (svg) => {
  const img = new Resvg(svg).render();
  return { width: img.width, height: img.height, pixels: img.pixels };
};

// --- Minimal PNG encoder (RGB or RGBA, 8-bit) -------------------------------------------
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function encodePng({ width, height, pixels }, withAlpha) {
  const channels = withAlpha ? 4 : 3;
  const raw = Buffer.alloc((width * channels + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * channels + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = row + 1 + x * channels;
      raw[dst] = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      if (withAlpha) raw[dst + 3] = pixels[src + 3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = withAlpha ? 6 : 2; // colour type: RGBA / RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const write = (path, svg, withAlpha) => {
  writeFileSync(new URL(`../${path}`, import.meta.url), encodePng(rgba(svg), withAlpha));
  console.log('wrote', path);
};

// iOS / store icon: full-bleed cream, no alpha channel (App Store rejects transparency).
write('assets/icon.png', compose(1024, 0.62, BURGUNDY, CREAM), false);
// Android adaptive icon: the OS masks it to a circle/squircle, so keep the drawing inside
// the central ~66% safe zone on a transparent foreground over a cream background layer.
write('assets/android-icon-background.png', compose(1024, 0, CREAM, CREAM), false);
write('assets/android-icon-foreground.png', compose(1024, 0.42, BURGUNDY, null), true);
// Themed (Material You) icon: Android only uses the alpha shape and tints it.
write('assets/android-icon-monochrome.png', compose(1024, 0.42, WHITE, null), true);
// Android status-bar notification icon: white silhouette on transparent (Android tints it;
// a coloured or opaque image would show as a white square).
write('assets/notification-icon.png', compose(96, 0.84, WHITE, null), true);
// Splash logo (shown centred on the cream splash background).
write('assets/splash-icon.png', compose(1024, 0.9, BURGUNDY, null), true);
write('assets/favicon.png', compose(48, 0.78, BURGUNDY, CREAM), false);
// Google Play listing icon (uploaded in Play Console, 512×512).
mkdirSync(new URL('../assets/store', import.meta.url), { recursive: true });
write('assets/store/play-store-icon-512.png', compose(512, 0.62, BURGUNDY, CREAM), false);
