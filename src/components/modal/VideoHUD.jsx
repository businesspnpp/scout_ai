// VideoHUD.jsx — tactical telemetry overlay wrapping any <video> element
import { useState, useEffect } from 'react';

function TelField({ label, value }) {
  return (
    <span style={{ fontSize: '0.55rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
      <span style={{ color: 'rgba(160,165,180,0.50)' }}>{label} </span>
      <span style={{ color: 'rgba(220,225,235,0.75)' }}>{value}</span>
    </span>
  );
}

export default function VideoHUD({ children, metric = null }) {
  const [tel, setTel] = useState({ fps: '24.0', x: '0512', y: '0288', ms: '12.4', lock: 97 });

  useEffect(() => {
    const id = setInterval(() => {
      setTel({
        fps:  (23.0 + Math.random() * 7).toFixed(1),
        x:    String(Math.floor(480 + Math.random() * 560)).padStart(4, '0'),
        y:    String(Math.floor(200 + Math.random() * 480)).padStart(4, '0'),
        ms:   (6.2 + Math.random() * 9.8).toFixed(1),
        lock: Math.floor(93 + Math.random() * 7),
      });
    }, 140);
    return () => clearInterval(id);
  }, []);

  const G  = 'rgba(180,185,200,0.70)';
  const GA = 'rgba(180,185,200,0.35)';
  const BG = 'rgba(7,8,10,0.72)';
  const br = { position: 'absolute', width: 12, height: 12, pointerEvents: 'none' };

  return (
    <div style={{ position: 'relative', background: '#000', overflow: 'hidden' }}>
      {children}

      {/* Scanline veil */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 4px)',
      }} />

      {/* Corner brackets */}
      <div style={{ ...br, top: 7,      left: 7,   borderTop:    `1px solid ${GA}`, borderLeft:  `1px solid ${GA}` }} />
      <div style={{ ...br, top: 7,      right: 7,  borderTop:    `1px solid ${GA}`, borderRight: `1px solid ${GA}` }} />
      <div style={{ ...br, bottom: 28,  left: 7,   borderBottom: `1px solid ${GA}`, borderLeft:  `1px solid ${GA}` }} />
      <div style={{ ...br, bottom: 28,  right: 7,  borderBottom: `1px solid ${GA}`, borderRight: `1px solid ${GA}` }} />

      {/* Top-left analytics label */}
      <div style={{
        position: 'absolute', top: 8, left: 20, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', gap: 4,
        background: BG, border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 2, padding: '2px 7px',
      }}>
        <span style={{
          width: 4, height: 4, borderRadius: '50%', background: G,
          display: 'inline-block', animation: 'termBlink 1.8s step-end infinite',
        }} />
        <span style={{ fontSize: '0.52rem', fontWeight: 600, letterSpacing: '0.09em', color: G, fontFamily: 'monospace' }}>
          ANALYTICS STREAM: ACTIVE
        </span>
      </div>

      {/* Top-right lock % */}
      <div style={{
        position: 'absolute', top: 8, right: 20, pointerEvents: 'none',
        background: BG, border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 2, padding: '2px 7px',
      }}>
        <span style={{ fontSize: '0.52rem', fontWeight: 600, letterSpacing: '0.07em', color: G, fontFamily: 'monospace' }}>
          LOCK {tel.lock}%
        </span>
      </div>

      {/* Telemetry bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'none',
        background: BG, borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '3px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <TelField label="FPS"  value={tel.fps} />
        <TelField label="X"    value={tel.x} />
        <TelField label="Y"    value={tel.y} />
        <TelField label="PROC" value={`${tel.ms}ms`} />
        {metric && (
          <span style={{
            fontSize: '0.50rem', fontFamily: 'monospace',
            color: 'rgba(180,185,200,0.30)', letterSpacing: '0.07em', textTransform: 'uppercase',
          }}>
            {metric.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
