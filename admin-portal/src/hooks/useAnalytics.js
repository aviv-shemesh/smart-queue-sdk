import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'

function bell(h, peak, width = 2) {
  return Math.exp(-0.5 * Math.pow((h - peak) / width, 2))
}

export function generateHourlyData() {
  const now = new Date().getHours()
  const rows = []
  for (let h = 8; h <= Math.min(now, 21); h++) {
    const load = bell(h, 11) + bell(h, 15) * 0.85
    const noise = () => (Math.random() - 0.5) * 3
    rows.push({
      hour: `${String(h).padStart(2, '0')}:00`,
      waiting: Math.max(0, Math.round(load * 14 + noise())),
      waitTime: Math.max(1, Math.round(load * 9 + noise())),
      served: Math.max(0, Math.round(load * 12 + noise())),
    })
  }
  return rows
}

export function generateWeeklyData() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((day, i) => ({
    day,
    served: Math.round(35 + Math.random() * 55 + (i < 5 ? 18 : -5)),
  }))
}

export function useAnalytics(queues) {
  const [analyticsData, setAnalyticsData] = useState(null)
  // Generated once on mount — never regenerates on poll cycles
  const [hourly] = useState(generateHourlyData)
  const [weekly] = useState(generateWeeklyData)

  useEffect(() => {
    api.get('/admin/analytics/summary')
      .then(res => setAnalyticsData(res.data))
      .catch(() => {})
  }, [])

  const kpis = useMemo(() => {
    const activeQueues = queues.filter(q => q.status !== 'closed').length
    const totalWaiting = queues.reduce((s, q) => s + (q.waiting_count || 0), 0)

    // 0 means no recorded service time yet — treat as no-data so fmtSecs returns '—'
    const rawAvgService = queues.length
      ? Math.round(queues.reduce((s, q) => s + q.average_service_time_seconds, 0) / queues.length)
      : 0
    const avgServiceTime = rawAvgService || null

    // Hourly fallback (generated demo data)
    const hourlyAvg = hourly.length
      ? Math.round(hourly.reduce((s, h) => s + h.waitTime, 0) / hourly.length)
      : null
    const hourlyPeak = hourly.length ? Math.max(...hourly.map(h => h.waitTime)) : null

    // Use real analytics when > 0; fall back to hourly demo; null renders as '—'
    const avgWaitTime = analyticsData?.avg_wait_seconds > 0
      ? Math.round(analyticsData.avg_wait_seconds / 60)
      : hourlyAvg

    const peakWait = analyticsData?.peak_wait_seconds > 0
      ? Math.round(analyticsData.peak_wait_seconds / 60)
      : hourlyPeak

    // 0.0 from the backend means total=0 (no activity) — not a real 0% rate
    const abandonmentRate = analyticsData == null
      ? '—'
      : (analyticsData.served_today > 0 || analyticsData.abandonment_rate_pct > 0)
        ? analyticsData.abandonment_rate_pct
        : '—'

    return {
      activeQueues,
      totalWaiting,
      avgServiceTime,
      servedToday: analyticsData?.served_today ?? '—',
      avgWaitTime,
      peakWait,
      abandonmentRate,
    }
  }, [queues, analyticsData, hourly])

  return { hourly, weekly, kpis }
}
