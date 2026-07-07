export default function KPICard({ icon, label, value, unit = '', trend, trendUp, color = 'cyan', sub }) {
  const colors = {
    cyan:    { accent: '#29C5D6', glow: 'rgba(41,197,214,0.15)' },
    indigo:  { accent: '#6366F1', glow: 'rgba(99,102,241,0.15)' },
    emerald: { accent: '#10B981', glow: 'rgba(16,185,129,0.15)' },
    amber:   { accent: '#F59E0B', glow: 'rgba(245,158,11,0.15)' },
    rose:    { accent: '#F43F5E', glow: 'rgba(244,63,94,0.15)' },
    violet:  { accent: '#8B5CF6', glow: 'rgba(139,92,246,0.15)' },
  }
  const c = colors[color]

  return (
    <div className="kpi-card" style={{ '--accent': c.accent, '--glow': c.glow }}>
      <div className="kpi-icon" style={{ background: c.glow }}>
        <span style={{ color: c.accent }}>{icon}</span>
      </div>
      <div className="kpi-body">
        <div className="kpi-value">
          {value}<span className="kpi-unit">{value === '—' ? '' : unit}</span>
        </div>
        <div className="kpi-label">{label}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
      {trend !== undefined && (
        <div className={`kpi-trend ${trendUp ? 'up' : 'down'}`}>
          {trendUp ? '▲' : '▼'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}
