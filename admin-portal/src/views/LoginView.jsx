import { useState } from 'react'
import { setAdminSecret } from '../api/client'

export default function LoginView({ onLogin }) {
  const [secret, setSecret] = useState('')

  function handleEnter() {
    if (!secret.trim()) return
    setAdminSecret(secret.trim())
    onLogin()
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo">
          <span className="logo-smart">Smart</span>
          <span className="logo-queue">Queue</span>
        </div>
        <p className="logo-sub">— Admin Portal —</p>
        <input
          type="password"
          placeholder="Admin secret"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleEnter()}
          autoFocus
        />
        <button onClick={handleEnter}>Enter</button>
      </div>
    </div>
  )
}
