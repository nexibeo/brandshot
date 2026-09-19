/**
 * Layouts. Each asset is a self-contained HTML page at the asset's CSS size;
 * the CLI screenshots it with headless Chrome and the studio rasterises it in
 * the browser, so both produce the same pixels from the same markup.
 *
 * Every layout places its text inside the asset's `content` box: the part of
 * the canvas that every device shows and no avatar or UI covers. Headlines
 * are fitted to their box by a tiny script after the web fonts load, so any
 * brand copy works without hand-tuned font sizes.
 */
import { esc, markup, plain, mix, alpha, isDark } from './util.js';
import { tiles } from './tiles.js';

/* ------------------------------------------------------------ brand ------ */

const DEFAULT_THEME = {
  background: '#0E1116',
  text: '#E6EAF0',
  muted: '#8D99A9',
  accent: '#FF7A1A',
  accent2: '#35D6C3',
};

const DEFAULT_FONTS = {
  display: { family: 'Archivo', weight: 800 },
  mono: { family: 'IBM Plex Mono', weight: 500 },
};

function parseFont(f, fallback) {
  if (!f) return { ...fallback };
  if (typeof f === 'string') {
    const [family, weight] = f.split(':');
    return { family: family.trim(), weight: Number(weight) || fallback.weight };
  }
  return { family: f.family ?? fallback.family, weight: Number(f.weight) || fallback.weight };
}

/**
 * Fill every optional field so templates never branch on missing config.
 * Accepts the documented brand.json shape (see brand.schema.json).
 */
export function normalizeBrand(input = {}) {
  const theme = { ...DEFAULT_THEME, ...(input.theme ?? {}) };
  const dark = isDark(theme.background);
  theme.grid ??= alpha(mix(theme.background, theme.text, dark ? 0.16 : 0.12), 0.55);
  const t = input.tiles ?? {};
  const style = t.style ?? (t.images?.length ? 'images' : t.items?.length ? 'robots' : 'shapes');
  const items = style === 'images' ? (t.images ?? t.items ?? []) : (t.items ?? t.seeds ?? []);
  const name = input.name ?? 'Your Brand';
  return {
    name,
    wordmark: input.wordmark || name,
    headline: input.headline || name,
    tagline: input.tagline ?? '',
    url: input.url ?? '',
    logo: input.logo ?? '',              // data: URL or inline <svg>; the CLI resolves file paths
    monogram: input.monogram ?? plain(name).replace(/[^\p{L}\p{N}]/gu, '').slice(0, 1).toUpperCase(),
    theme,
    palette: input.palette?.length ? input.palette : [theme.accent, theme.accent2],
    fonts: {
      display: parseFont(input.fonts?.display, DEFAULT_FONTS.display),
      mono: parseFont(input.fonts?.mono, DEFAULT_FONTS.mono),
      google: input.fonts?.google !== false,
    },
    tiles: { style, items },
    background: { grid: input.background?.grid !== false, glow: input.background?.glow !== false },
  };
}

/* ------------------------------------------------------------ page ------- */

function fontLink(fonts) {
  if (!fonts.google) return '';
  const fam = (f, weights) => `family=${encodeURIComponent(f.family).replace(/%20/g, '+')}:wght@${[...new Set(weights)].sort((a, b) => a - b).join(';')}`;
  const sameFamily = fonts.display.family === fonts.mono.family;
  // 500 is for the tagline; the display weight is for everything else.
  const q = sameFamily
    ? [fam(fonts.display, [fonts.display.weight, fonts.mono.weight, 500])]
    : [fam(fonts.display, [fonts.display.weight, 500]), fam(fonts.mono, [fonts.mono.weight])];
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" crossorigin="anonymous" href="https://fonts.googleapis.com/css2?${q.join('&')}&display=block">`;
}

/**
 * Shrink every [data-fit] element until its content fits its box, then flag
 * the page as ready. Runs after fonts load so measurements use the real face.
 */
const FIT_SCRIPT = `<script>
(function(){
  function fit(){
    document.querySelectorAll('[data-fit]').forEach(function(el){
      // Glyphs of fonts with tall ascenders paint a little outside their line
      // boxes, so allow a fraction of an em before calling it overflow. A real
      // extra line is a whole em and is still caught.
      var s=parseFloat(getComputedStyle(el).fontSize), min=+el.dataset.min||8, guard=400;
      function over(){ return el.scrollWidth>el.clientWidth+Math.max(1,s*0.04) || el.scrollHeight>el.clientHeight+Math.max(2,s*0.3); }
      while(guard-- && s>min && over()){
        s=Math.max(min, s*0.97); el.style.fontSize=s+'px';
      }
    });
    document.documentElement.setAttribute('data-ready','1');
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function(){ setTimeout(fit, 30); });
})();
</script>`;

