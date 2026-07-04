export default function QueueCard({ queue, onManage }) {
  const statusColor = {
    open: '#29C5D6',
    paused: '#F59E0B',
    closed: '#EF5350',
  }[queue.status] ?? '#8FA8C8'

  return (
    <div className="queue-card">
      <div className="queue-card-header">
        <span className="queue-name">{queue.name}</span>
        <span className="status-badge" style={{ background: statusColor }}>
          {queue.status}
        </span>
      </div>
      <div className="queue-stats">
        <div className="stat">
          <span className="stat-value">{queue.waiting_count}</span>
          <span className="stat-label">Waiting</span>
        </div>
        <div className="stat">
          <span className="stat-value">#{queue.now_serving}</span>
          <span className="stat-label">Now serving</span>
        </div>
      </div>
      <button className="btn-manage" onClick={onManage}>Manage</button>
    </div>
  )
}
