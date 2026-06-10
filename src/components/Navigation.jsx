/**
 * Navigation.jsx
 */
export default function Navigation({ view, setView, savedCount, cachedCount = 0 }) {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
      height: 56,
      background: '#1d1f27',
      borderBottom: '1px solid #2e3040',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 3, height: 22, background: '#3ecf70', borderRadius: 1 }} />
        <span className="font-syne" style={{
          fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#dde3ec',
        }}>
          Scout<span style={{ color: '#3ecf70' }}>AI</span>
        </span>
        <span style={{
          marginLeft: 10, fontSize: '0.68rem', color: '#4a5568',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          borderLeft: '1px solid #2e3040', paddingLeft: 10,
        }}>African Talent Discovery</span>
      </div>

      {/* Role toggle */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#17181e', border: '1px solid #2e3040', borderRadius: 8, padding: 3,
      }}>
        <RoleTab label="Uploader Portal"    sub="Coaches & Players" icon="↑" active={view === 'uploader'} onClick={() => setView('uploader')} />
        <RoleTab label="Scout Intelligence" sub="Discover Talent"   icon="◈" active={view === 'scouter'}  onClick={() => setView('scouter')}  />
      </div>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Stat label="10 profiles" dot="#3ecf70" />
        {cachedCount > 0 && <Stat label={`${cachedCount} cached`} dot="#d4a850" />}
        {savedCount  > 0 && <Stat label={`${savedCount} shortlisted`} dot="#6b8af5" />}
      </div>
    </nav>
  );
}

function RoleTab({ label, sub, icon, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', borderRadius: 3,
      border: `1px solid ${active ? '#3a3f54' : 'transparent'}`,
      background: active ? '#23252f' : 'transparent',
      color: active ? '#f0f1f3' : '#50535f',
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
      transition: 'all 0.12s',
    }}>
      <span style={{ fontSize: '0.72rem', color: active ? '#3ecf70' : '#50535f' }}>{icon}</span>
      <div>
        <div className="font-syne" style={{ fontSize: '0.73rem', fontWeight: 700, lineHeight: 1.1 }}>{label}</div>
        <div style={{ fontSize: '0.60rem', color: '#50535f', marginTop: 1 }}>{sub}</div>
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
