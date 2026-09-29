// SEO / social-sharing guards: PNG OG image, enriched JSON-LD, FAQ schema,
// a real 404 and a sitemap with lastmod dates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const html = read('index.html');
const nginx = read('nginx.conf');
const sitemap = read('sitemap.xml');

const SITE = 'https://ado-code.ne1.dev/';
const MARKETPLACE = 'https://marketplace.visualstudio.com/items?itemName=steelburn.ado-code';
const OG_FILE = 'assets/img/og-image.png';

const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map((m) => JSON.parse(m[1]));

test('Open Graph image is a PNG with dimensions, type and alt text', () => {
  const m = html.match(/property="og:image" content="([^"]+)"/);
  assert.ok(m, 'expected an og:image meta tag');
  assert.ok(m[1].endsWith('.png'), `og:image must be a raster image, got ${m[1]}`);
  assert.match(html, /property="og:image:type" content="image\/png"/);
  assert.match(html, /property="og:image:width" content="1200"/);
  assert.match(html, /property="og:image:height" content="630"/);
  assert.match(html, /property="og:image:alt" content="[^"]+"/);
  assert.match(html, /property="og:site_name" content="ADO Code"/);
  assert.match(html, /property="og:locale" content="en_US"/);
});

test('Twitter card uses the same PNG and has alt text', () => {
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  const m = html.match(/name="twitter:image" content="([^"]+)"/);
  assert.ok(m && m[1].endsWith('.png'), 'twitter:image must be the PNG');
  assert.match(html, /name="twitter:image:alt" content="[^"]+"/);
  assert.ok(!/og-image\.svg/.test(html), 'no social meta tag should still point at the SVG');
});

test('the OG image exists and really is a 1200x630 PNG', () => {
  const p = join(root, OG_FILE);
  assert.ok(existsSync(p), `${OG_FILE} is missing`);
  const buf = readFileSync(p);
  assert.ok(buf.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'not a PNG');
  assert.equal(buf.readUInt32BE(16), 1200, 'unexpected PNG width');
  assert.equal(buf.readUInt32BE(20), 630, 'unexpected PNG height');
});

test('canonical and JSON-LD url point at the site, not the marketplace', () => {
  assert.match(html, new RegExp(`rel="canonical" href="${SITE}"`));
  const app = jsonLdBlocks.find((b) => b['@type'] === 'SoftwareApplication');
  assert.ok(app, 'expected a SoftwareApplication JSON-LD block');
  assert.equal(app.url, SITE, 'JSON-LD url must be the canonical site');
  assert.equal(app.downloadUrl, MARKETPLACE);
  assert.ok(Array.isArray(app.sameAs), 'expected sameAs');
  assert.ok(app.sameAs.includes('https://github.com/steelburn/ado-code'));
  assert.ok(app.sameAs.includes(MARKETPLACE));
  assert.equal(app.publisher['@type'], 'Organization');
  assert.ok(app.softwareVersion, 'expected softwareVersion');
  assert.ok(app.keywords, 'expected keywords');
});

test('the FAQ is visible and matches the FAQPage schema', () => {
  const faqHtml = read('faq.html');
  const faq = [...faqHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]))
    .find((b) => b['@type'] === 'FAQPage');
  assert.ok(faq, 'expected a FAQPage JSON-LD block');
  const questions = faq.mainEntity.map((q) => q.name);
  assert.ok(questions.length >= 4, 'expected at least four FAQ entries');

  const shown = [...faqHtml.matchAll(/<details class="faq-item">\s*<summary>([^<]+)<\/summary>/g)]
    .map((m) => m[1]);
  assert.equal(shown.length, questions.length, 'each FAQ schema entry needs a visible <details>');
  for (const q of questions) {
    assert.ok(shown.includes(q), `FAQPage question is not shown on the page: ${q}`);
  }
});

test('unknown URLs return a real 404 with a branded page', () => {
  assert.match(nginx, /error_page\s+404\s+=404\s+\/404\.html;/, 'nginx must return status 404, not index.html');
  const p = join(root, '404.html');
  assert.ok(existsSync(p), '404.html is missing');
  const body = readFileSync(p, 'utf8');
  assert.match(body, /name="robots" content="noindex"/, '404 page should be noindex');
  assert.match(body, /href="\/"/, '404 page should link back home');
});

test('every sitemap entry carries a lastmod date', () => {
  const locs = [...sitemap.matchAll(/<loc>/g)].length;
  const lastmods = [...sitemap.matchAll(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g)].length;
  assert.ok(locs >= 1, 'expected at least one sitemap entry');
  assert.equal(lastmods, locs, 'every <url> needs a <lastmod>');
});
