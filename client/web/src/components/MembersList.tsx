interface Member {
  username: string
  isOnline: boolean
  isGuest: boolean
}

interface MembersListProps {
  members: Member[]
  currentChannelId: number | null
}

function getUserColor(username: string): string {
  const palette = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fb923c', '#facc15', '#22d3ee', '#f87171']
  const hash = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

export function MembersList({ members, currentChannelId }: MembersListProps) {
  const online = members.filter(m => m.isOnline).sort((a, b) => a.username.localeCompare(b.username))
  const offline = members.filter(m => !m.isOnline).sort((a, b) => a.username.localeCompare(b.username))

  return (
    <div style={{
      width: 'var(--members-w)',
      minWidth: 'var(--members-w)',
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
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
        <span style={{
          color: 'var(--text-3)',
          fontSize: '14px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          members
        </span>
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
                {online.map(m => <MemberRow key={m.username} member={m} />)}
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
                {offline.map(m => <MemberRow key={m.username} member={m} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MemberRow({ member }: { member: Member }) {
  const color = getUserColor(member.username)

  return (
    <div style={{
      padding: '5px 15px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
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
