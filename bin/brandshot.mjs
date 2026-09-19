#!/usr/bin/env node
/**
 * brandshot: one brand config in, every social profile picture, banner and
 * post out, each at its platform's exact upload size.
 *
 *   brandshot init                       write a starter brand.json
 *   brandshot [--config brand.json]      render everything into ./brandshot/
 *   brandshot --only youtube,x-header    render a subset (ids, platforms or kinds)
 *   brandshot --list                     list every asset with its size
 *   brandshot --link                     print a studio link pre-filled with this config
 *
 * Options: --out <dir>  --html (also keep the HTML pages)  --zip
 *          --concurrency <n>  --chrome <path>  --studio <url>
 *
 * Rendering uses a local Chrome, Chromium, Edge or Brave in headless mode. No
 * npm dependencies. Where no browser exists (some sandboxes), use --html and
 * open the pages, or --link and render in the browser studio instead.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { execFile, execFileSync } from 'node:child_process';
import { tmpdir, platform } from 'node:os';
import { dirname, join, resolve, extname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderAsset, normalizeBrand } from '../src/templates.js';
import { ASSETS, selectAssets, pixelSize, TEXT_LIMITS } from '../src/specs.js';
import { encodeConfig, esc } from '../src/util.js';

const STUDIO_URL = 'https://nexibeo.github.io/brandshot/studio/';

/* ------------------------------------------------------------ args ------- */

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) { a._.push(k); continue; }
    const [key, inline] = k.slice(2).split('=');
    const next = argv[i + 1];
    if (inline !== undefined) a[key] = inline;
    else if (next !== undefined && !next.startsWith('--') && !['html', 'zip', 'list', 'link', 'help', 'json'].includes(key)) { a[key] = next; i++; }
    else a[key] = true;
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];

if (args.help || cmd === 'help') {
  const doc = readFileSync(new URL(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1];
  console.log(doc.replace(/^ \* ?/gm, '').trim());
  process.exit(0);
}

/* ------------------------------------------------------------ list ------- */

if (args.list) {
  const rows = selectAssets(args.only);
  if (args.json) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('id', 26) + pad('platform', 11) + pad('size', 12) + 'what');
  for (const a of rows) {
    const p = pixelSize(a);
    console.log(pad(a.id, 26) + pad(a.platform, 11) + pad(`${p.w}×${p.h}`, 12) + a.label);
  }
  process.exit(0);
}

/* ------------------------------------------------------------ init ------- */

if (cmd === 'init') {
  const target = resolve(args.config ?? 'brand.json');
  if (existsSync(target) && !args.force) {
    console.error(`${relative(process.cwd(), target)} already exists (use --force to overwrite).`);
    process.exit(1);
  }
  const example = new URL('../brand.example.json', import.meta.url);
  writeFileSync(target, readFileSync(example));
  console.log(`Wrote ${relative(process.cwd(), target)}. Edit it, then run: brandshot`);
  process.exit(0);
}

/* ------------------------------------------------------------ config ----- */

const configPath = resolve(args.config ?? args._[0] ?? 'brand.json');
if (!existsSync(configPath)) {
  console.error(`No config at ${relative(process.cwd(), configPath) || configPath}. Run "brandshot init" to create one.`);
  process.exit(1);
}
const raw = JSON.parse(readFileSync(configPath, 'utf8'));
const baseDir = dirname(configPath);

const MIME = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };

/** A logo or tile image given as a file path becomes an inline data URL. */
function inlineImage(ref) {
  if (!ref || /^(data:|https?:|<svg)/.test(ref.trim())) return ref;
  const file = resolve(baseDir, ref);
  if (!existsSync(file)) throw new Error(`Image not found: ${ref} (resolved to ${file})`);
  const type = MIME[extname(file).toLowerCase()];
  if (!type) throw new Error(`Unsupported image type: ${ref}`);
  if (type === 'image/svg+xml') return readFileSync(file, 'utf8');
  return `data:${type};base64,${readFileSync(file).toString('base64')}`;
}

const resolved = structuredClone(raw);
resolved.logo = inlineImage(raw.logo);
if (raw.tiles?.images) resolved.tiles.images = raw.tiles.images.map(inlineImage);
const brand = normalizeBrand(resolved);

