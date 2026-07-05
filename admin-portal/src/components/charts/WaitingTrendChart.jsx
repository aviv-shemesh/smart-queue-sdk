import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function WaitingTrendChart({ data, subtitle = 'Today by hour' }) {
  return (
    <div className="panel chart-panel">
      <div className="panel-header">
        <span className="panel-title">Waiting Customers Trend</span>
        <span className="chart-sub">{subtitle}</span>
      </div>
      {!data || data.length === 0 ? (
        <div className="chart-empty">No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="waitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#29C5D6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#29C5D6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="hour" tick={{ fill: '#8FA8C8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8FA8C8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#162255', border: '1px solid rgba(41,197,214,0.2)', borderRadius: 8, color: '#fff' }} />
            <Area type="monotone" dataKey="waiting" stroke="#29C5D6" strokeWidth={2} fill="url(#waitGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
