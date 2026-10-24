// Renders every app icon / splash / favicon PNG from the drawing defined below (a spiral
// notepad and a pencil, sticker style, in the app palette). Also writes it to
// assets/icon-source.svg for reference. Run: npm run icons
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// --- The drawing ------------------------------------------------------------------------
// Coordinates are in a 100×100 box. Colours come from the app palette (burgundy #6A0C1F,
// gold #C8A24A, cream #F6F1E7, charcoal #1A1A1A, grey #B3A7A0) plus lighter/darker shades.
const FULL = {
  ink: '#1A1A1A', // outlines and writing: the app's charcoal
  paper: '#FDF0D5',
  paperShade: '#F2DDB4',
  ring: '#C8A24A',
  ringShine: '#E6CC86',
  body: '#DDB24E',
  bodyStripe: '#C08E2A',
  eraser: '#8E1B33',
  eraserShine: '#B4384F',
  wood: '#F7DDB0',
  sticker: '#FFFFFF',
  shadow: '#D9CDB8',
  motion: '#B3A7A0',
};

const W = 3.2; // outline width

// Notepad: x 8–64, y 14–95. Pencil: x 72–91, y 9–97.
const PAD = 'M14 14H58Q64 14 64 20V89Q64 95 58 95H14Q8 95 8 89V20Q8 14 14 14Z';
const PAD_SHADE = 'M8 82H64V89Q64 95 58 95H14Q8 95 8 89Z';
const LINES = [36, 46, 56, 66, 76].map((y) => `M18 ${y}H54`);
const RINGS = [19, 32, 45].map((x) => ({ x, y: 5, w: 8, h: 18 }));
const PENCIL_BODY = 'M72 22H91V76H72Z';
const PENCIL_ERASER = 'M72 22V15Q72 9 78 9H85Q91 9 91 15V22Z';
const PENCIL_TIP = 'M72 76H91L81.5 97Z';
const PENCIL_LEAD = 'M78.4 90.2H84.6L81.5 97Z';
const PENCIL_OUTLINE = 'M72 22V15Q72 9 78 9H85Q91 9 91 15V76L81.5 97L72 76Z';

