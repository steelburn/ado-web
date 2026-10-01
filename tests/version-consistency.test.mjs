// tests/version-consistency.test.mjs
//
// The site documents one specific extension release. Its version is repeated
// in a lot of places — the header brand badge, the footer, the hero eyebrow,
// index.html's JSON-LD softwareVersion, the feature-reference heading and
// legend, the gallery's launch film line, the deck's kickers and its
// "What's new" slide, the README and the capture tooling. Before the 0.6.7
// update those had to be chased by hand every release and one was always
// missed.
//
// This suite pins the whole set to a single PRODUCT_VERSION, so bumping the
// release the site documents is a deliberate, test-guarded operation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

// The extension release the site currently documents.
const PRODUCT_VERSION = '0.7.0';
const PREVIOUS_VERSION = '0.6.7';

// Rows from this release onward are marketed as "new" on features.html.
const NEW_SINCE = '0.6.5';

// Pages that carry the hand-duplicated chrome (header brand badge + footer).
const CHROME_PAGES = [
  'index.html',
  'features.html',
  'gallery.html',
  'modes.html',
  'agents.html',
  'commands.html',
  'install.html',
  'faq.html',
];

test('chrome pages show the current product version in header and footer', () => {
  for (const page of CHROME_PAGES) {
    const html = read(page);
    const badges = html.match(/class="brand-ver">v([0-9.]+)</g) || [];
    assert.equal(badges.length, 1, `${page} must have exactly one brand-ver badge`);
    assert.ok(
      badges[0].includes(`v${PRODUCT_VERSION}`),
      `${page} header badge must be v${PRODUCT_VERSION}, got ${badges[0]}`,
    );
    const footerVers = html.match(/<span>v([0-9.]+)<\/span>/g) || [];
    assert.equal(footerVers.length, 1, `${page} must have exactly one footer version`);
    assert.ok(
      footerVers[0].includes(`v${PRODUCT_VERSION}`),
      `${page} footer version must be v${PRODUCT_VERSION}, got ${footerVers[0]}`,
    );
  }
});

test('canonical chrome partials match the current product version', () => {
  for (const partial of ['_partials/header.html', '_partials/footer.html']) {
    const html = read(partial);
    assert.ok(
      html.includes(`v${PRODUCT_VERSION}`),
      `${partial} must reference v${PRODUCT_VERSION}`,
    );
  }
});

test('index.html version-bearing copy and JSON-LD agree', () => {
  const html = read('index.html');
  const jsonLd = [...html.matchAll(/"softwareVersion"\s*:\s*"([0-9.]+)"/g)];
  assert.equal(jsonLd.length, 1, 'expected exactly one softwareVersion in the JSON-LD');
  assert.equal(jsonLd[0][1], PRODUCT_VERSION, 'JSON-LD softwareVersion must be current');
  assert.ok(
    html.includes(`v${PRODUCT_VERSION}</p>`),
    'hero eyebrow must carry the current version',
  );
});

test('features page heading, legend and table agree on the release', () => {
  const html = read('features.html');
  const sub = html.match(/Everything ADO Code does in v([0-9.]+) — (\d+) capabilities across (\d+) areas/);
  assert.ok(sub, 'feature-reference heading must state version + capability count');
  assert.equal(sub[1], PRODUCT_VERSION, 'feature heading version must be current');
  assert.ok(
    html.includes(`<em class="sub-em sub-em-rose">new · ${NEW_SINCE}+</em>`),
    `legend must introduce the rows new since ${NEW_SINCE}`,
  );
  assert.ok(
    /class="feat-row feat-new"/.test(html),
    `at least one feature row must be tagged new since ${NEW_SINCE}`,
  );
  assert.ok(
    !/class="feat-row feat-new-\d/.test(html),
    'feature rows must not carry a per-release badge class',
  );

  // The declared totals must equal the real table: category counts sum, the
  // toggle label and the heading all have to line up with the actual rows.
  const catCounts = [...html.matchAll(/<span class="feat-cat-count">(\d+)<\/span>/g)].map((m) =>
    Number(m[1]),
  );
  const declaredTotal = Number(sub[2]);
  const declaredCats = Number(sub[3]);
  const total = catCounts.reduce((a, b) => a + b, 0);
  assert.equal(catCounts.length, declaredCats, 'declared area count must match the table');
  assert.equal(total, declaredTotal, 'declared capability count must match the category sum');
  const rows = (html.match(/class="feat-row(?:\s|")/g) || []).length;
  assert.equal(rows, total, 'declared capability count must match the number of rows');
  assert.ok(
    html.includes(`${total} features · ${declaredCats} categories`),
    'feature toggle label must match the real table totals',
  );
});

