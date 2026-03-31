import { useState, type FormEvent } from 'react'
import { authService, AuthError } from '../services/authService'
import { tokenStorage } from '../services/tokenStorage'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess: (username: string) => void
  onSwitchToSignup?: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'none',
  border: 'none',
  borderBottom: '1px solid var(--border-bright)',
  outline: 'none',
  color: 'var(--text-1)',
  fontSize: '18px',
  padding: '5px 0',
  caretColor: 'var(--accent)',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-3)',
  fontSize: '14px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '5px',
}

export function LoginModal({ isOpen, onClose, onLoginSuccess, onSwitchToSignup }: LoginModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const response = await authService.login({ username, password })
      tokenStorage.setToken(response.access_token, response.expires_in)
      onLoginSuccess(username)
      onClose()
      setUsername('')
      setPassword('')
    } catch (err) {
      setError(err instanceof AuthError ? (err.detail || err.message) : 'unexpected error')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50,
    }}>
      <div
        className="modal-appear"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-bright)',
          padding: '30px',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--accent)', fontSize: '15px' }}>›</span>
            <span style={{ color: 'var(--text-2)', fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              login
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '19px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            color: 'var(--text-error)',
            fontSize: '15px',
            padding: '8px 10px',
            background: 'rgba(255, 68, 102, 0.08)',
            border: '1px solid rgba(255, 68, 102, 0.2)',
            marginBottom: '20px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              placeholder="your username"
              required
              disabled={isLoading}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={labelStyle}>password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'none',
                border: '1px solid var(--border-bright)',
                color: 'var(--text-2)',
                cursor: 'pointer',
                padding: '9px',
                fontSize: '16px',
              }}
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 1,
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                padding: '9px',
                fontSize: '16px',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? '...' : 'login'}
            </button>
          </div>
        </form>

        {onSwitchToSignup && (
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-3)', fontSize: '15px' }}>no account? </span>
            <button
              type="button"
              onClick={onSwitchToSignup}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '15px' }}
            >
              sign up
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
