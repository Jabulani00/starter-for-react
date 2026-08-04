// Identity merge — the same person is sometimes enrolled under slightly
// different names on the two door readers (entry vs exit machine). Add
// "variant (lowercase)": "Canonical Name" pairs here to merge them.
//
// Ported from Innovation Lab Access Report.html. Matching is case-insensitive
// and ignores extra whitespace, so "Dr  Mutanga" and "Dr Mutanga" already merge
// without a rule. Add a rule only when the spelling actually differs.
export const NAME_ALIASES = {
  thandazani: "Thandaza",
  "mr motsilili": "Phomolo",
};

// Return the canonical display name for a raw scan name.
export function canonName(name) {
  const n = String(name || "").replace(/\s+/g, " ").trim();
  if (!n) return "Unknown";
  return NAME_ALIASES[n.toLowerCase()] || n;
}