/* ------------------------------------------------------------ link ------- */

if (args.link) {
  // Links can't carry files, so image paths are dropped; the studio asks for them.
  const shareable = structuredClone(raw);
  delete shareable.$schema;
  if (shareable.logo && !/^(https?:)/.test(shareable.logo)) delete shareable.logo;
  if (shareable.tiles?.images) delete shareable.tiles.images;
  console.log(`${args.studio ?? STUDIO_URL}#config=${encodeConfig(shareable)}`);
  process.exit(0);
}

/* ------------------------------------------------------------ chrome ----- */

function findChrome() {
  const env = args.chrome ?? process.env.BRANDSHOT_CHROME ?? process.env.CHROME_PATH ?? process.env.PUPPETEER_EXECUTABLE_PATH;
  if (env) {
    if (existsSync(env)) return env;
    console.warn(`Browser not found at ${env}.`);
    return null;
  }
  const os = platform();
  const candidates = os === 'darwin'
    ? ['Google Chrome', 'Chromium', 'Microsoft Edge', 'Brave Browser', 'Google Chrome Canary']
        .map((n) => `/Applications/${n}.app/Contents/MacOS/${n}`)
    : os === 'win32'
      ? ['PROGRAMFILES', 'PROGRAMFILES(X86)', 'LOCALAPPDATA'].flatMap((v) => process.env[v] ? [
          join(process.env[v], 'Google/Chrome/Application/chrome.exe'),
          join(process.env[v], 'Microsoft/Edge/Application/msedge.exe'),
          join(process.env[v], 'BraveSoftware/Brave-Browser/Application/brave.exe'),
        ] : [])
      : [];
  for (const c of candidates) if (existsSync(c)) return c;
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser', 'chrome']) {
    try {
      const p = execFileSync(os === 'win32' ? 'where' : 'which', [bin], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n')[0].trim();
      if (p) return p;
    } catch { /* not on PATH */ }
  }
  return null;
}

/* ------------------------------------------------------------ render ----- */

const assets = selectAssets(args.only);
if (!assets.length) {
  console.error(`Nothing matches --only ${args.only}. Try: brandshot --list`);
  process.exit(1);
}
const outDir = resolve(args.out ?? join(baseDir, 'brandshot'));
mkdirSync(outDir, { recursive: true });

const chrome = findChrome();
const htmlOnly = !chrome;
if (htmlOnly) {
  console.warn('No Chrome/Chromium/Edge/Brave found, so writing HTML pages only.');
  console.warn('Set BRANDSHOT_CHROME=/path/to/chrome, or render in the studio: brandshot --link');
}
const keepHtml = args.html || htmlOnly;
const work = mkdtempSync(join(tmpdir(), 'brandshot-'));

function run(file, argv, timeout = 90_000) {
  return new Promise((ok, fail) => execFile(file, argv, { timeout }, (err) => (err ? fail(err) : ok())));
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file) {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

async function renderOne(asset) {
  const html = renderAsset(brand, asset);
  const page = join(keepHtml ? outDir : work, `${asset.id}.html`);
  writeFileSync(page, html);
  if (htmlOnly) return { asset, html: page };
  const png = join(outDir, `${asset.id}.png`);
  await run(chrome, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--mute-audio', '--font-render-hinting=none',
    `--force-device-scale-factor=${asset.dpr}`, `--window-size=${asset.w},${asset.h}`,
    '--virtual-time-budget=10000', '--run-all-compositor-stages-before-draw',
    `--screenshot=${png}`, pathToFileURL(page).href,
  ]);
  const got = pngSize(png);
  const want = pixelSize(asset);
  const ok = got.w === want.w && got.h === want.h;
  return { asset, png, ok, got, bytes: statSync(png).size };
}

async function pool(items, n, fn) {
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      try { results[k] = await fn(items[k]); }
      catch (err) { results[k] = { asset: items[k], error: err.message }; }
    }
  }));
  return results;
}

