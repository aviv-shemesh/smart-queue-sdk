import { useState, useCallback } from 'react'
import api from '../api/client'
import { usePolling } from '../hooks/usePolling'
import KPICard from '../components/KPICard'
import WaitingTrendChart from '../components/charts/WaitingTrendChart'
import WaitTimeTrendChart from '../components/charts/WaitTimeTrendChart'
import { fmtSecs } from '../utils/formatTime'

const STATUS_COLOR = { open: '#10B981', paused: '#F59E0B', closed: '#F43F5E' }

export default function QueueDetailView({ queueId, onBack, initialQueue = null }) {
  // initialQueue comes from the dashboard's already-fetched list — renders instantly
  const [queue, setQueue] = useState(initialQueue)
  const [waitingList, setWaitingList] = useState(null)  // null = first fetch pending
  const [calling, setCalling] = useState(false)
  const [search, setSearch] = useState('')
  const [confirmClose, setConfirmClose] = useState(false)
  const [callMessage, setCallMessage] = useState(null)  // { type: 'success'|'error', text }
  const [statusError, setStatusError] = useState(null)  // string
  const [hourlyData, setHourlyData] = useState(null)    // null = first fetch pending

  const fetchAll = useCallback(async () => {
    try {
      const [qRes, wRes, hRes] = await Promise.all([
        api.get(`/queues/${queueId}`),
        api.get(`/admin/queues/${queueId}/waiting-list`),
        api.get(`/admin/queues/${queueId}/analytics/hourly`),
      ])
      setQueue(qRes.data)
      setWaitingList(wRes.data)
      setHourlyData(hRes.data)
    } catch (e) {
      console.error(e.response?.data?.detail?.message ?? e.message)
      // On error keep stale data; only initialise to empty on true first-load failure
      setHourlyData(prev => prev ?? [])
      setWaitingList(prev => prev ?? [])
    }
  }, [queueId])

  usePolling(fetchAll, 10000)

  function showCallMessage(type, text) {
    setCallMessage({ type, text })
    setTimeout(() => setCallMessage(null), 4000)
  }

  function showStatusError(text) {
    setStatusError(text)
    setTimeout(() => setStatusError(null), 4000)
  }

  async function callNext() {
    setCalling(true)
    try {
      const res = await api.post(`/admin/queues/${queueId}/call-next`)
      showCallMessage('success', `Calling ticket #${res.data.called_ticket_number} — ${res.data.customer_name}`)
      await fetchAll()
    } catch (e) {
      showCallMessage('error', e.response?.data?.detail?.message ?? e.message)
    } finally {
      setCalling(false)
    }
  }

  async function setStatus(status) {
    try {
      await api.patch(`/admin/queues/${queueId}/status`, { status })
      await fetchAll()
    } catch (e) {
      showStatusError(e.response?.data?.detail?.message ?? e.message)
    }
  }

  function exportCSV() {
    if (!waitingList?.length) return
    const rows = [['Position', 'Ticket', 'Customer', 'Waited (s)'], ...waitingList.map(t => [t.position + 1, t.ticket_number, t.customer_name, t.waited_seconds])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `queue-${queueId}.csv`
    a.click()
  }

  const filtered = (waitingList ?? []).filter(t =>
    t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    String(t.ticket_number).includes(search)
  )

  const statusColor = STATUS_COLOR[queue?.status] ?? '#8FA8C8'

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <button className="btn-back" onClick={onBack}>← Back to Dashboard</button>
          <div className="detail-title-row">
            <h1 className="page-title">{queue?.name ?? 'Loading…'}</h1>
            {queue && (
              <span className="status-pill" style={{ background: statusColor + '22', color: statusColor }}>
                {queue.status}
              </span>
            )}
          </div>
          <p className="page-sub">Queue ID: {queueId}</p>
        </div>
        <div className="detail-actions">
          <button className="btn-primary btn-call" onClick={callNext} disabled={calling}>
            {calling ? 'Calling…' : 'Call Next'}
          </button>
          <button className="btn-status" onClick={() => setStatus('open')}>Reopen</button>
          <button className="btn-status" onClick={() => setStatus('paused')}>Pause</button>
          <button
            className="btn-status btn-danger"
            onClick={() => setConfirmClose(true)}
            disabled={queue?.status === 'closed'}
          >Close</button>
          <button className="btn-status" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      {/* Inline feedback messages */}
      {callMessage && (
        <div className={`inline-msg inline-msg--${callMessage.type}`}>
          {callMessage.text}
        </div>
      )}
      {statusError && (
        <div className="inline-msg inline-msg--error">{statusError}</div>
      )}

      {/* Close queue confirmation */}
      {confirmClose && (
        <div className="confirm-banner">
          <span className="confirm-banner-text">
            Closing this queue is permanent and cannot be undone. Customers already waiting will remain until served or cancelled.
          </span>
          <div className="confirm-banner-actions">
            <button className="btn-status" onClick={() => setConfirmClose(false)}>Cancel</button>
            <button className="btn-confirm-close" onClick={() => { setStatus('closed'); setConfirmClose(false) }}>
              Yes, Close Queue
            </button>
          </div>
        </div>
      )}

      {/* KPI row — renders immediately from initialQueue; shows skeleton if no prior data */}
      {queue ? (
        <div className="kpi-grid kpi-grid-4">
          <KPICard icon="👥" label="Now Waiting" value={queue.waiting_count} color="cyan" />
          <KPICard icon="🎫" label="Now Serving" value={`#${queue.now_serving}`} color="indigo" />
          <KPICard icon="⏱" label="Avg Service Time" value={fmtSecs(queue.average_service_time_seconds)} color="amber" />
          <KPICard icon="📋" label="In Waiting List" value={waitingList?.length ?? queue.waiting_count} color="violet" />
        </div>
      ) : (
        <div className="kpi-grid kpi-grid-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="kpi-card skeleton-block" style={{ minHeight: 88 }} />)}
        </div>
      )}

      {/* Charts — pulse skeleton until first data arrives; previous data kept on re-polls */}
      <div className="charts-row">
        {hourlyData === null ? (
          <>
            <div className="panel chart-panel">
              <div className="panel-header">
                <span className="panel-title">Waiting Customers Trend</span>
                <span className="chart-sub">Today by hour</span>
              </div>
              <div className="skeleton-block skeleton-chart-area" />
            </div>
            <div className="panel chart-panel">
              <div className="panel-header">
                <span className="panel-title">Avg Wait Time Trend</span>
                <span className="chart-sub">Minutes by hour</span>
              </div>
              <div className="skeleton-block skeleton-chart-area" />
            </div>
          </>
        ) : (
          <>
            <WaitingTrendChart data={hourlyData} />
            <WaitTimeTrendChart data={hourlyData} />
          </>
        )}
      </div>

      {/* Waiting list — skeleton rows until first data arrives */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">
            Waiting List ({waitingList === null ? '…' : waitingList.length})
          </span>
          <input
            className="table-search"
            placeholder="Search by name or ticket…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="table-wrap">
          {waitingList === null ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Position</th>
                  <th style={{ width: '25%' }}>Ticket</th>
                  <th style={{ width: '25%' }}>Customer</th>
                  <th style={{ width: '25%' }}>Est. Remaining</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3].map(i => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton-cell" style={{ width: 24 }} /></td>
                    <td><div className="skeleton-cell" style={{ width: 52 }} /></td>
                    <td><div className="skeleton-cell" style={{ width: `${55 + i * 12}%` }} /></td>
                    <td><div className="skeleton-cell" style={{ width: 64 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : filtered.length === 0 ? (
            <div className="td-empty">
              {waitingList.length === 0 ? 'No customers waiting' : 'No results match your search'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Position</th>
                  <th style={{ width: '25%' }}>Ticket</th>
                  <th style={{ width: '25%' }}>Customer</th>
                  <th style={{ width: '25%' }}>Est. Remaining</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.ticket_number} className="tr-hover">
                    <td className="td-num">{t.position + 1}</td>
                    <td className="td-num">
                      <span className="ticket-badge">#{t.ticket_number}</span>
                    </td>
                    <td className="td-name">{t.customer_name}</td>
                    <td>{queue ? fmtSecs(Math.max(0, t.position * queue.average_service_time_seconds)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
