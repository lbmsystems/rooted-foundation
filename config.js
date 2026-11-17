// Shared config for rooted-foundation.org family pages (/visit, /register).
// API_BASE is the Cloudflare Worker in lbmsystems/r2r-visit (/worker). No trailing slash.
window.R2R_CONFIG = {
  API_BASE: "https://r2r-visit.learnbuildmaintain.workers.dev",
  MONTHS_AHEAD: 12,
  // Family handbook link shown on the registration sign step. Leave empty for plain text.
  HANDBOOK_URL: ""
};
