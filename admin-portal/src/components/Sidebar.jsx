import { useState } from 'react'

export default function Sidebar({ view, setView, queues, selectedQueueId, onLogout }) {
  const [copiedId, setCopiedId] = useState(null)

  function copyId(e, id) {
    e.stopPropagation()
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-smart">Smart</span>
        <span className="logo-queue">Queue</span>
        <span className="sidebar-badge">Admin</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Main</div>
        <button
          className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Dashboard
        </button>

        <div className="nav-section-label" style={{ marginTop: 20 }}>Queues</div>
        {queues.map(q => (
          <button
            key={q.id}
            className={`nav-item nav-item-queue ${view === 'detail' && selectedQueueId === q.id ? 'active' : ''}`}
            onClick={() => setView('detail', q.id)}
          >
            <span
              className="queue-dot"
              style={{
                background: q.status === 'open' ? '#10B981'
                  : q.status === 'paused' ? '#F59E0B' : '#F43F5E',
              }}
            />
            <div className="nav-queue-body">
              <span className="nav-queue-name">{q.name}</span>
              <div className="nav-queue-id">
                <span>{q.id.slice(0, 8)}…</span>
                <button
                  className="btn-copy-sm"
                  onClick={e => copyId(e, q.id)}
                  title="Copy Queue ID"
                >
                  {copiedId === q.id ? '✓' : '⎘'}
                </button>
              </div>
            </div>
            {q.waiting_count > 0 && (
              <span className="nav-badge">{q.waiting_count}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <span className="status-dot pulse" />
          <span>System Online</span>
        </div>
        <button className="btn-logout" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  )
}
