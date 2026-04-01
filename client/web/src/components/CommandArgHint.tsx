import type { Command } from '../config/commandRegistry'

interface CommandArgHintProps {
  command: Command
  currentArgIndex: number
}

export function CommandArgHint({ command, currentArgIndex }: CommandArgHintProps) {
  const activeArg = command.arguments[currentArgIndex]

  return (
    <div
      className="popup-appear"
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: 0,
        right: 0,
        background: 'var(--surface)',
        border: '1px solid var(--border-bright)',
        padding: '10px 14px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color: 'var(--text-2)', fontSize: '15px', marginRight: '4px' }}>
        /{command.name}
      </span>
      {command.arguments.map((arg, i) => {
        const isActive = i === currentArgIndex
        const label = arg.required ? `<${arg.name}>` : `[${arg.name}]`
        return (
          <span
            key={arg.name}
            style={{
              color: isActive ? 'var(--accent)' : 'var(--text-3)',
              fontSize: '15px',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              border: isActive ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
              padding: '1px 6px',
            }}
          >
            {label}
          </span>
        )
      })}
      {activeArg && (
        <span style={{ color: 'var(--text-3)', fontSize: '13px', marginLeft: 'auto' }}>
          {activeArg.description}
        </span>
      )}
    </div>
  )
}
