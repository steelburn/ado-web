// ───────────────────────────────────────────────────────────────────────────
// Single source of truth for the site's pages (multi-page IA, Option A).
//
// Before the split the site was one long index.html; consumers hard-coded
// "index.html". Now every consumer reads this list instead:
//
//   * tests/chrome-parity.test.mjs   — hand-duplicated chrome must stay identical
//   * scripts/set-site-version.mjs   — rewrite ?v= in *every* page (Phase 3)
//   * tests/{seo,sitemap-parity,nav-completeness,link-integrity}.test.mjs (Phase 4)
//
// Chrome strategy = A1: the shared <header>/<footer> are hand-copied into each
// page (no build step, no assembler). `_partials/{header,footer}.html` hold the
// canonical copies and the parity test guarantees the hand copies never drift.
//
// `chromeMigrated` flips to true once a page's chrome has been replaced with the
// canonical copy (Phase 2). Until then the parity test only sanity-checks it.
// ───────────────────────────────────────────────────────────────────────────

export const SITE_ORIGIN = 'https://ado-code.ne1.dev';

const page = (o) => ({
  nav: null,            // primary-nav key, or null for the home page
  label: null,          // primary-nav link text (null when nav === null)
  jsonLd: [],           // JSON-LD @type values expected in this page's <head>
  chrome: 'marketing',  // marketing pages share one header/footer; deck has its own
  chromeMigrated: true,
  ...o,
});

export const PAGES = [
  page({
    key: 'index',
    file: 'index.html',
    url: '/',
    title: 'ADO Code — AI coding assistant with Azure DevOps integration for VS Code',
    description:
      'ADO Code brings your Azure DevOps backlog into VS Code. Fetch work items as a real hierarchy, chat with any OpenAI-compatible or Anthropic LLM, and delegate tasks to coding agents in isolated git worktrees.',
    canonical: `${SITE_ORIGIN}/`,
    jsonLd: ['SoftwareApplication'],
  }),
  page({
    key: 'features',
    file: 'features.html',
    url: '/features.html',
    nav: 'features',
    label: 'Features',
    title: 'Features — ADO Code',
    description: 'Every ADO Code capability: backlog hierarchy, chat, agents, tools and Azure DevOps integration.',
    canonical: `${SITE_ORIGIN}/features.html`,
  }),
  page({
    key: 'gallery',
    file: 'gallery.html',
    url: '/gallery.html',
    nav: 'gallery',
    label: 'Gallery',
    title: 'Gallery — ADO Code',
    description: 'ADO Code product screenshots and the narrated launch film.',
    canonical: `${SITE_ORIGIN}/gallery.html`,
  }),
  page({
    key: 'modes',
    file: 'modes.html',
    url: '/modes.html',
    nav: 'modes',
    label: 'Modes',
    title: 'Modes — ADO Code',
    description: 'Agent, Chat and Plan modes — what each one is for and when to reach for it.',
    canonical: `${SITE_ORIGIN}/modes.html`,
  }),
  page({
    key: 'agents',
    file: 'agents.html',
    url: '/agents.html',
    nav: 'agents',
    label: 'Agents',
    title: 'Agents — ADO Code',
    description: 'Delegate work items to coding agents that run in isolated git worktrees.',
    canonical: `${SITE_ORIGIN}/agents.html`,
  }),
  page({
    key: 'commands',
    file: 'commands.html',
    url: '/commands.html',
    nav: 'commands',
    label: 'Commands',
    title: 'Commands — ADO Code',
    description: 'Every ADO Code command, from fetching work items to delegating agents.',
    canonical: `${SITE_ORIGIN}/commands.html`,
  }),
  page({
    key: 'install',
    file: 'install.html',
    url: '/install.html',
    nav: 'install',
    label: 'Install',
    title: 'Install — ADO Code',
    description: 'Install ADO Code from the VS Code Marketplace and connect your Azure DevOps organisation.',
    canonical: `${SITE_ORIGIN}/install.html`,
  }),
  page({
    key: 'faq',
    file: 'faq.html',
    url: '/faq.html',
    nav: 'faq',
    label: 'FAQ',
    title: 'FAQ — ADO Code',
    description: 'Answers to the questions people ask before installing ADO Code.',
    canonical: `${SITE_ORIGIN}/faq.html`,
    jsonLd: ['FAQPage'],
  }),
  page({
    key: 'deck',
    file: 'deck.html',
    url: '/deck.html',
    nav: 'deck',
    label: 'Deck',
    title: 'Deck — ADO Code',
    description: 'The ADO Code presentation deck.',
    canonical: `${SITE_ORIGIN}/deck.html`,
    chrome: 'deck',
  }),
];

/** Ordered primary-nav items (pages that carry a nav slot, in PAGES order). */
export const PRIMARY_NAV = PAGES.filter((p) => p.nav).map((p) => ({
  key: p.nav,
  label: p.label,
  url: p.url,
}));

/** Pages whose chrome is the shared marketing header/footer (excludes the deck). */
export const MARKETING_PAGES = PAGES.filter((p) => p.chrome === 'marketing');

/** Look up a page by its SSOT key. */
export const pageByKey = (key) => PAGES.find((p) => p.key === key);
