import { useState, useEffect, useRef } from 'react'

const ICONS = {
  join:     { icon: '→', color: '#10B981', label: 'Joined' },
  served:   { icon: '✓', color: '#29C5D6', label: 'Served' },
  called:   { icon: '📢', color: '#6366F1', label: 'Called' },
  opened:   { icon: '🟢', color: '#10B981', label: 'Opened' },
  closed:   { icon: '🔴', color: '#F43F5E', label: 'Closed' },
  paused:   { icon: '⏸', color: '#F59E0B', label: 'Paused' },
  overload: { icon: '⚠', color: '#F59E0B', label: 'High volume' },
}

export default function LiveFeed({ queues }) {
  const [events, setEvents] = useState([])
  const prevQueues = useRef({})
  const idCounter = useRef(0)

  function addEvent(type, queueName, detail) {
    const ev = { id: idCounter.current++, type, queueName, detail, time: new Date() }
    setEvents(prev => [ev, ...prev].slice(0, 25))
  }

  useEffect(() => {
    if (!queues.length) return
    // Seed initial events on first load
    if (Object.keys(prevQueues.current).length === 0) {
      queues.forEach(q => {
        if (q.waiting_count > 0) addEvent('join', q.name, `${q.waiting_count} waiting`)
      })
      addEvent('opened', queues[0]?.name, 'System startup')
    }

    queues.forEach(q => {
      const prev = prevQueues.current[q.id]
      if (!prev) return
      if (q.waiting_count > prev.waiting_count) addEvent('join', q.name, `Ticket #${q.now_serving + q.waiting_count}`)
      if (q.waiting_count < prev.waiting_count && q.now_serving === prev.now_serving)
        addEvent('served', q.name, `Position freed`)
      if (q.now_serving !== prev.now_serving) addEvent('called', q.name, `#${q.now_serving}`)
      if (q.status !== prev.status) addEvent(q.status === 'closed' ? 'closed' : q.status === 'paused' ? 'paused' : 'opened', q.name, `Status → ${q.status}`)
      if (q.waiting_count >= 8 && prev.waiting_count < 8) addEvent('overload', q.name, `${q.waiting_count} in queue`)
    })

    prevQueues.current = Object.fromEntries(queues.map(q => [q.id, q]))
  }, [queues])

  function fmtTime(d) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Live Activity</span>
        <span className="live-dot-wrap"><span className="status-dot pulse" /> LIVE</span>
      </div>
      <div className="feed-list">
        {events.length === 0 && <div className="feed-empty">Waiting for events…</div>}
        {events.map(ev => {
          const meta = ICONS[ev.type] || ICONS.join
          return (
            <div key={ev.id} className="feed-item">
              <span className="feed-icon" style={{ color: meta.color }}>{meta.icon}</span>
              <div className="feed-body">
                <div className="feed-msg">
                  <strong>{meta.label}</strong> · {ev.queueName}
                </div>
                <div className="feed-detail">{ev.detail}</div>
              </div>
              <span className="feed-time">{fmtTime(ev.time)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