const started = Date.now();
const results = await pool(assets, Number(args.concurrency) || 4, async (a) => {
  const r = await renderOne(a);
  const p = pixelSize(a);
  if (r.error) console.log(`  ✗ ${a.id}  ${r.error}`);
  else if (r.png) console.log(`  ${r.ok ? '✓' : '✗'} ${a.id.padEnd(26)} ${`${p.w}×${p.h}`.padEnd(11)} ${(r.bytes / 1024).toFixed(0).padStart(5)} KB${r.ok ? '' : `  (got ${r.got.w}×${r.got.h})`}`);
  else console.log(`  · ${a.id.padEnd(26)} ${p.w}×${p.h}  html`);
  return r;
});
rmSync(work, { recursive: true, force: true });

/* ------------------------------------------------------------ sheet ------ */

function contactSheet() {
  const byPlatform = {};
  for (const r of results) if (r.png || r.html) (byPlatform[r.asset.platform] ??= []).push(r);
  const cards = Object.entries(byPlatform).map(([name, rs]) => `
    <h2>${esc(name)}</h2><div class="row">${rs.map(({ asset: a }) => {
      const p = pixelSize(a);
      const src = `${a.id}.${htmlOnly ? 'html' : 'png'}`;
      const media = htmlOnly
        ? `<a href="${src}">${esc(a.id)}.html</a>`
        : `<a href="${src}"><img src="${src}" alt="${esc(a.label)}" class="${a.circle ? 'circle' : ''}" style="aspect-ratio:${a.w}/${a.h}"/></a>`;
      return `<figure class="${a.kind}">${media}<figcaption><b>${esc(a.label)}</b> · ${p.w}×${p.h}<br/><code>${esc(a.id)}.png</code><br/><span>${esc(a.notes ?? '')}</span></figcaption></figure>`;
    }).join('')}</div>`).join('');
  const limits = Object.entries(TEXT_LIMITS).map(([p, l]) => `<tr><td>${esc(p)}</td><td>${Object.entries(l).map(([k, v]) => `${esc(k)}: ${v}`).join(' · ')}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(brand.name)} · social kit</title><style>
  :root{color-scheme:light dark;--bg:#f6f7f9;--fg:#15181d;--dim:#5b6573;--card:#fff;--rule:#e2e6ec}
  @media (prefers-color-scheme:dark){:root{--bg:#0f1115;--fg:#e8ebf0;--dim:#8d97a5;--card:#171a20;--rule:#262b33}}
  body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,sans-serif;padding:32px 16px 64px}
  main{max-width:1200px;margin:0 auto} h1{font-size:28px;margin:0 0 4px} h2{font-size:18px;margin:36px 0 12px}
  .row{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}
  figure{margin:0;background:var(--card);border:1px solid var(--rule);border-radius:12px;padding:12px;flex:1 1 360px;max-width:100%}
  figure.profile{flex:0 1 200px} figure.post,figure.story{flex:0 1 260px}
  img{display:block;width:100%;height:auto;border-radius:6px} img.circle{border-radius:50%}
  figcaption{font-size:13px;color:var(--dim);margin-top:8px} figcaption b{color:var(--fg)} code{font-size:12px}
  table{border-collapse:collapse;margin-top:8px;font-size:14px} td{border-top:1px solid var(--rule);padding:6px 12px 6px 0;vertical-align:top}
</style></head><body><main>
<h1>${esc(brand.name)}: social kit</h1><p style="color:var(--dim)">Generated by brandshot on ${new Date().toISOString().slice(0, 10)}. Click any image for full size.</p>
${cards}
<h2>Profile text limits</h2><table>${limits}</table>
</main></body></html>`;
}

writeFileSync(join(outDir, 'index.html'), contactSheet());

const failed = results.filter((r) => r.error || r.ok === false);
const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${results.length - failed.length}/${results.length} assets in ${secs}s → ${relative(process.cwd(), outDir) || '.'}/  (open index.html for the contact sheet)`);

/* ------------------------------------------------------------ zip -------- */

if (args.zip) {
  const zipPath = `${outDir}.zip`;
  try {
    rmSync(zipPath, { force: true });
    execFileSync('zip', ['-qr', zipPath, '.', '-x', '.DS_Store'], { cwd: outDir });
    console.log(`Zipped → ${relative(process.cwd(), zipPath)}`);
  } catch {
    console.warn('Could not run "zip"; skipped the archive (the studio can zip in the browser).');
  }
}

process.exit(failed.length ? 1 : 0);
