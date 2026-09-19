/**
 * Fast checks that need no browser: spec geometry, config handling, markup
 * safety and determinism. Rendering itself is covered by `npm run examples`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ASSETS, selectAssets, pixelSize } from '../src/specs.js';
import { normalizeBrand, renderAsset } from '../src/templates.js';
import { tiles } from '../src/tiles.js';
import { markup, encodeConfig, decodeConfig, contrast } from '../src/util.js';

test('every asset id is unique', () => {
  const ids = ASSETS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('content and safe boxes sit inside their canvas', () => {
  for (const a of ASSETS) {
    for (const key of ['content', 'safe']) {
      const b = a[key];
      if (!b) continue;
      assert.ok(b.x >= 0 && b.y >= 0 && b.w > 0 && b.h > 0, `${a.id}.${key} is positive`);
      assert.ok(b.x + b.w <= a.w && b.y + b.h <= a.h, `${a.id}.${key} fits ${a.w}×${a.h}`);
    }
  }
});

test('platform sizes match the checked specs', () => {
  const size = (id) => { const p = pixelSize(ASSETS.find((a) => a.id === id)); return `${p.w}x${p.h}`; };
  assert.equal(size('youtube-banner'), '2560x1440');
  assert.equal(size('x-header'), '1500x500');
  assert.equal(size('linkedin-personal-banner'), '1584x396');
  assert.equal(size('linkedin-company-cover'), '1512x256');
  assert.equal(size('instagram-post'), '1080x1440');
  assert.equal(size('instagram-story'), '1080x1920');
  assert.equal(size('og-image'), '1200x630');
  assert.equal(size('github-social-preview'), '1280x640');
});

test('YouTube text stays inside the official safe area', () => {
  const a = ASSETS.find((x) => x.id === 'youtube-banner');
  assert.deepEqual(a.safe, { x: 507, y: 509, w: 1546, h: 423 });
  assert.ok(a.content.x >= a.safe.x && a.content.x + a.content.w <= a.safe.x + a.safe.w);
});

test('selectAssets filters by id, platform and kind', () => {
  assert.equal(selectAssets('x-header').length, 1);
  assert.ok(selectAssets('linkedin').every((a) => a.platform === 'LinkedIn'));
  assert.ok(selectAssets('profile').every((a) => a.kind === 'profile'));
  assert.equal(selectAssets('nope').length, 0);
});

test('normalizeBrand fills defaults and parses fonts', () => {
  const b = normalizeBrand({ name: 'Zed', fonts: { display: 'Inter:700' } });
  assert.equal(b.wordmark, 'Zed');
  assert.equal(b.monogram, 'Z');
  assert.deepEqual(b.fonts.display, { family: 'Inter', weight: 700 });
  assert.equal(b.tiles.style, 'shapes');
  assert.equal(b.palette.length, 2);
});

test('markup escapes HTML and turns stars into accents', () => {
  assert.equal(markup('<b>x</b> *hi*'), '&lt;b&gt;x&lt;/b&gt; <span class="accent">hi</span>');
  assert.equal(markup('a\nb'), 'a<br/>b');
});

test('headlines with line breaks are marked as fixed lines', () => {
  const html = renderAsset({ name: 'A', headline: 'one\ntwo' }, ASSETS.find((a) => a.id === 'og-image'));
  assert.match(html, /<h1 data-fit data-min="\d+" class="lines">one<br\/>two<\/h1>/);
});

test('every asset renders a complete page', () => {
  const brand = normalizeBrand(JSON.parse(readFileSync(new URL('../brand.example.json', import.meta.url))));
  for (const a of ASSETS) {
    const html = renderAsset(brand, a);
    assert.ok(html.startsWith('<!doctype html>'), a.id);
    assert.ok(html.includes(`width:${a.w}px;height:${a.h}px`), `${a.id} sets its canvas size`);
  }
});

test('tiles are deterministic per seed', () => {
  const brand = normalizeBrand({ name: 'A', tiles: { style: 'robots', items: ['alpha', 'beta'] } });
  assert.deepEqual(tiles(brand, 4, 64), tiles(brand, 4, 64));
  assert.equal(tiles(normalizeBrand({ name: 'A', tiles: { style: 'none' } }), 4, 64).length, 0);
});

test('studio links round-trip configs, including non-ASCII', () => {
  const cfg = { name: 'Café ☕', headline: 'Grüße\n*hi*' };
  assert.deepEqual(decodeConfig(encodeConfig(cfg)), cfg);
});

test('the example configs keep readable contrast', () => {
  for (const name of ['templatesgrokbot', 'northwind-coffee', 'lumen-studio']) {
    const b = normalizeBrand(JSON.parse(readFileSync(new URL(`../examples/${name}/brand.json`, import.meta.url))));
    assert.ok(contrast(b.theme.text, b.theme.background) >= 4.5, `${name} text contrast`);
  }
});
