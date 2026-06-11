// PortalTelemetry.jsx — animated telemetry HUD for clip preview cards
import { useState, useEffect } from 'react';

export default function PortalTelemetry({ metric }) {
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

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'none',
      background: 'rgba(7,8,10,0.72)', borderTop: '1px solid rgba(255,255,255,0.07)',
      padding: '3px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {[['FPS', tel.fps], ['X', tel.x], ['Y', tel.y], ['PROC', `${tel.ms}ms`], ['LOCK', `${tel.lock}%`]].map(([l, v]) => (
        <span key={l} style={{ fontSize: '0.54rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
          <span style={{ color: 'rgba(160,165,180,0.50)' }}>{l} </span>
          <span style={{ color: 'rgba(220,225,235,0.75)' }}>{v}</span>
        </span>
      ))}
      {metric && (
        <span style={{
          fontSize: '0.50rem', fontFamily: 'monospace',
          color: 'rgba(170,175,190,0.30)', letterSpacing: '0.07em', textTransform: 'uppercase',
        }}>
          {metric}
        </span>
      )}
    </div>
  );
}
