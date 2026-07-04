import { ResponsiveContainer, PieChart, Pie, Tooltip } from 'recharts'

const COLORS = [
  '#29C5D6', // cyan
  '#6366F1', // indigo
  '#10B981', // emerald
  '#F59E0B', // amber
  '#F43F5E', // rose
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#F97316', // orange
]

export default function QueueDistributionChart({ queues }) {
  const data = queues
    .filter(q => q.waiting_count > 0)
    .map((q, i) => ({
      name:  q.name,
      value: q.waiting_count,
      fill:  COLORS[i % COLORS.length],
    }))

  if (data.length === 0) {
    data.push({ name: 'No active queues', value: 1, fill: '#8FA8C8' })
  }

  return (
    <div className="panel chart-panel">
      <div className="panel-header">
        <span className="panel-title">Queue Distribution</span>
        <span className="chart-sub">Current waiting share</span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            dataKey="value"
            paddingAngle={3}
          />
          <Tooltip
            contentStyle={{
              background: '#162255',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#fff',
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="dist-legend">
        {data.map((entry, i) => (
          <span key={i} className="dist-legend-item">
            <span className="dist-legend-dot" style={{ background: entry.fill }} />
            {entry.name}
          </span>
        ))}
      </div>
    </div>
  )
}
