// Panel.jsx — labelled surface card used inside PlayerModal tabs
import { THEME } from './theme.js';

export default function Panel({ label, children, style = {} }) {
  return (
    <div style={{
      background:    THEME.colors.surfaceCard,
      border:        `1px solid ${THEME.colors.borderDim}`,
      borderRadius:  THEME.radius.card,
      padding:       '16px',
      width:         '100%',
      boxSizing:     'border-box',
      ...style,
    }}>
      {label && (
        <div style={{
          fontSize: '0.62rem', letterSpacing: '0.10em',
          textTransform: 'uppercase', color: THEME.colors.textDark,
          fontWeight: 400, marginBottom: 14,
          fontFamily: 'IBM Plex Mono, monospace',
        }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}