test('features.html documents every capability of the documented release', () => {
  const html = read('features.html');
  // The 0.7.0 capability set: mid-run steer/queue + chat density modes + AI
  // delegation suggestions (the three new settings), the chat-area declutter
  // pass, detached background runs (guard + Running badge), session-scoped and
  // archived goals, /remember actually persisting, and the shared error banner
  // / settings-coverage fixes. Each marker is copy that only ships with a row.
  const RELEASE_CAPABILITIES = [
    'adoCode.chat.inputWhileBusy',
    'adoCode.chat.density',
    'adoCode.chat.suggestDelegation',
    'Ran N tools',
    'Latest answer',
    'Background run',
    'View Archived Goals',
    'settings-coverage',
  ];
  for (const marker of RELEASE_CAPABILITIES) {
    assert.ok(
      html.includes(marker),
      `features.html must document ${marker} in a table row`,
    );
  }
});

test('the "new" badge tracks the release window, not one release', () => {
  const css = read('assets/css/style.css');
  assert.ok(css.includes('.feat-new {'), 'style.css must define the .feat-new badge');
  assert.ok(
    css.includes(`content: "new · ${NEW_SINCE}+"`),
    'style.css must label the badge with the new-since range',
  );
  assert.ok(!/\.feat-new-\d/.test(css), 'per-release badge classes must be gone');
  assert.ok(
    !/content: "new · \d+\.\d+\.\d+"/.test(css),
    'no badge may pin an exact release',
  );
});

test('the new-since baseline is not ahead of the documented release', () => {
  const parts = (v) => v.split('.').map(Number);
  const [a, b] = [parts(NEW_SINCE), parts(PRODUCT_VERSION)];
  const i = a.findIndex((n, k) => n !== b[k]);
  assert.ok(
    i === -1 || a[i] < b[i],
    `new-since ${NEW_SINCE} must not exceed ${PRODUCT_VERSION}`,
  );
});

test('deck announces the release and its own What\'s new slide', () => {
  const html = read('deck.html');
  assert.ok(
    html.includes(`What's new in ${PRODUCT_VERSION}.`),
    "deck must have a What's-new slide for the current release",
  );
  assert.ok(
    !html.includes(`What's new in ${PREVIOUS_VERSION}.`),
    'the previous release\'s What\'s-new heading must be gone',
  );
  assert.ok(/ADO Code · v[0-9.]+/.test(html), 'deck must carry a versioned kicker');
  assert.ok(
    html.includes(`ADO Code · v${PRODUCT_VERSION}`),
    'deck kicker must carry the current version',
  );
});

test('no page still advertises the previous release', () => {
  const pages = readdirSync(root).filter((f) => f.endsWith('.html'));
  for (const page of pages) {
    const html = read(page);
    assert.ok(
      !new RegExp(`v${PREVIOUS_VERSION.replace(/\./g, '\\.')}\\b`).test(html),
      `${page} still references v${PREVIOUS_VERSION}`,
    );
  }
});

test('README and capture tooling name the current version', () => {
  const readme = read('README.md');
  assert.ok(readme.includes(`v${PRODUCT_VERSION}`), `README must reference v${PRODUCT_VERSION}`);
  assert.ok(
    !readme.includes(`v${PREVIOUS_VERSION}`),
    `README must not reference v${PREVIOUS_VERSION}`,
  );
  const compose = read('tools/capture/docker-compose.capture.yml');
  assert.ok(
    compose.includes(`ado-code-${PRODUCT_VERSION}.vsix`),
    'capture tooling must mount the current .vsix',
  );
});
