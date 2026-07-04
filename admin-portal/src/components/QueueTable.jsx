import { useState, useMemo } from 'react'
import api from '../api/client'

const STATUS_COLOR = { open: '#10B981', paused: '#F59E0B', closed: '#F43F5E' }

export default function QueueTable({ queues, onManage, onRefresh }) {
  const [sort, setSort] = useState({ key: 'waiting_count', dir: -1 })
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState(null)

  const sorted = useMemo(() => {
    return queues
      .filter(q => filter === 'all' || q.status === filter)
      .filter(q => q.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const va = a[sort.key] ?? ''
        const vb = b[sort.key] ?? ''
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir
      })
  }, [queues, sort, filter, search])

  function toggleSort(key) {
    setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 }))
  }

  function Th({ col, label }) {
    const active = sort.key === col
    return (
      <th className={`th-sort ${active ? 'th-active' : ''}`} onClick={() => toggleSort(col)}>
        {label} {active ? (sort.dir === 1 ? '↑' : '↓') : '↕'}
      </th>
    )
  }

  function fmtTime(secs) {
    if (!secs) return '—'
    const m = Math.floor(secs / 60)
    return m < 1 ? '< 1 min' : `${m} min`
  }

  function copyId(id) {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  async function handleToggleStatus(q) {
    const newStatus = q.status === 'open' ? 'paused' : 'open'
    try {
      await api.patch(`/admin/queues/${q.id}/status`, { status: newStatus })
      onRefresh?.()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Queue Status</span>
        <div className="table-controls">
          <input
            className="table-search"
            placeholder="Search queues…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="filter-tabs">
            {['all', 'open', 'paused', 'closed'].map(f => (
              <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <Th col="name" label="Queue Name" />
              <Th col="status" label="Status" />
              <Th col="waiting_count" label="Waiting" />
              <Th col="now_serving" label="Now Serving" />
              <Th col="average_service_time_seconds" label="Avg Service" />
              <th>Est. Wait</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="td-empty">No queues match your filter</td></tr>
            )}
            {sorted.map(q => (
              <tr key={q.id} className="tr-hover">
                <td className="td-name">
                  <div>{q.name}</div>
                  <div className="queue-id-row">
                    <span className="queue-id-text">{q.id.slice(0, 8)}…</span>
                    <button
                      className="btn-copy-id"
                      onClick={() => copyId(q.id)}
                      title="Copy full Queue ID"
                    >
                      {copiedId === q.id ? '✓' : '⎘'}
                    </button>
                    {copiedId === q.id && <span className="copied-label">Copied!</span>}
                  </div>
                </td>
                <td>
                  <span className="status-pill" style={{ background: STATUS_COLOR[q.status] + '22', color: STATUS_COLOR[q.status] }}>
                    {q.status}
                  </span>
                </td>
                <td className="td-num">{q.waiting_count}</td>
                <td className="td-num">#{q.now_serving}</td>
                <td>{fmtTime(q.average_service_time_seconds)}</td>
                <td>{fmtTime(q.waiting_count * q.average_service_time_seconds)}</td>
                <td>
                  <div className="td-actions">
                    <button className="btn-table-action" onClick={() => onManage(q.id)}>Manage →</button>
                    {q.status !== 'closed' && (
                      <button
                        className={q.status === 'open' ? 'btn-table-pause' : 'btn-table-resume'}
                        onClick={() => handleToggleStatus(q)}
                      >
                        {q.status === 'open' ? 'Pause' : 'Resume'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
