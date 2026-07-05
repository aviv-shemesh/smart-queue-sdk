import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { fmtMins } from '../../utils/formatTime'

export default function WaitTimeTrendChart({ data, subtitle = 'Minutes by hour' }) {
  return (
    <div className="panel chart-panel">
      <div className="panel-header">
        <span className="panel-title">Avg Wait Time Trend</span>
        <span className="chart-sub">{subtitle}</span>
      </div>
      {!data || data.length === 0 ? (
        <div className="chart-empty">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="hour" tick={{ fill: '#8FA8C8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8FA8C8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#162255', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: '#fff' }}
              formatter={(value) => [fmtMins(value), 'Avg Wait']}
            />
            <Line type="monotone" dataKey="waitTime" stroke="#6366F1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
