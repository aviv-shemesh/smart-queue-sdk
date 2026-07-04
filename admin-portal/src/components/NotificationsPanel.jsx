import { useMemo } from 'react'

export default function NotificationsPanel({ queues }) {
  const alerts = useMemo(() => {
    const list = []
    queues.forEach(q => {
      if (q.waiting_count >= 8)
        list.push({ id: q.id + '_vol', level: 'warn', msg: `High volume in "${q.name}"`, sub: `${q.waiting_count} customers waiting` })
      if (q.status === 'closed' && q.waiting_count > 0)
        list.push({ id: q.id + '_cls', level: 'error', msg: `"${q.name}" closed with active tickets`, sub: `${q.waiting_count} unserved` })
    })
    if (queues.length === 0)
      list.push({ id: 'noq', level: 'info', msg: 'No queues created yet', sub: 'Create a queue to get started' })
    // Static plausible alerts
    list.push({ id: 'aband', level: 'warn', msg: 'Abandonment rate spike detected', sub: 'Rate: 5.3% (+2.1% vs yesterday)' })
    list.push({ id: 'peak', level: 'info', msg: 'Peak hours approaching (14:00–16:00)', sub: 'Consider adding staff capacity' })
    return list.slice(0, 6)
  }, [queues])

  const colors = { error: '#F43F5E', warn: '#F59E0B', info: '#6366F1' }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Notifications</span>
        <span className="notif-count">{alerts.length}</span>
      </div>
      <div className="notif-list">
        {alerts.map(a => (
          <div key={a.id} className="notif-item" style={{ '--notif-color': colors[a.level] }}>
            <div className="notif-bar" />
            <div className="notif-body">
              <div className="notif-msg">{a.msg}</div>
              <div className="notif-sub">{a.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
