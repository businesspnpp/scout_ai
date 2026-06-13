/**
 * Navigation.jsx
 */
import useBreakpoint from '../hooks/useBreakpoint.js';

const NAV_LABELS = { uploader: 'Upload', scouter: 'Intelligence' };

export default function Navigation({ view, setView, savedCount, cachedCount = 0, profileCount = 10 }) {
  const { isMobile } = useBreakpoint();
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 300,
      height: 44,
      background: '#070D08',
      borderBottom: '1px solid #253328',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '0 14px' : '0 24px',
      gap: 16,
    }}>

      {/* Left: logo breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
        <span className="font-display" style={{ fontSize: '0.95rem', color: '#E8E4DC', letterSpacing: '0.02em' }}>
          SCOUT<span style={{ color: '#B8874A' }}>AI</span>
        </span>
        {!isMobile && (
          <>
            <span style={{ margin: '0 10px', color: '#4A5E4D', fontSize: '0.75rem' }}>›</span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.72rem', color: '#E8E4DC', letterSpacing: '0.01em' }}>
              {NAV_LABELS[view] ?? 'Intelligence'}
            </span>
          </>
        )}
      </div>

      {/* Center: text tabs */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', gap: 0, flexShrink: 0 }}>
        {[
          { id: 'uploader', label: 'UPLOAD' },
          { id: 'scouter',  label: 'INTELLIGENCE' },
        ].map((tab, i) => {
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              style={{
                padding: '0 18px', background: 'none', border: 'none',
                borderBottom: `2px solid ${active ? '#B8874A' : 'transparent'}`,
                borderLeft: i > 0 ? '1px solid #253328' : 'none',
                color: active ? '#E8E4DC' : '#7A8E7D',
                cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '0.70rem', letterSpacing: '0.08em',
                transition: 'color 0.15s ease, border-color 0.15s ease',
                outline: 'none',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#E8E4DC'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#7A8E7D'; }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Right: plain text stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        {!isMobile && (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.68rem', color: '#4A5E4D', letterSpacing: '0.06em' }}>
            {profileCount} PROFILES{cachedCount > 0 ? ` · ${cachedCount} CACHED` : ''}{savedCount > 0 ? ` · ${savedCount} SAVED` : ''}
          </span>
        )}
        {isMobile && savedCount > 0 && (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.68rem', color: '#4A5E4D' }}>{savedCount}</span>
        )}
      </div>
    </nav>
  );
}
