// Parse a time value into minutes since midnight.
// Accepts: Excel decimal (0.375 = 9:00 AM), strings like "09:00 AM",
// "09:00:00 AM", "09:00", "9:00 AM". Returns null if not parseable.
function parseTimeToMinutes(value) {
  if (value === null || value === undefined || value === '' || value === '--') return null;

  // Excel decimal time fraction
  if (typeof value === 'number') {
    if (value >= 0 && value < 1) return Math.round(value * 24 * 60);
    return null;
  }

  const s = String(value).trim();
  const m = s.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?\s*(AM|PM)?$/i);
  if (!m) return null;

  let hours    = parseInt(m[1], 10);
  const mins   = parseInt(m[2], 10);
  const ampm   = m[3] ? m[3].toUpperCase() : null;

  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return hours * 60 + mins;
}

// Format minutes-since-midnight back to "HH:MM AM/PM"
function formatMinutesToTime(minutes) {
  const total = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  let h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' ' + ampm;
}

// Random integer in [min, max] inclusive
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = { parseTimeToMinutes, formatMinutesToTime, randInt };
