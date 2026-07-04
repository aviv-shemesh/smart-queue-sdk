import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function ServedTrendChart({ data }) {
  return (
    <div className="panel chart-panel">
      <div className="panel-header">
        <span className="panel-title">Customers Served</span>
        <span className="chart-sub">Hourly throughput</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="hour" tick={{ fill: '#8FA8C8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8FA8C8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: '#162255', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, color: '#fff' }} />
          <Bar dataKey="served" fill="#10B981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