function page(brand, w, h, css, body) {
  const { theme, fonts } = brand;
  const dark = isDark(theme.background);
  const display = `'${fonts.display.family}', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
  const mono = `'${fonts.mono.family}', ui-monospace, 'SF Mono', Menlo, monospace`;
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=${w}"/>
${fontLink(fonts)}
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${w}px;height:${h}px;overflow:hidden;background:${theme.background}}
  body{position:relative;font-family:${display};font-weight:${fonts.display.weight};color:${theme.text};
       -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
  .bg{position:absolute;inset:0;overflow:hidden}
  .grid{position:absolute;inset:0;background-image:linear-gradient(to right,${theme.grid} 1px,transparent 1px),linear-gradient(to bottom,${theme.grid} 1px,transparent 1px)}
  .glow{position:absolute;border-radius:50%}
  .accent{color:${theme.accent}}
  .mono{font-family:${mono};font-weight:${fonts.mono.weight};color:${theme.muted};letter-spacing:.02em;white-space:nowrap}
  .wordmark{font-weight:${fonts.display.weight};letter-spacing:-.03em;white-space:nowrap;line-height:1}
  .brand{display:flex;align-items:center;min-width:0}
  .brand img,.brand svg{display:block;flex:none}
  h1{font-weight:${fonts.display.weight};letter-spacing:-.035em;line-height:1.04;text-wrap:balance;overflow:visible;padding-bottom:.12em}
  h1.lines{white-space:nowrap}
  .tagline{color:${theme.muted};font-weight:500;letter-spacing:-.01em;line-height:1.3}
  .tile svg{display:block}
  .tiles{display:grid;flex:none}
  ${dark ? '' : '.glow{mix-blend-mode:multiply}'}
  ${css}
</style></head><body>${body}${FIT_SCRIPT}</body></html>`;
}

/** Grid and two soft colour glows, scaled to the canvas. */
function background(brand, w, h, { gridDiv = 7, strength = 1 } = {}) {
  const { theme } = brand;
  if (!brand.background.grid && !brand.background.glow) return '<div class="bg"></div>';
  const dark = isDark(theme.background);
  const m = Math.min(w, h);
  const cell = Math.max(24, Math.round(m / gridDiv));
  const blur = Math.round(m * 0.2);
  const a1 = (dark ? 0.16 : 0.12) * strength, a2 = (dark ? 0.1 : 0.08) * strength;
  const g1 = `width:${Math.round(w * 0.55)}px;height:${Math.round(h * 0.75)}px;top:${-Math.round(h * 0.35)}px;right:${Math.round(w * 0.04)}px;background:${theme.accent};opacity:${a1};filter:blur(${blur}px)`;
  const g2 = `width:${Math.round(w * 0.4)}px;height:${Math.round(h * 0.6)}px;bottom:${-Math.round(h * 0.3)}px;left:${-Math.round(w * 0.05)}px;background:${theme.accent2};opacity:${a2};filter:blur(${blur}px)`;
  return `<div class="bg">${brand.background.grid ? `<div class="grid" style="background-size:${cell}px ${cell}px;opacity:${dark ? 0.6 : 0.5}"></div>` : ''}${brand.background.glow ? `<div class="glow" style="${g1}"></div><div class="glow" style="${g2}"></div>` : ''}</div>`;
}

/* ------------------------------------------------------------ pieces ----- */

/** The brand's logo mark at `size` px, or a monogram plate when there is no logo. */
function logoMark(brand, size, { plate = false } = {}) {
  const { logo, theme } = brand;
  if (logo) {
    if (logo.trim().startsWith('<svg')) {
      return logo.replace(/<svg\b/, `<svg width="${size}" height="${size}" style="display:block;flex:none"`);
    }
    return `<img src="${esc(logo)}" width="${size}" height="${size}" style="object-fit:contain" alt=""/>`;
  }
  const r = Math.round(size * 0.24);
  const fill = plate ? theme.accent : 'transparent';
  const ink = plate ? (isDark(theme.accent) ? '#ffffff' : '#0b0b0b') : theme.accent;
  return `<div style="width:${size}px;height:${size}px;border-radius:${r}px;background:${fill};color:${ink};display:grid;place-items:center;font-size:${Math.round(size * 0.62)}px;line-height:1;letter-spacing:-.04em;flex:none">${esc(brand.monogram)}</div>`;
}

