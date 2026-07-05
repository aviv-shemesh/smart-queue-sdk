import { useState, useCallback } from 'react'
import api from '../api/client'
import { usePolling } from '../hooks/usePolling'
import { useAnalytics } from '../hooks/useAnalytics'
import KPICard from '../components/KPICard'
import QueueTable from '../components/QueueTable'
import LiveFeed from '../components/LiveFeed'
import NotificationsPanel from '../components/NotificationsPanel'
import WaitingTrendChart from '../components/charts/WaitingTrendChart'
import WaitTimeTrendChart from '../components/charts/WaitTimeTrendChart'
import ServedTrendChart from '../components/charts/ServedTrendChart'
import QueueDistributionChart from '../components/charts/QueueDistributionChart'
import QueueComparisonChart from '../components/charts/QueueComparisonChart'
import CreateQueueModal from '../components/CreateQueueModal'
import { fmtSecs, fmtMins } from '../utils/formatTime'

export default function DashboardView({ onManage }) {
  const [queues, setQueues] = useState([])
  const [showModal, setShowModal] = useState(false)

  const fetchQueues = useCallback(async () => {
    try {
      const res = await api.get('/admin/queues')
      setQueues(res.data)
    } catch (e) {
      console.error(e.response?.data?.detail?.message ?? e.message)
    }
  }, [])

  usePolling(fetchQueues, 10000)

  const { hourly, kpis } = useAnalytics(queues)

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Real-time overview · auto-refreshes every 10s</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Queue</button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard icon="⚡" label="Active Queues" value={kpis.activeQueues} color="cyan" />
        <KPICard icon="👥" label="Total Waiting" value={kpis.totalWaiting} color="indigo" sub={`across ${queues.length} queue${queues.length !== 1 ? 's' : ''}`} />
        <KPICard icon="✅" label="Served Today" value={kpis.servedToday} color="emerald" />
        <KPICard icon="⏱" label="Avg Wait Time" value={fmtMins(kpis.avgWaitTime)} color="amber" />
        <KPICard icon="🔺" label="Peak Wait Today" value={fmtMins(kpis.peakWait)} color="rose" />
        <KPICard icon="🔧" label="Avg Service" value={fmtSecs(kpis.avgServiceTime)} color="violet" />
        <KPICard icon="🚪" label="Abandonment Rate" value={kpis.abandonmentRate} unit="%" color="rose" />
      </div>

      {/* Charts row 1 */}
      <div className="charts-row">
        <WaitingTrendChart data={hourly} />
        <WaitTimeTrendChart data={hourly} />
      </div>

      {/* Charts row 2 */}
      <div className="charts-row">
        <ServedTrendChart data={hourly} />
        <QueueDistributionChart queues={queues} />
        <QueueComparisonChart queues={queues} />
      </div>

      {/* Queue Table */}
      <QueueTable queues={queues} onManage={onManage} onRefresh={fetchQueues} />

      {/* Bottom row: live feed + notifications */}
      <div className="bottom-row">
        <LiveFeed queues={queues} />
        <NotificationsPanel queues={queues} />
      </div>

      {showModal && (
        <CreateQueueModal
          onClose={() => setShowModal(false)}
          onCreated={fetchQueues}
        />
      )}
    </div>
  )
}
