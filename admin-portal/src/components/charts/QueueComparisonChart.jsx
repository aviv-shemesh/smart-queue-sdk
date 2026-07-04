import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export default function QueueComparisonChart({ queues }) {
  const data = queues.map(q => ({
    name: q.name.length > 12 ? q.name.slice(0, 12) + '…' : q.name,
    waiting: q.waiting_count,
    avgService: q.average_service_time_seconds ? Math.round(q.average_service_time_seconds / 60) : 0,
  }))

  return (
    <div className="panel chart-panel">
      <div className="panel-header">
        <span className="panel-title">Queue Performance Comparison</span>
        <span className="chart-sub">Waiting vs Avg Service (min)</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: '#8FA8C8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8FA8C8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: '#162255', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#8FA8C8' }} />
          <Bar dataKey="waiting" name="Waiting" fill="#29C5D6" radius={[3, 3, 0, 0]} />
          <Bar dataKey="avgService" name="Avg Service (min)" fill="#6366F1" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