function brandRow(brand, size) {
  return `<div class="brand" style="gap:${Math.round(size * 0.36)}px">${logoMark(brand, size, { plate: true })}<span class="wordmark" style="font-size:${Math.round(size * 0.68)}px">${markup(brand.wordmark)}</span></div>`;
}

/**
 * The headline. When the copy contains explicit line breaks those are the
 * author's lines: they never wrap, and the font shrinks to fit instead.
 */
function headline(brand, min) {
  const lines = /\n/.test(brand.headline);
  return `<h1 data-fit data-min="${min}"${lines ? ' class="lines"' : ''}>${markup(brand.headline)}</h1>`;
}

function tileGrid(brand, cols, rows, t, gap, offset = 0, extraStyle = '') {
  const list = tiles(brand, cols * rows, t, offset);
  if (!list.length) return '';
  return `<div class="tiles" style="grid-template-columns:repeat(${cols},${t}px);gap:${gap}px;${extraStyle}">${list.map((s) => `<div class="tile">${s}</div>`).join('')}</div>`;
}

/* ------------------------------------------------------------ layouts ---- */

/** Square avatar: the mark inside the central ~70%, so a circle crop never clips it. */
function profile(brand, asset) {
  const { w, h } = asset;
  const s = Math.round(Math.min(w, h) * (brand.logo ? 0.64 : 0.56));
  const mark = brand.logo ? logoMark(brand, s) : logoMark(brand, s, { plate: true });
  return page(brand, w, h, `.wrap{position:absolute;inset:0;display:grid;place-items:center}`,
    `${background(brand, w, h, { gridDiv: 9 })}<div class="wrap">${mark}</div>`);
}

/**
 * Wide banner: text column on the left of the content box, tile cluster on the
 * right. Canvases much larger than their content box (YouTube, Facebook) get
 * faded decorative tile columns in the margins, which platforms may crop.
 */
function banner(brand, asset) {
  const { w, h } = asset;
  const c = asset.content;
  const hasTiles = brand.tiles.style !== 'none';
  const ratio = c.w / c.h;
  const rows = c.h >= 340 ? 2 : 1;
  let t = rows === 2 ? Math.round(c.h * 0.3) : Math.round(c.h * 0.52);
  if (rows === 2 && ratio < 2.6) t = Math.round(Math.min(t, c.w * 0.115));
  t = Math.min(t, 190);
  const gap = Math.round(t * 0.12);
  let cols = 0;
  if (hasTiles && ratio >= 2.1) {
    cols = rows === 2 ? 3 : Math.max(1, Math.min(6, Math.floor((c.w * (ratio > 4.5 ? 0.46 : 0.4)) / (t + gap))));
    if (rows === 1 && ratio < 3) cols = Math.min(cols, 3);
  }
  const tilesW = cols ? cols * t + (cols - 1) * gap : 0;
  const colGap = cols ? Math.round(Math.max(c.h * 0.14, 24)) : 0;
  const textW = c.w - tilesW - colGap;

  const showBrand = c.h >= 250 && !asset.noBrandRow;
  const bSize = Math.round(Math.min(c.h * 0.105, 56));
  const urlSize = Math.max(11, Math.round(Math.min(c.h * 0.068, 34)));
  const tagSize = Math.max(11, Math.round(Math.min(c.h * 0.05, 28)));
  const hasTag = !!brand.tagline && c.h >= 300;
  const hasUrl = !!brand.url;
  // Height budget for the headline after the other rows take their share.
  const other = (showBrand ? bSize * 1.6 : 0) + (hasUrl ? urlSize * 2.1 : 0) + (hasTag ? tagSize * 2.2 : 0);
  const hlH = Math.max(c.h * 0.3, c.h - other - c.h * 0.08);
  const hlSize = Math.round(Math.min(hlH * 0.5, textW * 0.14, 170));

  const decor = asset.decor === 'sides' && hasTiles ? sideDecor(brand, asset, Math.round(Math.min(t * 1.1, 150))) : '';

  const css = `
    .content{position:absolute;left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;display:flex;align-items:center;gap:${colGap}px}
    .text{width:${textW}px;min-width:0;display:flex;flex-direction:column;justify-content:center;height:100%}
    .text .brand{margin-bottom:${Math.round(bSize * 0.6)}px}
    h1{font-size:${hlSize}px;max-height:${Math.round(hlH)}px;width:100%}
    .tagline{font-size:${tagSize}px;margin-top:${Math.round(tagSize * 0.6)}px}
    .url{font-size:${urlSize}px;margin-top:${Math.round(urlSize * 0.9)}px}
    .tiles .tile:nth-child(even){transform:translateY(${rows === 1 ? Math.round(t * 0.1) : 0}px)}
    .decor{position:absolute;display:grid;opacity:.26}`;

  const body = `${background(brand, w, h, { gridDiv: asset.gridDiv ?? 7 })}${decor}
    <div class="content">
      <div class="text">
        ${showBrand ? brandRow(brand, bSize) : ''}
        ${headline(brand, 10)}
        ${hasTag ? `<div class="tagline">${markup(brand.tagline)}</div>` : ''}
        ${hasUrl ? `<div class="url mono">${esc(brand.url)}</div>` : ''}
      </div>
      ${cols ? tileGrid(brand, cols, rows, t, gap) : ''}
    </div>`;
  return page(brand, w, h, css, body);
}

