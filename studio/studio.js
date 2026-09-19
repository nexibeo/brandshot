/**
 * brandshot studio: live previews of every asset, rendered from the same
 * templates as the CLI, and exported to PNG in the browser.
 *
 * Each preview is an iframe holding the asset's own HTML page at full size,
 * scaled down with a CSS transform. Export runs html-to-image inside that
 * iframe, so web fonts, blur and SVG render exactly as they do in Chrome.
 */
import { normalizeBrand, renderAsset } from '../src/templates.js';
import { ASSETS, PLATFORMS, pixelSize } from '../src/specs.js';
import { encodeConfig, decodeConfig } from '../src/util.js';

const HTML_TO_IMAGE = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/dist/html-to-image.js';
const JSZIP = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const STORE_KEY = 'brandshot:config';

/* ------------------------------------------------------------ defaults --- */

const PRESETS = {
  Midnight: { theme: { background: '#0E1116', text: '#E6EAF0', muted: '#8D99A9', accent: '#FF7A1A', accent2: '#35D6C3' }, palette: ['#FF7A1A', '#35D6C3', '#9A7BFF', '#FF5D8F', '#5BE08A', '#FFC857'], fonts: { display: 'Archivo:800', mono: 'IBM Plex Mono:500' } },
  Paper: { theme: { background: '#F6F1EA', text: '#2B1D14', muted: '#7A6557', accent: '#C2562B', accent2: '#3F7D5C' }, palette: ['#C2562B', '#3F7D5C', '#D9A441', '#8A5A44'], fonts: { display: 'Fraunces:700', mono: 'DM Mono:500' } },
  Violet: { theme: { background: '#120B2E', text: '#F3EEFF', muted: '#A99BD6', accent: '#B8FF5C', accent2: '#7C5CFF' }, palette: ['#B8FF5C', '#7C5CFF', '#FF6BB5', '#5CE1FF'], fonts: { display: 'Space Grotesk:700', mono: 'JetBrains Mono:500' } },
  Ocean: { theme: { background: '#06222E', text: '#E3F4F8', muted: '#86AAB6', accent: '#34D1BF', accent2: '#4D9DE0' }, palette: ['#34D1BF', '#4D9DE0', '#F2C14E', '#F78154'], fonts: { display: 'Manrope:800', mono: 'IBM Plex Mono:500' } },
  Snow: { theme: { background: '#FFFFFF', text: '#0D1321', muted: '#5C677D', accent: '#2F5DFF', accent2: '#00B39F' }, palette: ['#2F5DFF', '#00B39F', '#FF5A5F', '#FFB400'], fonts: { display: 'Inter:800', mono: 'IBM Plex Mono:500' } },
  Ember: { theme: { background: '#1A0F0B', text: '#FBEDE4', muted: '#C09A86', accent: '#FF4F1F', accent2: '#FFB23F' }, palette: ['#FF4F1F', '#FFB23F', '#FF7AA2', '#F4E04D'], fonts: { display: 'Bricolage Grotesque:800', mono: 'Space Mono:400' } },
};

const FONTS = ['Archivo', 'Inter', 'Manrope', 'Space Grotesk', 'Bricolage Grotesque', 'Sora', 'Outfit', 'Plus Jakarta Sans',
  'DM Sans', 'Poppins', 'Montserrat', 'Work Sans', 'Rubik', 'Figtree', 'Syne', 'Unbounded', 'Fraunces', 'Playfair Display',
  'DM Serif Display', 'Instrument Serif', 'Libre Baskerville', 'IBM Plex Mono', 'JetBrains Mono', 'DM Mono', 'Space Mono', 'Fira Code'];

/** Style defaults. Links and imports fill gaps from this, never from the demo copy. */
const BASE = {
  tagline: '',
  url: '',
  logo: '',
  ...structuredClone(PRESETS.Midnight),
  tiles: { style: 'shapes', items: [] },
  background: { grid: true, glow: true },
};

const STARTER = {
  ...BASE,
  name: 'Acme Labs',
  wordmark: 'acme*labs*',
  headline: 'Tools that make\nyour team *faster*',
  url: 'acmelabs.com',
};

/* ------------------------------------------------------------ state ------ */

let config = loadInitial();
const shown = new Set(PLATFORMS);
const cards = new Map(); // asset id -> { card, frame, stage, asset }

function loadInitial() {
  const m = location.hash.match(/config=([^&]+)/);
  if (m) {
    try { return { ...structuredClone(BASE), ...decodeConfig(m[1]) }; } catch { /* fall through */ }
  }
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) return { ...STARTER, ...JSON.parse(saved) };
  } catch { /* storage unavailable */ }
  return structuredClone(STARTER);
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(config)); } catch { /* quota or private mode */ }
}

