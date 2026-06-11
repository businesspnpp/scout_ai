// FormAtoms.jsx — small reusable form primitives used inside UploaderPortal

export function Label({ children }) {
  return (
    <div style={{
      fontSize: '0.66rem', letterSpacing: '0.12em',
      textTransform: 'uppercase', color: '#4a5568',
    }}>
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.75rem', color: '#7e8fa3', marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function InfoCard({ label, value, accent }) {
  return (
    <div style={{
      background: '#131920',
      border: accent ? '1px solid rgba(0,200,83,0.20)' : '1px solid #1e2735',
      borderRadius: 3, padding: '12px 14px',
    }}>
      <div style={{
        fontSize: '0.64rem', letterSpacing: '0.10em',
        textTransform: 'uppercase', color: '#4a5568', marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{ fontSize: '0.86rem', color: accent ? '#00c853' : '#dde3ec', lineHeight: 1.5 }}>
        {value ?? '—'}
      </div>
    </div>
  );
}