/** All the drawing's shapes, filled from `c` (a palette like FULL). */
function art(c, { sticker = true } = {}) {
  const ring = ({ x, y, w, h }) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="${c.ring}" stroke="${c.ink}" stroke-width="${W}"/>` +
    (c.ringShine ? `<rect x="${x + 2}" y="${y + 3}" width="1.8" height="${h - 9}" rx="0.9" fill="${c.ringShine}"/>` : '');
  return [
    // Sticker: a thick white border around everything, with a soft offset shadow below.
    sticker && c.shadow
      ? `<g transform="translate(2.2 2.6)" fill="${c.shadow}" stroke="${c.shadow}" stroke-width="9" stroke-linejoin="round">
           <path d="${PAD}"/><path d="${PENCIL_OUTLINE}"/>${RINGS.map(({ x, y, w, h }) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}"/>`).join('')}
         </g>`
      : '',
    sticker && c.sticker
      ? `<g fill="${c.sticker}" stroke="${c.sticker}" stroke-width="9" stroke-linejoin="round">
           <path d="${PAD}"/><path d="${PENCIL_OUTLINE}"/>${RINGS.map(({ x, y, w, h }) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}"/>`).join('')}
         </g>`
      : '',
    // Notepad.
    `<path d="${PAD}" fill="${c.paper}"/>`,
    c.paperShade ? `<path d="${PAD_SHADE}" fill="${c.paperShade}"/>` : '',
    `<path d="${PAD}" fill="none" stroke="${c.ink}" stroke-width="${W}"/>`,
    `<g stroke="${c.ink}" stroke-width="${W}" stroke-linecap="round">${LINES.map((d) => `<path d="${d}"/>`).join('')}</g>`,
    RINGS.map(ring).join(''),
    // Pencil.
    `<path d="${PENCIL_BODY}" fill="${c.body}"/>`,
    c.bodyStripe ? `<path d="M79.2 22H83.8V76H79.2Z" fill="${c.bodyStripe}"/>` : '',
    `<path d="${PENCIL_ERASER}" fill="${c.eraser}"/>`,
    c.eraserShine ? `<path d="M75.5 20V15.5Q75.5 12.5 78.5 12.5H80V20Z" fill="${c.eraserShine}"/>` : '',
    `<path d="${PENCIL_TIP}" fill="${c.wood}"/>`,
    `<path d="${PENCIL_LEAD}" fill="${c.ink}"/>`,
    `<path d="${PENCIL_OUTLINE}" fill="none" stroke="${c.ink}" stroke-width="${W}" stroke-linejoin="round"/>`,
    `<g stroke="${c.ink}" stroke-width="${W}" stroke-linecap="round"><path d="M72 22H91"/><path d="M72 76H91"/></g>`,
    // Motion marks, as in a cartoon "just wrote something".
    c.motion
      ? `<g fill="none" stroke="${c.motion}" stroke-width="2.4" stroke-linecap="round">
           <path d="M56 6Q61 4 64 7"/><path d="M58 1.5Q64 -0.5 68 3"/><path d="M98.5 27Q102.5 32 101.5 39"/>
         </g>`
      : '',
  ].join('');
}

// Bounds of the drawing including the sticker border, for centring.
const BOX = { x: 2, y: -3, w: 101.5, h: 105 };

/** The drawing at `fraction` of a `size` px canvas, centred. */
function place(size, fraction, inner) {
  const scale = (size * fraction) / Math.max(BOX.w, BOX.h);
  const tx = (size - BOX.w * scale) / 2 - BOX.x * scale;
  const ty = (size - BOX.h * scale) / 2 - BOX.y * scale;
  return `<g transform="translate(${tx} ${ty}) scale(${scale})">${inner}</g>`;
}

const svg = (size, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;

/** Soft cream tile with a top-left sheen (the OS rounds the corners itself). */
function background(size) {
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBF7EF"/><stop offset="1" stop-color="#EFE6D4"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.28" cy="0.18" r="0.75">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.7"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/><rect width="${size}" height="${size}" fill="url(#sheen)"/>`;
}

const icon = (size, fraction) => svg(size, background(size) + place(size, fraction, art(FULL)));
const transparent = (size, fraction) => svg(size, place(size, fraction, art(FULL)));

/**
 * Single-colour silhouette for Android's themed icon and status-bar icon: Android only uses
 * the alpha channel, so the writing lines and pencil stripe are cut out of a solid shape.
 */
function silhouette(size, fraction) {
  const cut = {
    ink: '#000000', paper: '#FFFFFF', ring: '#FFFFFF', body: '#FFFFFF', eraser: '#FFFFFF',
    wood: '#FFFFFF',
  };
  // Outline strokes count as part of the shape; lines and the lead are the holes.
  const shape = art({ ...cut, ink: '#FFFFFF' }, { sticker: false });
  const holes =
    `<g stroke="#000" stroke-width="${W}" stroke-linecap="round">${LINES.map((d) => `<path d="${d}"/>`).join('')}<path d="M72 22H91"/><path d="M72 76H91"/></g>`;
  return svg(
    size,
    `<defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}">
      ${place(size, fraction, shape + holes)}
    </mask></defs><rect width="${size}" height="${size}" fill="#FFFFFF" mask="url(#m)"/>`,
  );
}

// --- Budgets icon ---------------------------------------------------------------------------
// A money bag with a calculator in front (smooth, rounded shapes), drawn in a 100×100 box.
// Rendered as a white silhouette with the details cut out; the app tints it (Image tintColor).
const BAG_TOP =
  'M43.6 24.6C43.2 22.9 44.6 21.9 46.6 22.4C48.9 23 50.4 24.6 52.4 24.6C54.6 24.6 55.3 22 56.9 22' +
  'C58.5 22 59.2 24.6 61.4 24.6C63.4 24.6 64.9 23 67.2 22.4C69.2 21.9 70.6 22.9 70.2 24.6' +
  'C69.4 28.1 65.6 33.2 62.4 36.6L51.4 36.6C48.2 33.2 44.4 28.1 43.6 24.6Z';
const BAG_BODY =
  'M50.6 38.9L63.2 38.9C69.2 42.2 74.6 48.6 77.7 56.2C80.4 62.9 81 69.5 79.3 73.4' +
  'C77.4 77.5 71.2 78.3 63.6 78.3L46.4 78.3L46.4 46.2C45.1 45.5 43.9 44.8 43.9 44.2' +
  'C45.7 41.9 48.1 40.1 50.6 38.9Z';
const CALC = { x: 21.8, y: 44.1, w: 22.6, h: 33.6, r: 1.6 };
const CALC_GAP = 2.2;

function budgetIcon(size) {
  const keys = [];
  for (const ky of [58.8, 65, 71.2]) {
    for (const kx of [25.1, 31.4, 37.7]) keys.push(`<rect x="${kx}" y="${ky}" width="3.4" height="3.4" rx="0.5"/>`);
  }
  const s = size / 100;
  return svg(
    size,
    `<defs><mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}">
      <g transform="scale(${s})">
        <path d="${BAG_TOP}" fill="#fff"/>
        <path d="${BAG_BODY}" fill="#fff"/>
        <text x="57.3" y="67.6" text-anchor="middle" font-family="Arial, Helvetica" font-weight="700" font-size="30" fill="#000">$</text>
        <rect x="${CALC.x - CALC_GAP}" y="${CALC.y - CALC_GAP}" width="${CALC.w + 2 * CALC_GAP}" height="${CALC.h + 2 * CALC_GAP}" rx="${CALC.r + CALC_GAP}" fill="#000"/>
        <rect x="${CALC.x}" y="${CALC.y}" width="${CALC.w}" height="${CALC.h}" rx="${CALC.r}" fill="#fff"/>
        <rect x="25.1" y="50.3" width="16" height="5" rx="0.6" fill="#000"/>
        <g fill="#000">${keys.join('')}</g>
      </g>
    </mask></defs><rect width="${size}" height="${size}" fill="#FFFFFF" mask="url(#m)"/>`,
  );
}

// --- PNG output ---------------------------------------------------------------------------
const rgba = (s) => {
  // System fonts: the budgets icon's currency sign is text.
  const img = new Resvg(s, { font: { loadSystemFonts: true } }).render();
  return { width: img.width, height: img.height, pixels: img.pixels };
};

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

const write = (path, s, withAlpha) => {
  writeFileSync(new URL(`../${path}`, import.meta.url), encodePng(rgba(s), withAlpha));
  console.log('wrote', path);
};

writeFileSync(
  new URL('../assets/icon-source.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}">\n  <!-- Generated by scripts/generate-icons.mjs; edit the drawing there. -->\n  ${art(FULL)}\n</svg>\n`,
);
console.log('wrote assets/icon-source.svg');

// iOS / store icon: full-bleed cream, no alpha channel (App Store rejects transparency).
write('assets/icon.png', icon(1024, 0.74), false);
// Android adaptive icon: the OS masks it to a circle/squircle, so keep the drawing inside
// the central ~66% safe zone on a transparent foreground over a cream background layer.
write('assets/android-icon-background.png', svg(1024, background(1024)), false);
write('assets/android-icon-foreground.png', transparent(1024, 0.5), true);
// Themed (Material You) icon: Android only uses the alpha shape and tints it.
write('assets/android-icon-monochrome.png', silhouette(1024, 0.48), true);
// Android status-bar notification icon: white silhouette on transparent (Android tints it;
// a coloured or opaque image would show as a white square).
write('assets/notification-icon.png', silhouette(96, 0.9), true);
// Splash logo (shown centred on the cream splash background).
write('assets/splash-icon.png', transparent(1024, 0.9), true);
write('assets/favicon.png', icon(48, 0.86), false);
// Budgets button icon (tinted in the app).
write('assets/budget-icon.png', budgetIcon(192), true);
// Google Play listing icon (uploaded in Play Console, 512×512).
mkdirSync(new URL('../assets/store', import.meta.url), { recursive: true });
write('assets/store/play-store-icon-512.png', icon(512, 0.74), false);
