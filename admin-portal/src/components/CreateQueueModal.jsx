import { useState } from 'react'
import api from '../api/client'

export default function CreateQueueModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [minutes, setMinutes] = useState('5')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setError('')
    if (!name.trim()) {
      setError('Queue name cannot be empty')
      return
    }
    setLoading(true)
    try {
      await api.post('/admin/queues', {
        name: name.trim(),
        average_service_time_seconds: parseInt(minutes, 10) * 60,
      })
      onCreated()
      onClose()
    } catch (e) {
      const detail = e.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail[0]?.msg?.replace(/^Value error, /, '')
        : detail?.message ?? e.message
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2>Create Queue</h2>
        <label>Queue name</label>
        <input
          type="text"
          placeholder="e.g. Coffee Shop"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          autoFocus
        />
        {error && <p className="modal-error">{error}</p>}
        <label>Avg service time (minutes)</label>
        <input
          type="number"
          min="1"
          value={minutes}
          onChange={e => setMinutes(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
