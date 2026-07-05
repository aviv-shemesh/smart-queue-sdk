import { useState, useCallback } from 'react'
import api from './api/client'
import { clearAdminSecret } from './api/client'
import { usePolling } from './hooks/usePolling'
import LoginView from './views/LoginView'
import DashboardView from './views/DashboardView'
import QueueDetailView from './views/QueueDetailView'
import Sidebar from './components/Sidebar'
import './App.css'

export default function App() {
  const [view, setView] = useState('login')
  const [selectedQueueId, setSelectedQueueId] = useState(null)
  const [queues, setQueues] = useState([])

  const fetchQueues = useCallback(async () => {
    try {
      const res = await api.get('/admin/queues')
      setQueues(res.data)
    } catch (_) {}
  }, [])

  usePolling(fetchQueues, 10000, view !== 'login')

  function handleManage(queueId) {
    setSelectedQueueId(queueId)
    setView('detail')
  }

  function handleSetView(v, queueId) {
    if (queueId) setSelectedQueueId(queueId)
    setView(v)
  }

  function handleLogout() {
    clearAdminSecret()
    setQueues([])
    setView('login')
  }

  if (view === 'login') return <LoginView onLogin={() => { setView('dashboard'); fetchQueues() }} />

  return (
    <div className="app-layout">
      <Sidebar
        view={view}
        setView={handleSetView}
        queues={queues}
        selectedQueueId={selectedQueueId}
        onLogout={handleLogout}
      />
      <div className="app-body">
        {view === 'dashboard' && <DashboardView onManage={handleManage} />}
        {view === 'detail' && (
          <QueueDetailView
            key={selectedQueueId}
            queueId={selectedQueueId}
            initialQueue={queues.find(q => q.id === selectedQueueId) ?? null}
            onBack={() => setView('dashboard')}
          />
        )}
      </div>
    </div>
  )
}
