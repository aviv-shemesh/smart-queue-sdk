/**
 * fmtSecs — format a duration given in seconds.
 *   < 60 s  →  "45 sec"
 *   < 1 hr  →  "14 min"
 *   ≥ 1 hr  →  "1 hr 10 min"  /  "2 hr"  (omits minutes when 0)
 */
export function fmtSecs(seconds) {
  if (seconds == null || isNaN(seconds)) return '—'
  const s = Math.round(seconds)
  if (s <= 0) return '0 sec'
  if (s < 60) return `${s} sec`
  const totalMin = Math.round(s / 60)
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

/**
 * fmtMins — format a duration already given in whole minutes
 * (used for analytics values that arrive pre-converted from the backend).
 *   0       →  "0 min"
 *   < 60    →  "14 min"
 *   ≥ 60    →  "1 hr 10 min"  /  "2 hr"
 */
export function fmtMins(minutes) {
  if (minutes == null || isNaN(minutes)) return '—'
  const m = Math.round(minutes)
  if (m <= 0) return '0 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h} hr` : `${h} hr ${rem} min`
}
