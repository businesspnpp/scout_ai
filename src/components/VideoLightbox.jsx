import { useEffect, useRef } from 'react';

export default function VideoLightbox({ src, label, onClose }) {
  const videoRef = useRef(null);
  useEffect(() => { if (src && videoRef.current) { videoRef.current.load(); videoRef.current.play().catch(() => {}); } }, [src]);
  useEffect(() => { const h = e => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  if (!src) return null;
  return (
    <div className="animate-fadeIn" onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(20,21,27,0.97)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 880, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3ecf70', display: 'inline-block' }} />
          <span className="font-mono" style={{ fontSize: '0.72rem', color: '#8c909f', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            {label ? `${label} — Evidence Clip` : 'Highlight Reel'}
          </span>
        </div>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 7, background: '#23252f',
          border: '1px solid #3a3f54', color: '#8c909f', cursor: 'pointer', fontSize: '0.80rem',
        }}>✕</button>
      </div>

      <div style={{ width: '100%', maxWidth: 880, background: '#17181e', border: '1px solid #2e3040', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
        <video ref={videoRef} controls playsInline style={{ width: '100%', display: 'block', maxHeight: '72vh', background: '#000' }}>
          <source src={src} type="video/mp4" />
        </video>
        {/* Placeholder — shown only when video is missing */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: '#17181e', pointerEvents: 'none' }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: '#23252f', border: '1px solid #3a3f54', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c909f' }}>▶</div>
          <div style={{ textAlign: 'center' }}>
            <div className="font-syne" style={{ fontWeight: 700, color: '#f0f1f3', fontSize: '0.88rem', marginBottom: 6 }}>No video file</div>
            <code style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.76rem', color: '#50535f', background: '#1d1f27', border: '1px solid #2e3040', borderRadius: 6, padding: '4px 10px', wordBreak: 'break-all' }}>
              public{src}
            </code>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: '0.68rem', color: '#50535f' }}>ESC to close</div>
    </div>
  );
}

