// Guards the exported architecture diagrams.
//
// `docs/architecture.md` is the single source of truth: every ```mermaid block
// must have a committed SVG + PNG in `docs/diagrams/`, named after its section
// heading. This keeps the rendered exports from drifting behind the source, and
// keeps them loadable as images (well-formed XML, real raster bytes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractDiagrams, decorateSvg, svgSize } from '../scripts/diagrams.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docPath = join(root, 'docs', 'architecture.md');
const outDir = join(root, 'docs', 'diagrams');

const markdown = readFileSync(docPath, 'utf8');
const diagrams = extractDiagrams(markdown);

function pngInfo(png) {
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    bitDepth: png[24],
    colorType: png[25],
  };
}

/** Concatenated + inflated IDAT payload (raw scanlines, filters still applied). */
function pngData(png) {
  const chunks = [];
  for (let i = 8; i < png.length; i += png.readUInt32BE(i) + 12) {
    if (png.toString('latin1', i + 4, i + 8) === 'IDAT') chunks.push(png.subarray(i + 8, i + 8 + png.readUInt32BE(i)));
  }
  return inflateSync(Buffer.concat(chunks));
}

test('architecture.md contains diagrams with unique, stable slugs', () => {
  assert.ok(diagrams.length >= 4, `expected >= 4 diagrams, got ${diagrams.length}`);
  const slugs = diagrams.map((d) => d.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'slugs must be unique');
  for (const d of diagrams) {
    assert.match(d.slug, /^\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/, `bad slug: ${d.slug}`);
    assert.ok(d.heading.length > 0, 'diagram must know its heading');
    assert.match(d.source.trim(), /^(flowchart|graph|sequenceDiagram|stateDiagram|erDiagram|classDiagram|journey|gantt)/, `bad diagram source for ${d.slug}`);
  }
});

test('every diagram has a committed SVG and PNG', () => {
  for (const d of diagrams) {
    for (const ext of ['svg', 'png']) {
      const file = join(outDir, `${d.slug}.${ext}`);
      assert.ok(existsSync(file), `missing export: docs/diagrams/${d.slug}.${ext}`);
    }
  }
});

test('exported SVGs are self-contained, sized, and labelled', () => {
  for (const d of diagrams) {
    const svg = readFileSync(join(outDir, `${d.slug}.svg`), 'utf8');
    assert.match(svg, /^<svg[\s>]/, `${d.slug}.svg must start with <svg`);
    assert.match(svg.trimEnd(), /<\/svg>$/, `${d.slug}.svg must end with </svg>`);
    assert.ok(svg.includes('viewBox='), `${d.slug}.svg must carry a viewBox`);
    assert.ok(!svg.includes('NaN'), `${d.slug}.svg must not contain NaN`);
    // Portability: no exec, no remote assets, no <foreignObject> labels (which
    // render as blank boxes in resvg/Inkscape/ImageMagick and get stripped by
    // sanitisers). Labels must be real <text> nodes.
    assert.ok(!/<script[\s>]/i.test(svg), `${d.slug}.svg must not embed scripts`);
    assert.ok(!/<foreignObject[\s>]/i.test(svg), `${d.slug}.svg must not depend on <foreignObject> labels`);
    assert.ok(!/<image[\s>]/i.test(svg), `${d.slug}.svg must not embed raster images`);
    assert.ok(!/\b(?:xlink:)?href=["']/i.test(svg), `${d.slug}.svg must not link out`);
    assert.ok(!/url\(\s*["']?https?:/i.test(svg), `${d.slug}.svg must not reference remote assets`);
    assert.ok(!/@import/i.test(svg), `${d.slug}.svg must not @import fonts`);
    assert.ok(svg.includes('<text'), `${d.slug}.svg must carry text labels`);
    assert.ok(svg.includes('role="img"'), `${d.slug}.svg must be labelled role="img"`);
    assert.ok(svg.includes('<title>'), `${d.slug}.svg must carry a <title>`);
    const { width, height } = svgSize(svg);
    assert.ok(width >= 200 && height >= 120, `${d.slug}.svg is implausibly small (${width}x${height})`);
  }
});

test('exported PNGs are real 2x rasters of the same aspect ratio', () => {
  for (const d of diagrams) {
    const png = readFileSync(join(outDir, `${d.slug}.png`));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${d.slug}.png is not a PNG`);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const { width: sw, height: sh } = svgSize(readFileSync(join(outDir, `${d.slug}.svg`), 'utf8'));
    assert.ok(width > 0 && height > 0, `${d.slug}.png has no dimensions`);
    assert.ok(Math.abs(width / height - sw / sh) < 0.02, `${d.slug}.png aspect ${width}x${height} drifts from SVG ${sw}x${sh}`);
    assert.ok(width >= sw * 1.5, `${d.slug}.png should be exported at ~2x (got ${width}px for ${sw}px)`);
  }
});

test('exported PNGs contain real raster pixels, not a blank screenshot', () => {
  for (const d of diagrams) {
    const png = readFileSync(join(outDir, `${d.slug}.png`));
    const { width, height, bitDepth, colorType } = pngInfo(png);
    assert.equal(bitDepth, 8, `${d.slug}.png must be 8-bit`);
    assert.ok(colorType === 6 || colorType === 2, `${d.slug}.png must be RGB/RGBA, got colour type ${colorType}`);
    const data = pngData(png);
    assert.equal(
      data.length,
      height * (1 + width * (colorType === 6 ? 4 : 3)),
      `${d.slug}.png raster length does not match ${width}x${height}`,
    );
    const shades = new Set(data).size;
    assert.ok(shades >= 24, `${d.slug}.png looks blank — only ${shades} distinct byte values`);
  }
});

test('architecture.md links every exported diagram', () => {
  for (const d of diagrams) {
    assert.ok(markdown.includes(`diagrams/${d.slug}.svg`), `${d.slug}.svg is not linked from the doc`);
    assert.ok(markdown.includes(`diagrams/${d.slug}.png`), `${d.slug}.png is not linked from the doc`);
  }
});

test('decorateSvg adds background + accessible title, and is idempotent', () => {
  const raw = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><g><text>hi</text></g></svg>';
  const once = decorateSvg(raw, { title: 'Demo', background: '#0b0e14' });
  assert.ok(once.includes('role="img"'));
  assert.ok(once.includes('<title>Demo</title>'));
  assert.ok(once.includes('fill="#0b0e14"'), 'background rect must be injected');
  assert.ok(once.includes('viewBox="0 0 100 50"'), 'viewBox must be preserved');
  assert.ok(once.includes('<text>hi</text>'), 'content must be preserved');
  const twice = decorateSvg(once, { title: 'Demo', background: '#0b0e14' });
  assert.equal(twice, once, 'decorateSvg must be idempotent');
});

test('svgSize prefers viewBox, falls back to width/height attributes', () => {
  assert.deepEqual(svgSize('<svg viewBox="0 0 640 480"></svg>'), { width: 640, height: 480 });
  assert.deepEqual(svgSize('<svg width="320" height="200"></svg>'), { width: 320, height: 200 });
  assert.deepEqual(svgSize('<svg width="320" height="200" viewBox="0 0 640 400"></svg>'), { width: 640, height: 400 });
});
