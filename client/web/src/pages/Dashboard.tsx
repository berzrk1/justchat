import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { dashboardService, DashboardError } from '../services/dashboardService'
import type { UserPublic, MessagePublic, UserUpdate } from '../types/dashboard'

const PAGE_SIZE_OPTIONS = [10, 25, 50]
const MESSAGES_PER_PAGE = 5

function getUserColor(username: string): string {
  const palette = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fb923c', '#facc15', '#22d3ee', '#f87171']
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return palette[Math.abs(hash) % palette.length]
}

const S = {
  page: { display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' } as React.CSSProperties,
  sidebar: { width: '220px', minWidth: '220px', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' as const, height: '100vh' },
  sidebarHeader: { padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' },
  nav: { flex: 1, padding: '12px 0', overflowY: 'auto' as const },
  main: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', minWidth: 0 },
  header: { padding: '0 24px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 },
  content: { flex: 1, overflowY: 'auto' as const, padding: '24px' },
  inputBase: { background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', fontFamily: 'var(--font)', fontSize: '16px', caretColor: 'var(--accent)' } as React.CSSProperties,
  modalOverlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  modal: { background: 'var(--surface)', border: '1px solid var(--border-bright)', padding: '30px', width: '100%', maxWidth: '400px' } as React.CSSProperties,
  labelStyle: { display: 'block', color: 'var(--text-3)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '6px' },
  modalInput: { width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border-bright)', outline: 'none', color: 'var(--text-1)', fontFamily: 'var(--font)', fontSize: '16px', padding: '6px 0', caretColor: 'var(--accent)' } as React.CSSProperties,
}

function NavItem({ to, label, active, dim }: { to: string; label: string; active?: boolean; dim?: boolean }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 20px',
      color: active ? 'var(--text-1)' : dim ? 'var(--text-3)' : 'var(--text-2)',
      textDecoration: 'none', fontSize: '15px',
      borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
      background: active ? 'var(--accent-dim)' : 'transparent',
    }}>
      {active && <span style={{ color: 'var(--accent)', fontSize: '12px' }}>›</span>}
      {label}
    </Link>
  )
}

function StatBlock({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, padding: '16px 20px', flex: 1, minWidth: 0 }}>
      <div style={{ color: 'var(--text-2)', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div>
      <div style={{ color, fontSize: '26px', fontWeight: '600' }}>{value}</div>
    </div>
  )
}

export function Dashboard() {
  const [users, setUsers] = useState<UserPublic[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registeredOnly, setRegisteredOnly] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [registeredCount, setRegisteredCount] = useState(0)
  const [guestCount, setGuestCount] = useState(0)

  const [expandedUserId, setExpandedUserId] = useState<number | null>(null)
  const [userMessages, setUserMessages] = useState<MessagePublic[]>([])
  const [totalMessages, setTotalMessages] = useState(0)
  const [messagesPage, setMessagesPage] = useState(0)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  const [editingUser, setEditingUser] = useState<UserPublic | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [deletingUser, setDeletingUser] = useState<UserPublic | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => { setSearchQuery(searchInput); setCurrentPage(1) }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await dashboardService.getUsers(currentPage, pageSize, registeredOnly, searchQuery || undefined)
      setUsers(response.users)
      setTotalUsers(response.total_users)
      setTotalPages(response.total_pages)
      setRegisteredCount(response.users.filter(u => !u.is_guest).length)
      setGuestCount(response.users.filter(u => u.is_guest).length)
    } catch (err) {
      setError(err instanceof DashboardError ? (err.detail || err.message) : 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, pageSize, registeredOnly, searchQuery])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function loadUserMessages(userId: number, page: number = 0) {
    setIsLoadingMessages(true)
    try {
      const response = await dashboardService.getUserMessages(userId, page * MESSAGES_PER_PAGE, MESSAGES_PER_PAGE)
      setUserMessages(response.messages)
      setTotalMessages(response.count)
      setMessagesPage(page)
    } catch {
      setUserMessages([])
      setTotalMessages(0)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  function handleRowClick(user: UserPublic) {
    if (expandedUserId === user.id) {
      setExpandedUserId(null); setUserMessages([]); setTotalMessages(0); setMessagesPage(0)
    } else {
      setExpandedUserId(user.id); loadUserMessages(user.id, 0)
    }
  }

  function openEditModal(user: UserPublic, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingUser(user); setEditUsername(user.username); setEditPassword(''); setEditError(null)
  }

  function closeEditModal() {
    setEditingUser(null); setEditUsername(''); setEditPassword(''); setEditError(null)
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingUser) return
    setIsEditing(true); setEditError(null)
    const updateData: UserUpdate = {}
    if (editUsername !== editingUser.username) updateData.username = editUsername
    if (editPassword) updateData.password = editPassword
    if (Object.keys(updateData).length === 0) { closeEditModal(); return }
    try {
      const updated = await dashboardService.updateUser(editingUser.id, updateData)
      setUsers(users.map(u => u.id === updated.id ? updated : u))
      closeEditModal()
    } catch (err) {
      setEditError(err instanceof DashboardError ? (err.detail || err.message) : 'Failed to update user')
    } finally {
      setIsEditing(false)
    }
  }

  function openDeleteModal(user: UserPublic, e: React.MouseEvent) {
    e.stopPropagation(); setDeletingUser(user)
  }

  async function handleDeleteConfirm() {
    if (!deletingUser) return
    setIsDeleting(true)
    try {
      await dashboardService.deleteUser(deletingUser.id)
      if (expandedUserId === deletingUser.id) { setExpandedUserId(null); setUserMessages([]) }
      setDeletingUser(null)
      loadUsers()
    } catch { /* ignore */ } finally {
      setIsDeleting(false)
    }
  }

  const totalMessagesPages = Math.ceil(totalMessages / MESSAGES_PER_PAGE)

  const thStyle: React.CSSProperties = {
    padding: '10px 16px', textAlign: 'left', color: 'var(--text-3)',
    fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase',
    fontWeight: '500', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  }

  return (
    <div style={S.page}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <span style={{ color: 'var(--accent)', fontSize: '12px' }}>●</span>
          <span style={{ color: 'var(--text-1)', fontSize: '15px', fontWeight: '500' }}>admin panel</span>
        </div>
        <nav style={S.nav}>
          <NavItem to="/" label="← back to chat" dim />
          <div style={{ height: '8px' }} />
          <NavItem to="/dashboard" label="users" active />
          <NavItem to="/dashboard/channels" label="channels" />
        </nav>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>justchat admin</span>
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--text-3)' }}>#</span>
            <span style={{ color: 'var(--text-1)', fontWeight: '500', fontSize: '16px' }}>users</span>
          </div>
          <button
            onClick={() => loadUsers()}
            disabled={isLoading}
            style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '18px', opacity: isLoading ? 0.4 : 1 }}
            title="Refresh"
          >
            <span className={isLoading ? 'spinning' : ''} style={{ display: 'inline-block' }}>↻</span>
          </button>
        </div>

        <div style={S.content}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <StatBlock label="total users" value={totalUsers} color="var(--accent)" />
            <StatBlock label="registered" value={registeredCount} color="#22c55e" />
            <StatBlock label="guests" value={guestCount} color="#fbbf24" />
            <StatBlock label="messages (page)" value={totalMessages || '—'} color="#60a5fa" />
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--text-error)', padding: '10px 16px', fontSize: '14px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {/* Table card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--accent)', userSelect: 'none' }}>›</span>
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="search username..."
                style={{ ...S.inputBase, fontSize: '14px', width: '180px' }}
              />
              <span style={{ color: 'var(--border-bright)' }}>|</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <span style={{ color: 'var(--text-2)', fontSize: '13px' }}>registered only</span>
                <button
                  onClick={() => { setCurrentPage(1); setRegisteredOnly(!registeredOnly) }}
                  style={{
                    width: '32px', height: '18px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                    background: registeredOnly ? 'var(--accent)' : 'var(--border-bright)', position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '3px', left: registeredOnly ? '15px' : '3px',
                    width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg)', transition: 'left 0.2s',
                  }} />
                </button>
              </label>
              <span style={{ color: 'var(--border-bright)' }}>|</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--text-2)', fontSize: '13px' }}>show</span>
                <select
                  value={pageSize}
                  onChange={e => { setCurrentPage(1); setPageSize(Number(e.target.value)) }}
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-bright)', color: 'var(--text-1)', fontFamily: 'var(--font)', fontSize: '13px', padding: '2px 6px', outline: 'none' }}
                >
                  {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <span style={{ color: 'var(--text-3)', fontSize: '13px', marginLeft: 'auto' }}>{totalUsers} users</span>
            </div>

            {/* Loading */}
            {isLoading && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-2)', fontSize: '14px' }}>
                loading<span className="blink">_</span>
              </div>
            )}

            {/* Table */}
            {!isLoading && !error && (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>user</th>
                        <th style={thStyle}>status</th>
                        <th style={thStyle}>joined</th>
                        <th style={thStyle}>id</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => {
                        const isExpanded = expandedUserId === user.id
                        const isHovered = hoveredRow === user.id
                        const color = getUserColor(user.username)
                        const tdStyle: React.CSSProperties = {
                          padding: '10px 16px',
                          borderBottom: '1px solid var(--border)',
                          background: isExpanded ? 'var(--surface-2)' : isHovered ? 'rgba(255,255,255,0.02)' : 'transparent',
                        }
                        return (
                          <>
                            <tr
                              key={user.id}
                              onClick={() => handleRowClick(user)}
                              onMouseEnter={() => setHoveredRow(user.id)}
                              onMouseLeave={() => setHoveredRow(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td style={tdStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ color, fontWeight: '500', fontSize: '15px' }}>{user.username}</span>
                                  <span style={{ color: 'var(--text-3)', fontSize: '13px', transition: 'opacity 0.1s', opacity: isHovered || isExpanded ? 1 : 0 }}>
                                    {isExpanded ? '▴' : '▾'}
                                  </span>
                                </div>
                              </td>
                              <td style={tdStyle}>
                                {user.is_guest ? (
                                  <span style={{ color: '#fbbf24', fontSize: '13px', border: '1px solid rgba(251,191,36,0.3)', padding: '2px 8px' }}>guest</span>
                                ) : (
                                  <span style={{ color: '#22c55e', fontSize: '13px', border: '1px solid rgba(34,197,94,0.3)', padding: '2px 8px' }}>registered</span>
                                )}
                              </td>
                              <td style={tdStyle}>
                                <span style={{ color: 'var(--text-2)', fontSize: '14px' }}>
                                  {new Date(user.created_at).toLocaleDateString()}
                                </span>
                              </td>
                              <td style={tdStyle}>
                                <span style={{ color: 'var(--text-3)', fontSize: '14px' }}>#{user.id}</span>
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                  <button
                                    onClick={e => openEditModal(user, e)}
                                    style={{ background: 'none', border: '1px solid var(--border-bright)', color: 'var(--text-2)', cursor: 'pointer', padding: '3px 8px', fontSize: '13px' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.borderColor = '#60a5fa' }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-bright)' }}
                                    title="Edit"
                                  >
                                    edit
                                  </button>
                                  <button
                                    onClick={e => openDeleteModal(user, e)}
                                    style={{ background: 'none', border: '1px solid var(--border-bright)', color: 'var(--text-2)', cursor: 'pointer', padding: '3px 8px', fontSize: '13px' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-error)'; e.currentTarget.style.borderColor = 'var(--text-error)' }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-bright)' }}
                                    title="Delete"
                                  >
                                    del
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded messages */}
                            {isExpanded && (
                              <tr key={`${user.id}-msgs`}>
                                <td colSpan={5} style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', padding: '0' }}>
                                  <div style={{ borderLeft: '2px solid var(--accent)', margin: '0 16px 12px', padding: '12px 16px' }}>
                                    <div style={{ color: 'var(--text-2)', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                                      message history
                                      <span style={{ color: 'var(--text-3)', marginLeft: '8px', textTransform: 'none', letterSpacing: 0 }}>({totalMessages} total)</span>
                                    </div>

                                    {isLoadingMessages ? (
                                      <div style={{ color: 'var(--text-2)', fontSize: '14px', padding: '8px 0' }}>
                                        loading<span className="blink">_</span>
                                      </div>
                                    ) : userMessages.length === 0 ? (
                                      <div style={{ color: 'var(--text-3)', fontSize: '14px', padding: '8px 0' }}>no messages</div>
                                    ) : (
                                      <>
                                        {userMessages.map((msg, idx) => (
                                          <div key={idx} style={{ display: 'flex', gap: '12px', padding: '5px 0', borderBottom: idx < userMessages.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'baseline' }}>
                                            <span style={{ color: 'var(--text-3)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                              {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </span>
                                            <span style={{ color: 'var(--text-3)', fontSize: '13px', whiteSpace: 'nowrap' }}>ch#{msg.channel_id}</span>
                                            <span style={{ color: 'var(--text-1)', fontSize: '15px', wordBreak: 'break-word' }}>{msg.content}</span>
                                          </div>
                                        ))}

                                        {totalMessagesPages > 1 && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                            <button
                                              onClick={e => { e.stopPropagation(); loadUserMessages(user.id, messagesPage - 1) }}
                                              disabled={messagesPage === 0}
                                              style={{ background: 'none', border: '1px solid var(--border-bright)', color: 'var(--text-2)', cursor: messagesPage === 0 ? 'not-allowed' : 'pointer', padding: '3px 10px', fontSize: '13px', opacity: messagesPage === 0 ? 0.4 : 1 }}
                                            >
                                              ← prev
                                            </button>
                                            <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>
                                              {messagesPage + 1} / {totalMessagesPages}
                                            </span>
                                            <button
                                              onClick={e => { e.stopPropagation(); loadUserMessages(user.id, messagesPage + 1) }}
                                              disabled={messagesPage >= totalMessagesPages - 1}
                                              style={{ background: 'none', border: '1px solid var(--border-bright)', color: 'var(--text-2)', cursor: messagesPage >= totalMessagesPages - 1 ? 'not-allowed' : 'pointer', padding: '3px 10px', fontSize: '13px', opacity: messagesPage >= totalMessagesPages - 1 ? 0.4 : 1 }}
                                            >
                                              next →
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {users.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)', fontSize: '14px' }}>no users found</div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
                    <button
                      onClick={() => setCurrentPage(p => p - 1)}
                      disabled={currentPage === 1}
                      style={{ background: 'none', border: '1px solid var(--border-bright)', color: 'var(--text-2)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', padding: '5px 14px', fontSize: '14px', opacity: currentPage === 1 ? 0.4 : 1 }}
                    >
                      ← prev
                    </button>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let p = i + 1
                        if (totalPages > 5) {
                          if (currentPage <= 3) p = i + 1
                          else if (currentPage > totalPages - 3) p = totalPages - 4 + i
                          else p = currentPage - 2 + i
                        }
                        const isActive = currentPage === p
                        return (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            style={{
                              background: isActive ? 'var(--accent-dim)' : 'none',
                              border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border-bright)'}`,
                              color: isActive ? 'var(--accent)' : 'var(--text-2)',
                              cursor: 'pointer', width: '32px', height: '32px', fontSize: '14px',
                            }}
                          >
                            {p}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={currentPage >= totalPages}
                      style={{ background: 'none', border: '1px solid var(--border-bright)', color: 'var(--text-2)', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', padding: '5px 14px', fontSize: '14px', opacity: currentPage >= totalPages ? 0.4 : 1 }}
                    >
                      next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editingUser && (
        <div style={S.modalOverlay}>
          <div className="modal-appear" style={S.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent)' }}>›</span>
                <span style={{ color: 'var(--text-2)', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>edit user</span>
              </div>
              <button onClick={closeEditModal} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <div style={{ color: 'var(--text-3)', fontSize: '13px', marginBottom: '20px' }}>
              editing <span style={{ color: getUserColor(editingUser.username) }}>{editingUser.username}</span>
            </div>

            {editError && (
              <div style={{ color: 'var(--text-error)', fontSize: '13px', padding: '8px 10px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', marginBottom: '18px' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label style={S.labelStyle}>username</label>
                <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} style={S.modalInput} required disabled={isEditing} />
              </div>
              <div style={{ marginBottom: '28px' }}>
                <label style={S.labelStyle}>
                  new password <span style={{ color: 'var(--text-3)', textTransform: 'none', letterSpacing: 0 }}>(leave empty to keep)</span>
                </label>
                <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)} style={S.modalInput} placeholder="••••••••" disabled={isEditing} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={closeEditModal} disabled={isEditing} style={{ flex: 1, background: 'none', border: '1px solid var(--border-bright)', color: 'var(--text-2)', cursor: 'pointer', padding: '9px', fontSize: '15px' }}>
                  cancel
                </button>
                <button type="submit" disabled={isEditing} style={{ flex: 1, background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent)', cursor: isEditing ? 'not-allowed' : 'pointer', padding: '9px', fontSize: '15px', opacity: isEditing ? 0.6 : 1 }}>
                  {isEditing ? '...' : 'save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingUser && (
        <div style={S.modalOverlay}>
          <div className="modal-appear" style={S.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-error)' }}>✕</span>
                <span style={{ color: 'var(--text-2)', fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>delete user</span>
              </div>
              <button onClick={() => setDeletingUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <div style={{ color: 'var(--text-1)', fontSize: '15px', marginBottom: '8px' }}>
                delete <span style={{ color: getUserColor(deletingUser.username) }}>{deletingUser.username}</span>?
              </div>
              <div style={{ color: 'var(--text-error)', fontSize: '13px', opacity: 0.75 }}>this action cannot be undone</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setDeletingUser(null)} disabled={isDeleting} style={{ flex: 1, background: 'none', border: '1px solid var(--border-bright)', color: 'var(--text-2)', cursor: 'pointer', padding: '9px', fontSize: '15px' }}>
                cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={isDeleting} style={{ flex: 1, background: 'rgba(248,113,113,0.1)', border: '1px solid var(--text-error)', color: 'var(--text-error)', cursor: isDeleting ? 'not-allowed' : 'pointer', padding: '9px', fontSize: '15px', opacity: isDeleting ? 0.6 : 1 }}>
                {isDeleting ? '...' : 'delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
