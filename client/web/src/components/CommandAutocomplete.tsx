import type { Command } from '../config/commandRegistry'

interface CommandAutocompleteProps {
  commands: Command[]
  selectedIndex: number
  onSelect: (command: Command) => void
}

export function CommandAutocomplete({ commands, selectedIndex, onSelect }: CommandAutocompleteProps) {
  if (commands.length === 0) return null

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
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '7px 13px 6px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ color: 'var(--accent)', fontSize: '14px' }}>›</span>
        <span style={{ color: 'var(--text-3)', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          commands
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: '14px', marginLeft: 'auto' }}>↑↓ enter</span>
      </div>

      <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
        {commands.map((command, index) => (
          <button
            key={command.name}
            onClick={() => onSelect(command)}
            style={{
              width: '100%',
              background: index === selectedIndex ? 'var(--accent-dim)' : 'transparent',
              border: 'none',
              borderLeft: index === selectedIndex ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              padding: '9px 15px',
              textAlign: 'left',
              display: 'block',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3px' }}>
              <span style={{ color: 'var(--accent)', fontSize: '15px' }}>/</span>
              <span style={{ color: 'var(--text-1)', fontSize: '16px' }}>{command.format}</span>
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: '15px', paddingLeft: '14px' }}>
              {command.description}
            </div>
            {command.arguments.length > 0 && (
              <div style={{ paddingLeft: '14px', marginTop: '3px' }}>
                {command.arguments.map(arg => (
                  <span key={arg.name} style={{ color: 'var(--text-3)', fontSize: '14px', marginRight: '10px' }}>
                    {arg.required ? `<${arg.name}>` : `[${arg.name}]`}
                    {' '}—{' '}{arg.description}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
