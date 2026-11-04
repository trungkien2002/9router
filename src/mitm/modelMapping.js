const { MODEL_SYNONYMS, MODEL_PATTERNS } = require("./config");

// ASVS 2.2.1: model routing uses explicit identities, never an ambiguous
// prefix that can silently promote a medium/low request to another model.
function resolveMappedModel(tool, model, aliases) {
  if (typeof model !== "string" || !aliases) return null;
  const raw = model.replace(/^models\//, "");
  const canonical = MODEL_SYNONYMS?.[tool]?.[raw] || raw;
  const ownTarget = key => Object.hasOwn(aliases, key) && typeof aliases[key] === "string" && aliases[key] ? aliases[key] : null;
  const exact = ownTarget(canonical) || ownTarget(raw);
  if (exact) return exact;
  // Unknown Antigravity variants stay native. A broad /flash/ fallback can
  // otherwise hijack background/preview requests or cross version boundaries.
  if (tool === "antigravity") return null;
  const prefix = Object.keys(aliases).find(k => k && ownTarget(k) && (canonical.startsWith(k) || k.startsWith(canonical)));
  if (prefix) return ownTarget(prefix);
  for (const { match, alias } of MODEL_PATTERNS?.[tool] || []) {
    if (match.test(canonical) && ownTarget(alias)) return ownTarget(alias);
  }
  return null;
}

module.exports = { resolveMappedModel };
