import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { dashboardService, DashboardError } from '../services/dashboardService'
import type { Channel, ChannelMember } from '../types/dashboard'

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

export function DashboardChannels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [totalChannels, setTotalChannels] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [expandedChannelId, setExpandedChannelId] = useState<number | null>(null)
  const [channelMembers, setChannelMembers] = useState<ChannelMember[]>([])
  const [totalMembers, setTotalMembers] = useState(0)
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  const [hoveredRow, setHoveredRow] = useState<number | null>(null)

  const loadChannels = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await dashboardService.getActiveChannels()
      setChannels(response.channels)
      setTotalChannels(response.count)
    } catch (err) {
      if (err instanceof DashboardError) {
        setError(err.detail || err.message)
      } else {
        setError('Failed to load channels')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  async function loadChannelMembers(channelId: number) {
    setIsLoadingMembers(true)
    try {
      const response = await dashboardService.getChannelMembers(channelId)
      setChannelMembers(response.users)
      setTotalMembers(response.count)
    } catch (err) {
      console.error('Failed to load channel members:', err)
      setChannelMembers([])
      setTotalMembers(0)
    } finally {
      setIsLoadingMembers(false)
    }
  }

  function handleRowClick(channel: Channel) {
    if (expandedChannelId === channel.id) {
      setExpandedChannelId(null)
      setChannelMembers([])
      setTotalMembers(0)
    } else {
      setExpandedChannelId(channel.id)
      loadChannelMembers(channel.id)
    }
  }

  return (
    <div style={S.page}>
      {/* Sidebar */}
      <aside style={S.sidebar}>
        <div style={S.sidebarHeader}>
          <span style={{ color: 'var(--accent)', fontSize: '13px' }}>⬡</span>
          <span style={{ color: 'var(--text-1)', fontSize: '15px' }}>admin panel</span>
        </div>
        <nav style={S.nav}>
          <NavItem to="/" label="← back to chat" dim />
          <div style={{ height: '1px', background: 'var(--border)', margin: '8px 0' }} />
          <NavItem to="/dashboard" label="users" />
          <NavItem to="/dashboard/channels" label="channels" active />
        </nav>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>justchat admin v1</span>
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>
        <header style={S.header}>
          <span style={{ color: 'var(--text-1)', fontSize: '15px' }}>channels</span>
          <button
            onClick={() => loadChannels()}
            disabled={isLoading}
            style={{
              background: 'none', border: '1px solid var(--border-bright)',
              color: isLoading ? 'var(--text-3)' : 'var(--text-2)',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              padding: '4px 10px', fontSize: '13px', fontFamily: 'var(--font)',
            }}
          >
            {isLoading ? <span className="spinning" style={{ display: 'inline-block' }}>↻</span> : '↻'} refresh
          </button>
        </header>

        <div style={S.content}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <StatBlock label="active channels" value={totalChannels} color="var(--accent)" />
            <StatBlock
              label="selected channel members"
              value={expandedChannelId ? totalMembers : '—'}
              color="#34d399"
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)',
              color: 'var(--text-error)', padding: '10px 16px', fontSize: '14px', marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {/* Table */}
          <div style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{
              padding: '0 16px', height: '40px', display: 'flex', alignItems: 'center',
              borderBottom: '1px solid var(--border)', gap: '16px',
            }}>
              <span style={{ color: 'var(--text-2)', fontSize: '13px' }}>active channels</span>
              <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>{totalChannels} total</span>
            </div>

            {isLoading ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-2)', fontSize: '14px' }}>
                loading<span className="blink">_</span>
              </div>
            ) : !error && (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '8px 16px', textAlign: 'left', color: 'var(--text-3)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 400 }}>channel</th>
                      <th style={{ padding: '8px 16px', textAlign: 'left', color: 'var(--text-3)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 400 }}>status</th>
                      <th style={{ padding: '8px 16px', textAlign: 'right', color: 'var(--text-3)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 400 }}>action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map(channel => (
                      <>
                        <tr
                          key={channel.id}
                          onClick={() => handleRowClick(channel)}
                          onMouseEnter={() => setHoveredRow(channel.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            background: expandedChannelId === channel.id
                              ? 'var(--accent-dim)'
                              : hoveredRow === channel.id
                              ? 'rgba(255,255,255,0.02)'
                              : 'transparent',
                            borderLeft: expandedChannelId === channel.id ? '2px solid var(--accent)' : '2px solid transparent',
                          }}
                        >
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ color: 'var(--accent)', fontSize: '14px', marginRight: '6px' }}>#</span>
                            <span style={{ color: expandedChannelId === channel.id ? 'var(--text-1)' : 'var(--text-2)', fontSize: '15px' }}>
                              {channel.id}
                            </span>
                            <span style={{ color: 'var(--text-3)', fontSize: '13px', marginLeft: '8px' }}>
                              {expandedChannelId === channel.id ? '▲' : hoveredRow === channel.id ? '▼' : ''}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{
                              color: '#34d399', fontSize: '12px',
                              border: '1px solid rgba(52,211,153,0.3)',
                              padding: '2px 8px', letterSpacing: '0.06em',
                            }}>
                              active
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRowClick(channel) }}
                              style={{
                                background: 'none', border: '1px solid var(--border-bright)',
                                color: 'var(--text-2)', cursor: 'pointer', padding: '3px 10px',
                                fontSize: '13px', fontFamily: 'var(--font)',
                              }}
                            >
                              {expandedChannelId === channel.id ? 'hide' : 'members'}
                            </button>
                          </td>
                        </tr>

                        {expandedChannelId === channel.id && (
                          <tr key={`${channel.id}-members`}>
                            <td colSpan={3} style={{ padding: '12px 16px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: 'var(--text-2)', fontSize: '13px', letterSpacing: '0.06em' }}>members</span>
                                <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>{isLoadingMembers ? '…' : `${totalMembers} total`}</span>
                              </div>
                              {isLoadingMembers ? (
                                <div style={{ color: 'var(--text-2)', fontSize: '14px', padding: '8px 0' }}>
                                  loading<span className="blink">_</span>
                                </div>
                              ) : channelMembers.length === 0 ? (
                                <div style={{ color: 'var(--text-3)', fontSize: '14px', padding: '8px 0' }}>no members</div>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {channelMembers.map((member) => (
                                    <div key={member.id} style={{
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      background: 'var(--surface)', border: '1px solid var(--border)',
                                      padding: '6px 12px', fontSize: '14px',
                                    }}>
                                      <span style={{ color: getUserColor(member.username), fontWeight: 500 }}>{member.username}</span>
                                      <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>#{member.id}</span>
                                      {member.is_guest && (
                                        <span style={{
                                          color: 'var(--text-2)', fontSize: '11px',
                                          border: '1px solid var(--border-bright)',
                                          padding: '1px 5px', letterSpacing: '0.05em',
                                        }}>g</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>

                {channels.length === 0 && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '14px' }}>
                    no active channels
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
