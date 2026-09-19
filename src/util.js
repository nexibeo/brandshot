/**
 * Small helpers shared by the templates, the tile generators, the CLI and the
 * browser studio. No Node or DOM APIs here, so every module that imports this
 * runs unchanged in both places.
 */

/** Escape text for use inside HTML element content or a quoted attribute. */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Brand text markup: `*word*` is drawn in the accent colour and a newline is a
 * forced line break. Everything else is escaped.
 */
export function markup(text) {
  return esc(text)
    .replace(/\*([^*]+)\*/g, '<span class="accent">$1</span>')
    .replace(/\r?\n/g, '<br/>');
}

/** The same text with the markup removed, for alt text and length checks. */
export const plain = (text) => String(text ?? '').replace(/\*/g, '').replace(/\s*\n\s*/g, ' ').trim();

/* ---------------------------------------------------------------- colour -- */

export function rgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const hex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

/** Linear mix: t=0 gives a, t=1 gives b. */
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return hex(A.map((v, i) => v + (B[i] - v) * t));
}

/** Hex colour with an alpha channel, for CSS. */
export const alpha = (c, a) => hex(rgb(c)) + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');

/** WCAG relative luminance. */
export function luminance(c) {
  const [r, g, b] = rgb(c).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const isDark = (c) => luminance(c) < 0.35;

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------------------------------------------------------------- random -- */

/** FNV-1a, so the same seed always yields the same tile. */
export function hash(seed) {
  let h = 0x811c9dc5;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** xorshift32 stream seeded from a string. */
export function rng(seed) {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 0x100000000;
  };
}

export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

/* ---------------------------------------------------------- config (URL) -- */

/** Base64url of UTF-8 JSON, so a brand config fits in a link fragment. */
export function encodeConfig(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeConfig(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}
