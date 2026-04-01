import { useState } from 'react'
import { useUser } from '../contexts/UserContext'

interface Member {
  username: string
  isOnline: boolean
  isGuest: boolean
}

interface MembersListProps {
  members: Member[]
  currentChannelId: number | null
  collapsed?: boolean
  onToggleCollapse?: () => void
}

function getUserColor(username: string): string {
  const palette = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fb923c', '#facc15', '#22d3ee', '#f87171']
  const hash = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

export function MembersList({ members, currentChannelId, collapsed = false, onToggleCollapse }: MembersListProps) {
  const { username: currentUsername } = useUser()
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const online = members.filter(m => m.isOnline).sort((a, b) => a.username.localeCompare(b.username))
  const offline = members.filter(m => !m.isOnline).sort((a, b) => a.username.localeCompare(b.username))

  if (collapsed) {
    return (
      <div style={{
        width: '32px', minWidth: '32px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        transition: 'width 0.15s ease',
      }}>
        <button
          onClick={onToggleCollapse}
          title="Expand members"
          style={{
            marginTop: '14px',
            background: 'none', border: 'none',
            color: 'var(--text-3)', cursor: 'pointer',
            fontSize: '16px', lineHeight: 1, padding: '4px',
          }}
        >‹</button>
      </div>
    )
  }

  return (
    <div style={{
      width: 'var(--members-w)',
      minWidth: 'var(--members-w)',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'width 0.15s ease',
    }}>
      {/* Header */}
      <div style={{
        height: 'var(--header-h)',
        padding: '0 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onToggleCollapse}
            title="Collapse"
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-3)', cursor: 'pointer',
              fontSize: '16px', lineHeight: 1, padding: '2px 4px',
            }}
          >›</button>
          <span style={{
            color: 'var(--text-3)',
            fontSize: '14px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            members
          </span>
        </div>
        {currentChannelId !== null && members.length > 0 && (
          <span style={{ color: 'var(--text-3)', fontSize: '14px' }}>{members.length}</span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {currentChannelId === null ? (
          <div style={{ padding: '10px 15px', color: 'var(--text-3)', fontSize: '15px' }}>
            select a channel
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: '10px 15px', color: 'var(--text-3)', fontSize: '15px' }}>
            no members
          </div>
        ) : (
          <>
            {online.length > 0 && (
              <div>
                <div style={{
                  padding: '5px 15px 4px',
                  color: 'var(--text-3)',
                  fontSize: '14px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  online — {online.length}
                </div>
                {online.map(m => <MemberRow key={m.username} member={m} isYou={m.username === currentUsername} onClick={() => setSelectedMember(m)} />)}
              </div>
            )}
            {offline.length > 0 && (
              <div style={{ marginTop: online.length > 0 ? '8px' : 0 }}>
                <div style={{
                  padding: '5px 15px 4px',
                  color: 'var(--text-3)',
                  fontSize: '14px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  offline — {offline.length}
                </div>
                {offline.map(m => <MemberRow key={m.username} member={m} isYou={m.username === currentUsername} onClick={() => setSelectedMember(m)} />)}
              </div>
            )}

          </>
        )}
      </div>

      {selectedMember && (
        <div
          onClick={() => setSelectedMember(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            className="modal-appear"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-bright)',
              padding: '28px 30px',
              width: '100%',
              maxWidth: '340px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ color: getUserColor(selectedMember.username), fontSize: '18px', fontWeight: 500 }}>
                {selectedMember.username}
              </span>
              <button
                onClick={() => setSelectedMember(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
              >✕</button>
            </div>
            <div style={{
              color: 'var(--text-3)', fontSize: '14px',
              border: '1px solid var(--border)',
              padding: '10px 14px',
              letterSpacing: '0.04em',
            }}>
              work in progress
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MemberRow({ member, isYou, onClick }: { member: Member; isYou: boolean; onClick: () => void }) {
  const color = getUserColor(member.username)

  return (
    <div
      onClick={onClick}
      style={{
        padding: '5px 15px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
      }}>
      <span style={{
        fontSize: '12px',
        color: member.isOnline ? 'var(--accent)' : 'var(--text-3)',
        lineHeight: 1,
        flexShrink: 0,
      }}>
        {member.isOnline ? '●' : '○'}
      </span>
      <span style={{
        color: member.isOnline ? color : 'var(--text-3)',
        fontSize: '16px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1,
        opacity: member.isOnline ? 1 : 0.5,
      }}>
        {member.username}
      </span>
      {isYou && (
        <span style={{ color: 'var(--text-3)', fontSize: '13px', flexShrink: 0 }}>you</span>
      )}
      {member.isGuest && (
        <span style={{
          color: 'var(--text-3)',
          fontSize: '12px',
          border: '1px solid var(--border-bright)',
          padding: '0 3px',
          flexShrink: 0,
        }}>
          g
        </span>
      )}
    </div>
  )
}
