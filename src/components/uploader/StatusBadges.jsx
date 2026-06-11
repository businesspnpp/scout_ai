// StatusBadges.jsx — sync and Shotstack status indicators

export const SYNC_CFG = {
  idle:      { color: '#4a5568', label: '' },
  saving:    { color: '#c9a84c', label: 'Saving...' },
  uploading: { color: '#c9a84c', label: 'Uploading...' },
  done:      { color: '#3ecf70', label: 'Synced' },
  error:     { color: '#c94f4f', label: 'Sync failed' },
};

export function SyncBadge({ status }) {
  const cfg = SYNC_CFG[status] ?? SYNC_CFG.idle;
  if (status === 'idle') return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: '0.72rem', color: cfg.color,
      background: '#131920', border: '1px solid #1e2735',
      borderRadius: 2, padding: '4px 9px', flexShrink: 0,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
      {cfg.label}
    </div>
  );
}

export function ShotstackBadge({ status, done, total }) {
  const map = {
    submitting: { color: '#c9a84c', label: `Rendering ${total} clips...` },
    rendering:  { color: '#c9a84c', label: `Rendering ${done}/${total}...` },
    done:       { color: '#00c853', label: `${done} clips ready` },
    failed:     { color: '#c94f4f', label: 'Clip render failed, local clips kept' },
  };
  const cfg = map[status];
  if (!cfg) return null;
  return (
    <span style={{
      marginLeft: 10, fontSize: '0.72rem', color: cfg.color,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      {(status === 'submitting' || status === 'rendering') && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: cfg.color,
          display: 'inline-block', animation: 'pulse 1.2s ease-in-out infinite',
        }} />
      )}
      {cfg.label}
    </span>
  );
}
