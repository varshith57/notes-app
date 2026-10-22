// Renders every app icon / splash / favicon PNG from assets/icon-source.svg.
// Run: npm run icons
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BURGUNDY = '#6A0C1F';
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

// The note's paper (inside of the outline in icon-source.svg), filled white in the 3D icon
// so the drawing reads as a sheet of paper rather than just lines.
const PAGE =
  'M8.9 6.25H52.6L70.65 18.4V91.1Q70.65 93.75 68 93.75H8.9Q6.25 93.75 6.25 91.1V8.9Q6.25 6.25 8.9 6.25Z';

/**
 * Polished "3D" version: soft cream gradient with a top-left sheen, the drawing in a
 * burgundy gradient that looks raised (darker depth layer below it, light rim along its
 * top edges) and a soft drop shadow. All effects stay inside the square — the OS draws
 * the rounded tile itself. `background: false` renders the drawing alone (transparent).
 */
function compose3d(size, fraction, { background = true } = {}) {
  const scale = (size * fraction) / Math.max(bbox.width, bbox.height);
  const tx = (size - bbox.width * scale) / 2 - bbox.x * scale;
  const ty = (size - bbox.height * scale) / 2 - bbox.y * scale;
  const u = 1 / scale; // one output pixel, in drawing units
  const depth = 9 * (size / 1024) * u; // extrusion height
  const shadowY = 18 * (size / 1024) * u;
  const blur = 16 * (size / 1024);
  const rim = 3.5 * (size / 1024) * u;
  const weight = WEIGHT * 1.45; // a little puffier than the flat icon
  const art = (fill) =>
    `<g fill="${fill}" stroke="${fill}" stroke-width="${weight}" stroke-linejoin="round">${shapes}</g>`;
  const place = (inner, dy = 0) =>
    `<g transform="translate(${tx} ${ty + dy * scale}) scale(${scale})">${inner}</g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFCF5"/><stop offset="1" stop-color="#EADFC9"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.28" cy="0.18" r="0.75">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.75"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ink" gradientUnits="userSpaceOnUse" x1="0" y1="${bbox.y}" x2="0" y2="${bbox.y + bbox.height}">
      <stop offset="0" stop-color="#B0304A"/><stop offset="0.55" stop-color="${BURGUNDY}"/><stop offset="1" stop-color="#4C0915"/>
    </linearGradient>
    <linearGradient id="paper" gradientUnits="userSpaceOnUse" x1="0" y1="6" x2="0" y2="94">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F1E8D8"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="${blur}"/>
    </filter>
    <mask id="rim" maskUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}">
      ${place(art('#FFFFFF'))}
      ${place(art('#000000'), rim)}
    </mask>
  </defs>
  ${background ? `<rect width="${size}" height="${size}" fill="url(#bg)"/><rect width="${size}" height="${size}" fill="url(#sheen)"/>` : ''}
  <g filter="url(#shadow)" opacity="0.45">${place(art('#2A040B'), shadowY)}${place(`<path d="${PAGE}" fill="#2A040B"/>`, shadowY)}</g>
  ${place(`<path d="${PAGE}" fill="url(#paper)"/>`)}
  ${place(art('#3E0710'), depth)}
  ${place(art('url(#ink)'))}
  <rect width="${size}" height="${size}" fill="#FFFFFF" opacity="0.5" mask="url(#rim)"/>
</svg>`;
}

/** Just the 3D icon's cream gradient + sheen (Android adaptive icon background layer). */
function background3d(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFCF5"/><stop offset="1" stop-color="#EADFC9"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.28" cy="0.18" r="0.75">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.75"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/><rect width="${size}" height="${size}" fill="url(#sheen)"/>
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
write('assets/icon.png', compose3d(1024, 0.62), false);
// Android adaptive icon: the OS masks it to a circle/squircle, so keep the drawing inside
// the central ~66% safe zone on a transparent foreground over a cream background layer.
write('assets/android-icon-background.png', background3d(1024), false);
write('assets/android-icon-foreground.png', compose3d(1024, 0.42, { background: false }), true);
// Themed (Material You) icon: Android only uses the alpha shape and tints it, so it stays flat.
// The notification icon must be a flat silhouette too.
write('assets/android-icon-monochrome.png', compose(1024, 0.42, WHITE, null), true);
// Android status-bar notification icon: white silhouette on transparent (Android tints it;
// a coloured or opaque image would show as a white square).
write('assets/notification-icon.png', compose(96, 0.84, WHITE, null), true);
// Splash logo (shown centred on the cream splash background).
write('assets/splash-icon.png', compose3d(1024, 0.86, { background: false }), true);
write('assets/favicon.png', compose3d(48, 0.78), false);
// Google Play listing icon (uploaded in Play Console, 512×512).
mkdirSync(new URL('../assets/store', import.meta.url), { recursive: true });
write('assets/store/play-store-icon-512.png', compose3d(512, 0.62), false);
