/**
 * Decorative tiles: the small square portraits that sit beside the headline
 * on banners and posts. Each style is a pure function of (seed, colours), so a
 * brand renders identically on every run and in every environment.
 *
 *   robots  — seeded robot faces from a fixed parts bin (the original look)
 *   shapes  — seeded geometric compositions (circles, arcs, stripes, dots)
 *   emoji   — one emoji or short glyph per tile, from `tiles.items`
 *   images  — the brand's own images (logos, products, faces), from `tiles.images`
 *   none    — no tiles; layouts give the headline the room instead
 */
import { esc, mix, rng, pick, isDark } from './util.js';

/** Colour set for one tile, derived from the brand theme and one palette colour. */
export function tileColors(theme, color) {
  const dark = isDark(theme.background);
  return {
    plate: mix(theme.background, color, dark ? 0.13 : 0.12),
    ink: dark ? mix(theme.text, color, 0.18) : mix(theme.text, color, 0.25),
    accent: color,
    halo: color,
  };
}

/* ------------------------------------------------------------- robots ---- */

function head(kind, ink) {
  const s = `fill="none" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"`;
  switch (kind) {
    case 0: return `<rect x="26" y="30" width="76" height="66" rx="20" ${s}/>`;
    case 1: return `<rect x="24" y="28" width="80" height="70" rx="34" ${s}/>`;
    case 2: return `<path d="M64 26 L102 46 V82 L64 102 L26 82 V46 Z" ${s}/>`;
    case 3: return `<rect x="28" y="26" width="72" height="72" rx="12" ${s}/>`;
    case 4: return `<path d="M28 40 Q28 26 42 26 H86 Q100 26 100 40 V74 Q100 100 64 104 Q28 100 28 74 Z" ${s}/>`;
    default: return `<path d="M40 28 H88 L102 44 V80 L88 98 H40 L26 80 V44 Z" ${s}/>`;
  }
}

function optics(kind, ink, accent) {
  const glow = `fill="${accent}"`;
  switch (kind) {
    case 0: return `<circle cx="50" cy="60" r="7" ${glow}/><circle cx="78" cy="60" r="7" ${glow}/>`;
    case 1: return `<rect x="40" y="52" width="48" height="16" rx="8" fill="${accent}" opacity="0.9"/><rect x="46" y="57" width="8" height="6" rx="3" fill="${ink}"/><rect x="74" y="57" width="8" height="6" rx="3" fill="${ink}"/>`;
    case 2: return `<circle cx="64" cy="60" r="13" fill="none" stroke="${accent}" stroke-width="4"/><circle cx="64" cy="60" r="5" ${glow}/>`;
    case 3: return `<rect x="42" y="53" width="16" height="14" rx="4" ${glow}/><rect x="70" y="53" width="16" height="14" rx="4" ${glow}/>`;
    case 4: return `<circle cx="50" cy="60" r="8" fill="none" stroke="${accent}" stroke-width="3.5"/><circle cx="78" cy="60" r="8" fill="none" stroke="${accent}" stroke-width="3.5"/>`;
    case 5: return `<rect x="42" y="57" width="18" height="5" rx="2.5" ${glow}/><rect x="68" y="57" width="18" height="5" rx="2.5" ${glow}/>`;
    case 6: return `<path d="M42 56 L58 62 L42 68 Z" ${glow}/><path d="M86 56 L70 62 L86 68 Z" ${glow}/>`;
    default: return `<circle cx="50" cy="58" r="6" ${glow}/><circle cx="78" cy="62" r="9" ${glow}/>`;
  }
}

function mouth(kind, ink, accent) {
  const s = `fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"`;
  switch (kind) {
    case 0: return `<rect x="50" y="76" width="28" height="12" rx="4" ${s}/><path d="M58 76 V88 M66 76 V88 M74 76 V88" stroke="${ink}" stroke-width="2"/>`;
    case 1: return `<path d="M52 78 Q64 90 76 78" ${s}/>`;
    case 2: return `<path d="M50 82 Q56 76 62 82 T74 82 T80 82" ${s}/>`;
    case 3: return `<circle cx="55" cy="82" r="2.6" fill="${ink}"/><circle cx="64" cy="82" r="2.6" fill="${ink}"/><circle cx="73" cy="82" r="2.6" fill="${ink}"/>`;
    case 4: return `<rect x="52" y="79" width="24" height="4" rx="2" fill="${ink}"/>`;
    default: return `<path d="M54 80 H74" ${s}/><path d="M60 80 V86 M68 80 V86" stroke="${accent}" stroke-width="2.5" stroke-linecap="round"/>`;
  }
}

function antenna(kind, ink, accent) {
  const s = `fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"`;
  switch (kind) {
    case 0: return `<path d="M64 26 V14" ${s}/><circle cx="64" cy="10" r="5" fill="${accent}"/>`;
    case 1: return `<path d="M46 28 L40 16 M82 28 L88 16" ${s}/><circle cx="39" cy="13" r="4" fill="${accent}"/><circle cx="89" cy="13" r="4" fill="${accent}"/>`;
    case 2: return `<path d="M64 26 V18" ${s}/><circle cx="64" cy="12" r="7" fill="none" stroke="${accent}" stroke-width="3"/>`;
    case 3: return `<rect x="52" y="14" width="24" height="7" rx="3.5" fill="${accent}"/><path d="M64 21 V27" ${s}/>`;
    case 4: return `<path d="M64 26 Q52 16 42 20" ${s}/><circle cx="40" cy="20" r="4" fill="${accent}"/>`;
    default: return '';
  }
}

