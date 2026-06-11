/**
 * Navigation.jsx
 */
import useBreakpoint from '../hooks/useBreakpoint.js';

export default function Navigation({ view, setView, savedCount, cachedCount = 0 }) {
  const { isMobile, isTablet } = useBreakpoint();
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
      height: 56,
      background: '#0d0d0f',
      borderBottom: '1px solid #222225',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 14px' : '0 24px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 22, background: '#3ecf70', borderRadius: 1, flexShrink: 0 }} />
        <span className="font-syne" style={{
          fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#dde3ec',
        }}>
          Scout<span style={{ color: '#3ecf70' }}>AI</span>
        </span>
        {!isMobile && (
          <span style={{
            marginLeft: 10, fontSize: '0.68rem', color: '#4a5568',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            borderLeft: '1px solid #2e3040', paddingLeft: 10,
          }}>African Talent Discovery</span>
        )}
      </div>

      {/* Role toggle */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#1a1a1c', border: '1px solid #252527', borderRadius: 8, padding: 3,
      }}>
        <RoleTab label={isMobile ? 'Upload' : 'Uploader Portal'}    sub={isMobile ? null : 'Coaches & Players'} icon="↑" active={view === 'uploader'} onClick={() => setView('uploader')} compact={isMobile} />
        <RoleTab label={isMobile ? 'Scout'  : 'Scout Intelligence'} sub={isMobile ? null : 'Discover Talent'}   icon="◈" active={view === 'scouter'}  onClick={() => setView('scouter')}  compact={isMobile} />
      </div>

      {/* Status — hidden on mobile */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Stat label="10 profiles" dot="#3ecf70" />
          {cachedCount > 0 && <Stat label={`${cachedCount} cached`} dot="#d4a850" />}
          {savedCount  > 0 && <Stat label={`${savedCount} shortlisted`} dot="#6b8af5" />}
        </div>
      )}
      {isMobile && savedCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.70rem', color: '#6b8af5' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6b8af5', display: 'inline-block' }} />
          {savedCount}
        </div>
      )}
    </nav>
  );
}

function RoleTab({ label, sub, icon, active, onClick, compact = false }) {
  return (
    <button onClick={onClick} style={{
      padding: compact ? '7px 12px' : '7px 16px', borderRadius: 3,
      border: `1px solid ${active ? '#3a3f54' : 'transparent'}`,
      background: active ? '#1e1e21' : 'transparent',
      color: active ? '#f0f1f3' : '#50535f',
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: compact ? 5 : 8,
      transition: 'all 0.12s',
    }}>
      <span style={{ fontSize: '0.72rem', color: active ? '#3ecf70' : '#50535f' }}>{icon}</span>
      <div>
        <div className="font-syne" style={{ fontSize: compact ? '0.70rem' : '0.73rem', fontWeight: 700, lineHeight: 1.1 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.60rem', color: '#50535f', marginTop: 1 }}>{sub}</div>}
      </div>
    </button>
  );
}

function Stat({ label, dot }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#8c909f' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, display: 'inline-block' }} />
      {label}
    </div>
  );
}