/* ------------------------------------------------------------ form ------- */

const form = document.getElementById('form');
const $ = (sel) => form.querySelector(sel);

const fontOf = (f) => {
  if (f && typeof f === 'object') return { family: f.family || 'Archivo', weight: String(f.weight || 800) };
  const [family, weight] = String(f ?? '').split(':');
  return { family: family || 'Archivo', weight: weight || '800' };
};

function fillForm() {
  $('[name=name]').value = config.name ?? '';
  $('[name=wordmark]').value = config.wordmark ?? '';
  $('[name=headline]').value = config.headline ?? '';
  $('[name=tagline]').value = config.tagline ?? '';
  $('[name=url]').value = config.url ?? '';
  for (const k of ['background', 'text', 'muted', 'accent', 'accent2']) $(`[name="theme.${k}"]`).value = config.theme?.[k] ?? '#000000';
  $('[name=palette]').value = (config.palette ?? []).join(', ');
  $('[name="background.grid"]').checked = config.background?.grid !== false;
  $('[name="background.glow"]').checked = config.background?.glow !== false;
  const d = fontOf(config.fonts?.display), m = fontOf(config.fonts?.mono);
  $('[name="fonts.displayFamily"]').value = d.family;
  $('[name="fonts.displayWeight"]').value = d.weight;
  $('[name="fonts.monoFamily"]').value = m.family;
  $('[name="fonts.monoWeight"]').value = m.weight;
  const style = config.tiles?.style ?? 'shapes';
  for (const r of form.querySelectorAll('[name="tiles.style"]')) r.checked = r.value === style;
  $('[name="tiles.items"]').value = style === 'images' ? '' : (config.tiles?.items ?? []).join('\n');
  syncTileFields();
}

function readForm() {
  const v = (n) => $(`[name="${n}"]`).value;
  const style = form.querySelector('[name="tiles.style"]:checked')?.value ?? 'shapes';
  const items = style === 'images'
    ? (config.tiles?.style === 'images' ? config.tiles.items : [])
    : v('tiles.items').split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  config = {
    ...config,
    name: v('name'),
    wordmark: v('wordmark'),
    headline: v('headline'),
    tagline: v('tagline'),
    url: v('url'),
    theme: Object.fromEntries(['background', 'text', 'muted', 'accent', 'accent2'].map((k) => [k, v(`theme.${k}`)])),
    palette: v('palette').split(/[\s,]+/).map((s) => s.trim()).filter((s) => /^#[0-9a-f]{3,8}$/i.test(s)),
    fonts: {
      display: `${v('fonts.displayFamily') || 'Archivo'}:${v('fonts.displayWeight')}`,
      mono: `${v('fonts.monoFamily') || 'IBM Plex Mono'}:${v('fonts.monoWeight')}`,
    },
    tiles: { style, items },
    background: { grid: $('[name="background.grid"]').checked, glow: $('[name="background.glow"]').checked },
  };
}

function syncTileFields() {
  const style = form.querySelector('[name="tiles.style"]:checked')?.value ?? 'shapes';
  document.getElementById('itemsField').hidden = style === 'images' || style === 'none';
  document.getElementById('imagesField').hidden = style !== 'images';
  document.getElementById('itemsHint').textContent = {
    robots: 'Seeds: any words. Each one always gives the same robot.',
    shapes: 'Seeds: any words. Each one always gives the same shape.',
    emoji: 'One emoji or symbol per tile.',
  }[style] ?? '';
}

let timer;
form.addEventListener('input', (e) => {
  if (e.target.type === 'file') return;
  readForm();
  syncTileFields();
  clearTimeout(timer);
  timer = setTimeout(() => { save(); renderAll(); }, 220);
});

/* ------------------------------------------------------------ files ------ */

const readAs = (file, how) => new Promise((ok, fail) => {
  const r = new FileReader();
  r.onload = () => ok(r.result);
  r.onerror = fail;
  r[how](file);
});

document.getElementById('logoFile').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  config.logo = f.type === 'image/svg+xml' ? (await readAs(f, 'readAsText')).trim() : await readAs(f, 'readAsDataURL');
  save(); renderAll();
});
document.getElementById('clearLogo').addEventListener('click', () => {
  config.logo = ''; document.getElementById('logoFile').value = ''; save(); renderAll();
});
document.getElementById('tileFiles').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  config.tiles = { style: 'images', items: await Promise.all(files.map((f) => readAs(f, 'readAsDataURL'))) };
  save(); renderAll();
});