/** Faded tile columns in the left/right margins outside the content box, vertically centred. */
function sideDecor(brand, asset, td) {
  const { w, h, content: c } = asset;
  const gap = Math.round(td * 0.17);
  const out = [];
  const zones = [
    { x0: 0, x1: c.x, side: 'left' },
    { x0: c.x + c.w, x1: w, side: 'right' },
  ];
  let offset = 6;
  for (const z of zones) {
    const zw = z.x1 - z.x0;
    const cols = Math.min(2, Math.floor((zw - td * 0.8) / (td + gap)));
    if (cols < 1) continue;
    const rows = Math.max(1, Math.min(4, Math.floor((h * 0.62) / (td + gap))));
    const gw = cols * td + (cols - 1) * gap;
    const gh = rows * td + (rows - 1) * gap;
    const left = Math.round(z.x0 + (zw - gw) / 2);
    const top = Math.round((h - gh) / 2);
    out.push(tileGrid(brand, cols, rows, td, gap, offset, `position:absolute;left:${left}px;top:${top}px;opacity:.26`));
    offset += cols * rows;
  }
  return out.join('');
}

/**
 * Portrait or square post: brand row on top, headline in the middle, a tile
 * row or grid at the bottom. Also used for stories and pins, whose content box
 * keeps clear of the platform's own UI.
 */
function post(brand, asset) {
  const { w, h } = asset;
  const c = asset.content;
  const tall = c.h / c.w >= 1.25;
  const hasTiles = brand.tiles.style !== 'none';
  const cols = tall ? 3 : 6;
  const rows = tall ? 2 : 1;
  const gap = Math.round(c.w * (tall ? 0.028 : 0.019));
  const t = Math.floor((c.w - gap * (cols - 1)) / cols);
  const tilesH = hasTiles ? rows * t + (rows - 1) * gap : 0;
  const bSize = Math.round(c.w * 0.056);
  const urlSize = Math.round(c.w * 0.032);
  const tagSize = Math.round(c.w * 0.034);
  const hasTag = !!brand.tagline;
  const hlSize = Math.round(c.w * (tall ? 0.15 : 0.12));

  const css = `
    .content{position:absolute;left:${c.x}px;top:${c.y}px;width:${c.w}px;height:${c.h}px;display:flex;flex-direction:column;justify-content:space-between;gap:${Math.round(c.w * 0.06)}px}
    .mid{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center}
    h1{font-size:${hlSize}px;flex:0 1 auto;max-height:100%;line-height:1.02}
    .tagline{font-size:${tagSize}px;margin-top:${Math.round(tagSize * 0.7)}px}
    .url{font-size:${urlSize}px;margin-top:${Math.round(urlSize * 1.1)}px}
    .tiles{height:${tilesH}px}`;

  const body = `${background(brand, w, h, { gridDiv: 18 })}
    <div class="content">
      ${brandRow(brand, bSize)}
      <div class="mid">
        ${headline(brand, 12)}
        ${hasTag ? `<div class="tagline">${markup(brand.tagline)}</div>` : ''}
        ${brand.url ? `<div class="url mono">${esc(brand.url)}</div>` : ''}
      </div>
      ${hasTiles ? tileGrid(brand, cols, rows, t, gap) : ''}
    </div>`;
  return page(brand, w, h, css, body);
}

export const LAYOUTS = { profile, banner, post };

/**
 * Render one asset to a complete HTML document.
 * `brand` may be raw config; it is normalised here.
 */
export function renderAsset(brandInput, asset) {
  const brand = brandInput?.theme?.grid && brandInput.fonts?.display?.family ? brandInput : normalizeBrand(brandInput);
  const layout = LAYOUTS[asset.layout];
  if (!layout) throw new Error(`Unknown layout "${asset.layout}" for ${asset.id}`);
  return layout(brand, asset);
}
