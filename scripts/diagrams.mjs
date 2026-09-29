// Pure helpers behind `scripts/make-diagrams.mjs` — no I/O, no dependencies, so
// `tests/diagrams.test.mjs` can assert against them directly.
//
//   extractDiagrams(markdown)  -> [{ index, slug, heading, source }]
//   decorateSvg(svg, opts)     -> self-contained, sized, accessible SVG markup
//   svgSize(svg)               -> { width, height } of an SVG document
//
// The markdown is the single source of truth: one `## <n>. <Title>` section
// heading per diagram gives the export its file name (`<nn>-<slug>.svg|png`).

const SECTION = /^##\s+(\d+)\.\s+(.*\S)\s*$/;
const FENCE_OPEN = /^```mermaid\s*$/;
const FENCE_CLOSE = /^```\s*$/;
const DECORATED = 'data-ado-diagram="1"';

export function slugify(text, order) {
  const body = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${String(order).padStart(2, '0')}-${body}`;
}

export function extractDiagrams(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const diagrams = [];
  let heading = null;
  let seen = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const section = SECTION.exec(lines[i]);
    if (section) {
      heading = { order: Number(section[1]), title: section[2].trim() };
      continue;
    }
    if (!FENCE_OPEN.test(lines[i])) continue;

    const body = [];
    for (i += 1; i < lines.length && !FENCE_CLOSE.test(lines[i]); i += 1) body.push(lines[i]);
    if (i >= lines.length) throw new Error('extractDiagrams: unterminated ```mermaid fence');

    seen += 1;
    const title = heading ? heading.title : `Diagram ${seen}`;
    const order = heading ? heading.order : seen;
    diagrams.push({
      index: seen,
      order,
      heading: title,
      slug: slugify(title, order),
      source: body.join('\n').trim(),
    });
  }
  return diagrams;
}

export function svgSize(svg) {
  const viewBox = /viewBox=["']([^"']+)["']/i.exec(svg);
  if (viewBox) {
    const parts = viewBox[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
    }
  }
  const width = /\bwidth=["'](\d+(?:\.\d+)?)["']/i.exec(svg);
  const height = /\bheight=["'](\d+(?:\.\d+)?)["']/i.exec(svg);
  if (!width || !height) throw new Error('svgSize: no usable viewBox or width/height');
  return { width: Math.round(Number(width[1])), height: Math.round(Number(height[1])) };
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Normalise a mermaid SVG for export:
 *  - strip mermaid's `style`/`max-width` so the SVG scales predictably,
 *  - pin width/height to the viewBox (headless screenshots need real pixels),
 *  - drop mermaid's generated title/desc and add a single accessible label,
 *  - paint an opaque background so it reads the same on light and dark viewers.
 * Idempotent: re-running on its own output is a no-op.
 */
export function decorateSvg(svg, { title = 'Diagram', background = '#0b0e14' } = {}) {
  if (svg.includes(DECORATED)) return svg;

  const root = /<svg\b[^>]*>/i.exec(svg);
  if (!root) throw new Error('decorateSvg: no <svg> root element');
  const { width, height } = svgSize(svg);

  const carried = root[0]
    .replace(/^<svg\b/i, '')
    .replace(/>$/, '')
    .replace(/\s(?:style|width|height|role|aria-roledescription|aria-labelledby|aria-label)="[^"]*"/gi, '')
    .trim();

  const attributes = [];
  if (!/\bxmlns=/i.test(carried)) attributes.push('xmlns="http://www.w3.org/2000/svg"');
  if (/xlink:/i.test(svg) && !/xmlns:xlink=/i.test(carried)) {
    attributes.push('xmlns:xlink="http://www.w3.org/1999/xlink"');
  }
  if (carried) attributes.push(carried);
  if (!/viewBox=/i.test(carried)) attributes.push(`viewBox="0 0 ${width} ${height}"`);
  attributes.push(
    `width="${width}"`,
    `height="${height}"`,
    'role="img"',
    `style="display:block;max-width:none;background:${background}"`,
    DECORATED,
  );

  const open = `<svg ${attributes.join(' ')}>`;
  const label = `<title>${escapeXml(title)}</title>`;
  const backdrop =
    `<rect class="ado-diagram-bg" x="0" y="0" width="100%" height="100%" fill="${background}"/>`;

  const body = svg
    .replace(root[0], open)
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>\s*/gi, '')
    .replace(open, `${open}\n${label}\n${backdrop}\n`);

  return `${body.trimEnd()}\n`;
}

/** HTML-escape diagram source for safe embedding in a `<pre>` element. */
export function escapeHtml(text) {
  return escapeXml(text).replace(/\r/g, '');
}
