// Lightweight gate for the admin / import area.
//
// ⚠️  This is a convenience lock, NOT real security — the username and pattern
// live in the client bundle, so anyone who can read the app source can see them.
// It just keeps casual viewers out of the import/clear controls. For real
// protection, put those actions behind Appwrite authentication.

export const SESSION_KEY = "innovlab.admin.unlocked";

// 👤 Change this to your username.
export const AUTH_USERNAME = "admin";

// 🔒 The unlock pattern: the ids of the 4 objects to tap, in this order.
export const AUTH_PATTERN = [4, 6, 8, 2];

// The 10 selectable objects (the "maze"). Reorder or swap icons freely — just
// keep ids 0–9 and update AUTH_PATTERN to match the sequence you want.
export const PATTERN_OBJECTS = [
  { id: 0, icon: "🔑", name: "key" },
  { id: 1, icon: "⭐", name: "star" },
  { id: 2, icon: "🚀", name: "rocket" },
  { id: 3, icon: "🌙", name: "moon" },
  { id: 4, icon: "🔥", name: "fire" },
  { id: 5, icon: "🍀", name: "clover" },
  { id: 6, icon: "💎", name: "gem" },
  { id: 7, icon: "🎯", name: "target" },
  { id: 8, icon: "⚡", name: "bolt" },
  { id: 9, icon: "🎵", name: "note" },
];

export function checkAuth(username, selectedIds) {
  if (String(username).trim().toLowerCase() !== AUTH_USERNAME.toLowerCase()) return false;
  if (selectedIds.length !== AUTH_PATTERN.length) return false;
  return selectedIds.every((id, i) => id === AUTH_PATTERN[i]);
}