/* ------------------------------------------------------------ presets ---- */

const presetBox = document.getElementById('presets');
for (const [name, p] of Object.entries(PRESETS)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span class="dot" style="background:linear-gradient(135deg,${p.theme.background} 50%,${p.theme.accent} 50%)"></span>${name}`;
  b.addEventListener('click', () => {
    config = { ...config, theme: { ...p.theme }, palette: [...p.palette], fonts: { ...p.fonts } };
    fillForm(); save(); renderAll();
  });
  presetBox.append(b);
}
document.getElementById('fontList').innerHTML = FONTS.map((f) => `<option value="${f}">`).join('');

/* ------------------------------------------------------------ chips ------ */

const chipBox = document.getElementById('platformChips');
for (const p of PLATFORMS) {
  const l = document.createElement('label');
  l.innerHTML = `<input type="checkbox" checked value="${p}"> ${p}`;
  l.querySelector('input').addEventListener('change', (e) => {
    e.target.checked ? shown.add(p) : shown.delete(p);
    for (const el of document.querySelectorAll('.platform')) el.hidden = !shown.has(el.dataset.platform);
    updateCount();
  });
  chipBox.append(l);
}

/* ------------------------------------------------------------ previews --- */

const previews = document.getElementById('previews');

function buildCards() {
  previews.innerHTML = `<div class="toolbar"><label><input type="checkbox" id="safeToggle"> Show safe areas</label><span>Dashed box: where text stays visible on every device. Profile pictures show the circle crop.</span></div>`;
  document.getElementById('safeToggle').addEventListener('change', (e) => previews.classList.toggle('show-safe', e.target.checked));
  for (const platform of PLATFORMS) {
    const assets = ASSETS.filter((a) => a.platform === platform);
    const sec = document.createElement('section');
    sec.className = 'platform';
    sec.dataset.platform = platform;
    sec.innerHTML = `<h3>${platform}<span>${assets.length} image${assets.length > 1 ? 's' : ''}</span></h3><div class="grid"></div>`;
    const grid = sec.querySelector('.grid');
    for (const a of assets) {
      const p = pixelSize(a);
      const card = document.createElement('article');
      card.className = `card ${a.kind}`;
      card.innerHTML = `
        <div class="stage${a.circle ? ' circle' : ''}" style="aspect-ratio:${a.w}/${a.h}">
          <iframe title="${a.label} preview" width="${a.w}" height="${a.h}" sandbox="allow-scripts allow-same-origin"></iframe>
          <div class="safe"></div>
        </div>
        <div class="meta"><div><b>${a.label}</b><span>${p.w}×${p.h} · ${a.id}.png</span></div><button type="button">PNG</button></div>
        <details><summary>Spec</summary>${a.notes ?? ''}</details>`;
      const stage = card.querySelector('.stage');
      const frame = card.querySelector('iframe');
      const safe = card.querySelector('.safe');
      const s = a.content ?? a.safe;
      if (s) Object.assign(safe.style, { left: `${(s.x / a.w) * 100}%`, top: `${(s.y / a.h) * 100}%`, width: `${(s.w / a.w) * 100}%`, height: `${(s.h / a.h) * 100}%` });
      card.querySelector('.meta button').addEventListener('click', (e) => downloadOne(a, e.currentTarget));
      grid.append(card);
      cards.set(a.id, { card, frame, stage, asset: a });
    }
    previews.append(sec);
  }
  const ro = new ResizeObserver((entries) => {
    for (const en of entries) {
      const c = [...cards.values()].find((x) => x.stage === en.target);
      if (c) c.frame.style.transform = `scale(${en.contentRect.width / c.asset.w})`;
    }
  });
  for (const c of cards.values()) ro.observe(c.stage);
}

function renderAll() {
  const brand = normalizeBrand(config);
  for (const { frame, asset } of cards.values()) frame.srcdoc = renderAsset(brand, asset);
  updateCount();
}

function updateCount() {
  const n = ASSETS.filter((a) => shown.has(a.platform)).length;
  document.getElementById('countAll').textContent = `(${n})`;
}

/* ------------------------------------------------------------ export ----- */

function loadScript(doc, src, global) {
  const win = doc.defaultView;
  if (win[global]) return Promise.resolve(win[global]);
  return new Promise((ok, fail) => {
    const s = doc.createElement('script');
    s.src = src;
    s.onload = () => ok(win[global]);
    s.onerror = () => fail(new Error(`Could not load ${src}`));
    doc.head.append(s);
  });
}

async function waitReady(frame) {
  for (let i = 0; i < 200; i++) {
    const doc = frame.contentDocument;
    if (doc?.readyState === 'complete' && doc.documentElement.getAttribute('data-ready') === '1') return doc;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Preview did not finish loading');
}

/** PNG blob of one asset, at its exact pixel size. */
async function snapshot(asset) {
  const { frame } = cards.get(asset.id);
  const doc = await waitReady(frame);
  // html-to-image waits on requestAnimationFrame, which never fires while the
  // tab is in the background. Fall back to a timer so "Download all" keeps
  // going if the user switches tabs.
  const win = doc.defaultView;
  if (!win.__rafPatched) {
    const raf = win.requestAnimationFrame.bind(win);
    win.requestAnimationFrame = (cb) => (document.hidden ? win.setTimeout(() => cb(win.performance.now()), 16) : raf(cb));
    win.__rafPatched = true;
  }
  const lib = await loadScript(doc, HTML_TO_IMAGE, 'htmlToImage');
  const opts = { width: asset.w, height: asset.h, pixelRatio: asset.dpr, backgroundColor: normalizeBrand(config).theme.background };
  await lib.toBlob(doc.body, opts); // first pass warms font and image caches
  return lib.toBlob(doc.body, opts);
}

const slug = () => (config.name || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand';

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function downloadOne(asset, btn) {
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = '…';
  try { saveBlob(await snapshot(asset), `${asset.id}.png`); }
  catch (err) { toast(err.message); }
  finally { btn.disabled = false; btn.textContent = label; }
}

document.getElementById('downloadAll').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const list = ASSETS.filter((a) => shown.has(a.platform));
  btn.disabled = true;
  try {
    const JSZip = await loadScript(document, JSZIP, 'JSZip');
    const zip = new JSZip();
    const dir = zip.folder(`${slug()}-social`);
    let i = 0;
    for (const a of list) {
      btn.textContent = `Rendering ${++i}/${list.length}…`;
      dir.file(`${a.id}.png`, await snapshot(a));
    }
    dir.file('brand.json', JSON.stringify(exportable(), null, 2));
    btn.textContent = 'Zipping…';
    saveBlob(await zip.generateAsync({ type: 'blob' }), `${slug()}-social.zip`);
    toast(`${list.length} images saved`);
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Download all <span id="countAll"></span>';
    updateCount();
  }
});

/* ------------------------------------------------------------ config io -- */

function exportable() {
  return { $schema: 'https://raw.githubusercontent.com/nexibeo/brandshot/main/brand.schema.json', ...config };
}

document.getElementById('exportJson').addEventListener('click', () => {
  saveBlob(new Blob([JSON.stringify(exportable(), null, 2)], { type: 'application/json' }), 'brand.json');
});

document.getElementById('importJson').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const parsed = JSON.parse(await readAs(f, 'readAsText'));
    delete parsed.$schema;
    config = { ...structuredClone(BASE), ...parsed };
    // File paths from a CLI config can't be read here; ask for the files instead.
    if (config.logo && !/^(data:|<svg|https?:)/.test(config.logo.trim())) { config.logo = ''; toast('Logo was a file path: pick the file under Brand → Logo'); }
    if (config.tiles?.style === 'images') config.tiles.items = (config.tiles.items ?? config.tiles.images ?? []).filter((s) => /^(data:|https?:)/.test(s));
    fillForm(); save(); renderAll();
  } catch { toast('That file is not valid JSON'); }
  e.target.value = '';
});

document.getElementById('copyLink').addEventListener('click', async () => {
  const shareable = structuredClone(config);
  if (shareable.logo && !/^https?:/.test(shareable.logo)) delete shareable.logo;
  if (shareable.tiles?.style === 'images') shareable.tiles.items = [];
  const url = `${location.origin}${location.pathname}#config=${encodeConfig(shareable)}`;
  try { await navigator.clipboard.writeText(url); toast('Link copied (logo and images are not included)'); }
  catch { prompt('Copy this link', url); }
});

/* ------------------------------------------------------------ toast ------ */

let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ------------------------------------------------------------ start ------ */

fillForm();
buildCards();
renderAll();

// A small API for scripts and browser agents: set a config, get PNGs back.
window.brandshot = {
  get config() { return structuredClone(config); },
  set(next) { config = { ...structuredClone(BASE), ...next }; fillForm(); save(); renderAll(); },
  assets: ASSETS.map((a) => a.id),
  png: (id) => snapshot(ASSETS.find((a) => a.id === id)),
};
// A shared link wins over the saved brand; keep it so a reload doesn't lose it.
if (location.hash.includes('config=')) { save(); history.replaceState(null, '', location.pathname); }