function mounts(kind, ink) {
  const s = `fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round"`;
  switch (kind) {
    case 0: return `<path d="M22 54 V72 M106 54 V72" ${s}/>`;
    case 1: return `<rect x="14" y="52" width="10" height="22" rx="5" ${s}/><rect x="104" y="52" width="10" height="22" rx="5" ${s}/>`;
    case 2: return `<circle cx="20" cy="63" r="6" ${s}/><circle cx="108" cy="63" r="6" ${s}/>`;
    default: return '';
  }
}

function robot(seed, c) {
  const r = rng(seed);
  const h = Math.floor(r() * 6), o = Math.floor(r() * 8), m = Math.floor(r() * 6);
  const a = Math.floor(r() * 6), mo = Math.floor(r() * 4);
  const rot = (r() * 6 - 3).toFixed(2);
  return `<g transform="rotate(${rot} 64 64)">${mounts(mo, c.ink)}${head(h, c.ink)}${optics(o, c.ink, c.accent)}${mouth(m, c.ink, c.accent)}${antenna(a, c.ink, c.accent)}</g>`;
}

/* ------------------------------------------------------------- shapes ---- */

function shapes(seed, c) {
  const r = rng(seed);
  const parts = [];
  const layout = Math.floor(r() * 6);
  const ink = c.ink, acc = c.accent;
  switch (layout) {
    case 0: // big circle + offset ring
      parts.push(`<circle cx="56" cy="60" r="30" fill="${acc}"/>`, `<circle cx="80" cy="76" r="24" fill="none" stroke="${ink}" stroke-width="4"/>`);
      break;
    case 1: // quarter arcs
      parts.push(`<path d="M28 100 A72 72 0 0 1 100 28 V100 Z" fill="${acc}"/>`, `<path d="M28 100 A40 40 0 0 1 68 60" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`);
      break;
    case 2: // stripes in a rounded square
      parts.push(`<rect x="30" y="30" width="68" height="68" rx="16" fill="none" stroke="${ink}" stroke-width="4"/>`);
      for (let i = 0; i < 4; i++) parts.push(`<rect x="42" y="${42 + i * 12}" width="${44 - i * 8}" height="6" rx="3" fill="${acc}"/>`);
      break;
    case 3: // dot grid with one lit dot
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const lit = Math.floor(r() * 16) === y * 4 + x || (x === 2 && y === 1);
        parts.push(`<circle cx="${37 + x * 18}" cy="${37 + y * 18}" r="${lit ? 7 : 4}" fill="${lit ? acc : ink}" opacity="${lit ? 1 : 0.55}"/>`);
      }
      break;
    case 4: // triangle + bar
      parts.push(`<path d="M64 30 L98 90 H30 Z" fill="none" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`, `<circle cx="64" cy="70" r="11" fill="${acc}"/>`);
      break;
    default: // half-moon split
      parts.push(`<circle cx="64" cy="64" r="34" fill="none" stroke="${ink}" stroke-width="4"/>`, `<path d="M64 30 A34 34 0 0 1 64 98 Z" fill="${acc}"/>`);
  }
  const rot = Math.floor(r() * 4) * 90;
  return `<g transform="rotate(${rot} 64 64)">${parts.join('')}</g>`;
}

/* -------------------------------------------------------------- public ---- */

/**
 * One tile as an SVG string, `size` CSS px square.
 * `item` is the seed (robots/shapes), the character (emoji) or the image URL (images).
 */
export function tileSVG(style, item, color, theme, size, { radius = 0.22, plate = true } = {}) {
  const c = tileColors(theme, color);
  const rx = Math.round(128 * radius);
  const clip = `t${Math.abs(hashish(String(item) + style + color))}`;
  const bg = plate
    ? `<rect width="128" height="128" rx="${rx}" fill="${c.plate}"/><circle cx="104" cy="24" r="34" fill="${c.halo}" opacity="0.12" clip-path="url(#${clip})"/>`
    : '';
  let body = '';
  if (style === 'robots') body = robot(item, c);
  else if (style === 'shapes') body = shapes(item, c);
  else if (style === 'emoji') body = `<text x="64" y="66" text-anchor="middle" dominant-baseline="central" font-size="64" font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif" fill="${c.ink}">${esc(item)}</text>`;
  else if (style === 'images') body = `<image href="${esc(item)}" x="0" y="0" width="128" height="128" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}" role="img" aria-hidden="true"><defs><clipPath id="${clip}"><rect width="128" height="128" rx="${rx}"/></clipPath></defs>${bg}${body}</svg>`;
}

function hashish(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
}

/** Default seeds, used when a brand doesn't list its own. */
export const DEFAULT_SEEDS = [
  'north', 'east', 'south', 'west', 'spark', 'orbit', 'pixel', 'relay', 'harbor', 'signal',
  'atlas', 'ember', 'quartz', 'delta', 'lumen', 'cobalt', 'tide', 'fable', 'vector', 'bloom',
];

/**
 * The n tiles for a brand, starting at `offset`, cycling through the item
 * list and the palette so any count works.
 */
export function tiles(brand, n, size, offset = 0) {
  const { style } = brand.tiles;
  if (style === 'none' || n <= 0) return [];
  const items = brand.tiles.items.length ? brand.tiles.items : DEFAULT_SEEDS;
  const palette = brand.palette;
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = offset + i;
    const item = items[k % items.length];
    // Seeded styles pick a colour per seed so reordering keeps each tile's look;
    // user-supplied styles cycle the palette in order.
    const color = style === 'robots' || style === 'shapes'
      ? pick(rng(item + '#c'), palette)
      : palette[k % palette.length];
    out.push(tileSVG(style, item, color, brand.theme, size));
  }
  return out;
}
