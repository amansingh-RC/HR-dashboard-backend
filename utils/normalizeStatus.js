// Normalize SPST status values.
//   WOP        -> WO
//   WOP/WO     -> WO
//   WO/WOP     -> WO
//   PHP        -> PH
//   PHP/PH     -> PH
//   PH/PHP     -> PH
// Other slashed values (DP/ABS, ABS/DP, etc.) are preserved.
function normalizeStatus(raw) {
  if (raw == null) return '';
  let s = String(raw).trim().toUpperCase().replace(/\s+/g, '');
  if (!s) return '';

  // Replace WOP -> WO and PHP -> PH wherever they appear (whole word, slash-separated)
  s = s.split('/').map(function(part) {
    if (part === 'WOP') return 'WO';
    if (part === 'PHP') return 'PH';
    return part;
  }).join('/');

  // Collapse same-on-both-sides (e.g. WO/WO -> WO, PH/PH -> PH)
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 2 && parts[0] === parts[1]) return parts[0];
  }

  return s;
}

module.exports = normalizeStatus;
