import { useState, type FormEvent, useMemo } from 'react'
import { authService, AuthError } from '../services/authService'
import { tokenStorage } from '../services/tokenStorage'

interface SignupModalProps {
  isOpen: boolean
  onClose: () => void
  onSignupSuccess: (username: string) => void
  onSwitchToLogin: () => void
}

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: '8+ characters', test: (p) => p.length >= 8 },
  { label: 'uppercase', test: (p) => /[A-Z]/.test(p) },
  { label: 'lowercase', test: (p) => /[a-z]/.test(p) },
  { label: 'digit', test: (p) => /\d/.test(p) },
]

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

export function SignupModal({ isOpen, onClose, onSignupSuccess, onSwitchToLogin }: SignupModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validation = useMemo(() =>
    PASSWORD_REQUIREMENTS.map(r => ({ ...r, passed: r.test(password) })),
    [password]
  )

  const isPasswordValid = validation.every(r => r.passed)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0
  const isUsernameValid = username.length >= 3 && username.length <= 30
  const canSubmit = isUsernameValid && isPasswordValid && passwordsMatch && !isLoading

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setIsLoading(true)
    try {
      await authService.signup({ username, password })
      const response = await authService.login({ username, password })
      tokenStorage.setToken(response.access_token, response.expires_in)
      onSignupSuccess(username)
      onClose()
      setUsername('')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof AuthError ? (err.detail || err.message) : 'unexpected error')
      setPassword('')
      setConfirmPassword('')
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
              create account
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
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                ...inputStyle,
                borderBottomColor: username.length > 0 && !isUsernameValid ? 'var(--text-error)' : 'var(--border-bright)',
              }}
              placeholder="3–30 characters"
              required
              minLength={3}
              maxLength={30}
              disabled={isLoading}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
              required
              disabled={isLoading}
              autoComplete="new-password"
            />
            {password.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                {validation.map((req, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '14px',
                      color: req.passed ? 'var(--accent)' : 'var(--text-3)',
                      border: `1px solid ${req.passed ? 'var(--accent)' : 'var(--border-bright)'}`,
                      padding: '3px 8px',
                      transition: 'all 0.15s',
                    }}
                  >
                    {req.passed ? '✓ ' : ''}{req.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={labelStyle}>confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                ...inputStyle,
                borderBottomColor: confirmPassword.length > 0 && !passwordsMatch ? 'var(--text-error)' : 'var(--border-bright)',
              }}
              placeholder="••••••••"
              required
              disabled={isLoading}
              autoComplete="new-password"
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
              disabled={!canSubmit}
              style={{
                flex: 1,
                background: canSubmit ? 'var(--accent-dim)' : 'transparent',
                border: `1px solid ${canSubmit ? 'var(--accent)' : 'var(--border-bright)'}`,
                color: canSubmit ? 'var(--accent)' : 'var(--text-3)',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                padding: '9px',
                fontSize: '16px',
                transition: 'all 0.15s',
              }}
            >
              {isLoading ? '...' : 'sign up'}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <span style={{ color: 'var(--text-3)', fontSize: '15px' }}>have an account? </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '15px' }}
          >
            log in
          </button>
        </div>
      </div>
    </div>
  )
}
