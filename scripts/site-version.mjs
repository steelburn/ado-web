// Single source of truth for the SITE's asset cache-bust version.
//
// This is the version used in the `?v=` query string on stylesheets/scripts
// in index.html. It is intentionally separate from the *extension* version
// shown in the page copy (e.g. "v0.6.6" next to the product name): the asset
// version only needs to change whenever the site's CSS/JS change, so returning
// visitors fetch fresh files past nginx's `immutable` cache.
//
// To bump: edit this value, then run `node scripts/set-site-version.mjs`.
export const SITE_VERSION = '0.8.0';
