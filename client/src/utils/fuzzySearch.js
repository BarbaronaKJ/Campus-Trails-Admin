/**
 * Normalize a string for flexible search matching
 * Removes dashes, spaces, and other special characters for fuzzy matching
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
const normalizeSearchString = (str) => {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[-\s_.,;:!?()]/g, '') // Remove dashes, spaces, and common punctuation
    .trim();
};

/**
 * Check if a search query matches a target string (flexible matching)
 * Handles cases like "9 102" matching "9-102" or "9_102"
 * @param {string} query - Search query
 * @param {string} target - Target string to match against
 * @returns {boolean} True if query matches target
 */
export const matchesFlexible = (query, target) => {
  if (!query || !target) return false;
  
  const normalizedQuery = normalizeSearchString(query);
  const normalizedTarget = normalizeSearchString(target);
  
  // Direct match after normalization
  if (normalizedTarget.includes(normalizedQuery)) {
    return true;
  }
  
  // Also check original lowercase strings for partial word matches
  const lowerQuery = query.toLowerCase().trim();
  const lowerTarget = target.toLowerCase();
  
  return lowerTarget.includes(lowerQuery);
};

/**
 * Check if a search query matches any value in an array
 * @param {string} query - Search query
 * @param {Array} targets - Array of strings to match against
 * @returns {boolean} True if query matches any target
 */
export const matchesAnyFlexible = (query, targets) => {
  if (!query || !targets || !Array.isArray(targets)) return false;
  return targets.some(target => matchesFlexible(query, target));
};
