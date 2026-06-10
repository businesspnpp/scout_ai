/**
 * PlayerModal.jsx � full-screen slide-up player detail modal
 */
import { useEffect, useRef, useState } from 'react';
import { getPositionGroup, initials } from '../data/mockPlayers.js';

function scoreColor(v) {
  if (v >= 85) return '#3ecf70';
  if (v >= 72) return '#d4a850';
  return '#8c909f';
}

function RadarChart({ scores, labels, size = 240 }) {
  const cx = size / 2, cy = size / 2, maxR = size * 0.36, n = labels.length;
  const pt = (i, v) => {
    const a = ((i * 360) / n - 90) * (Math.PI / 180);
    const r = (v / 100) * maxR;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const hex = r => Array.from({ length: n }, (_, i) => {
    const a = ((i * 360) / n - 90) * (Math.PI / 180);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
  const polyPts = scores.map((v, i) => { const p = pt(i, v); return `${p.x},${p.y}`; }).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
      {[0.25, 0.5, 0.75, 1].map(r => (
        <polygon key={r} points={hex(r * maxR)} fill="none" stroke="#2e3040" strokeWidth={r === 1 ? 1 : 0.6} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const a = ((i * 360) / n - 90) * (Math.PI / 180);
        return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="#2e3040" strokeWidth="0.6" />;
      })}
      <polygon points={polyPts} fill="rgba(62,207,112,0.07)" stroke="#3ecf70" strokeWidth="1.4" strokeLinejoin="round" />
      {scores.map((v, i) => {
        const p = pt(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3ecf70" stroke="#17181e" strokeWidth="1.4" />;
      })}
      {labels.map((lbl, i) => {
        const a = ((i * 360) / n - 90) * (Math.PI / 180);
        const r = maxR + 16, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle';
        return <text key={i} x={x} y={y + (y < cy ? -4 : y > cy + 4 ? 12 : 4)} textAnchor={anchor} fontFamily="Inter" fontSize="9" fontWeight="500" fill="#8c909f">{lbl}</text>;
      })}
    </svg>
  );
}

export default function PlayerModal({ player, onClose, onOpenLightbox, isSaved, onSaveToggle }) {
  const [tab, setTab] = useState('overview');
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);

  const group  = getPositionGroup(player.pos);
  const scores = group.keys.map(k => player.metrics[k] ?? 0);
  const overall = player.overall;
  const oColor  = overall >= 85 ? '#3ecf70' : overall >= 72 ? '#d4a850' : '#8c909f';

  useEffect(() => {
    // Slide in after mount
    requestAnimationFrame(() => setOpen(true));
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 220);
  };

  // Close on Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const TABS = ['overview', 'metrics', 'highlights', 'clips'];

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 800,
        background: open ? 'rgba(20,21,27,0.90)' : 'rgba(20,21,27,0)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        transition: 'background 0.22s ease',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 1100,
          height: '92vh',
          background: '#1d1f27',
          border: '1px solid #2e3040',
          borderRadius: '8px 8px 0 0',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.22s ease',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 3, borderRadius: 2, background: '#3a3f54', margin: '10px auto 0', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #2e3040', background: '#23252f', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          {/* Avatar */}
          <div style={{ width: 52, height: 52, borderRadius: 8, background: '#2a2d38', border: '1px solid #3a3f54', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
            <img src={player.headshot} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
            <div style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', fontSize: '0.84rem', fontWeight: 700, color: '#8c909f', fontFamily: 'Inter, sans-serif' }}>
              {initials(player.name)}
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-syne" style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {player.name}
            </div>
            <div style={{ marginTop: 3, fontSize: '0.82rem', color: '#8c909f' }}>
              <span style={{ fontWeight: 700, color: '#f0f1f3', marginRight: 8, fontSize: '0.76rem', background: '#2a2d38', border: '1px solid #3a3f54', padding: '1px 6px', borderRadius: 5 }}>{player.pos}</span>
              {player.country} � {player.age} yrs � {player.club}
            </div>
          </div>

          {/* Score */}
          <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 12 }}>
            <div className="font-syne" style={{ fontWeight: 800, fontSize: '2.4rem', lineHeight: 1, color: oColor, letterSpacing: '-0.03em' }}>{overall}</div>
            <div style={{ fontSize: '0.62rem', color: '#50535f', letterSpacing: '0.10em', textTransform: 'uppercase' }}>Overall</div>
            <div style={{ fontSize: '0.72rem', color: '#8c909f', marginTop: 2 }}>{player.aiMatch}% match</div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => onSaveToggle(player.id)}
              style={{ width: 36, height: 36, borderRadius: 7, border: isSaved ? '1px solid rgba(62,207,112,0.40)' : '1px solid #3a3f54', background: isSaved ? '#1a2520' : '#23252f', color: isSaved ? '#3ecf70' : '#8c909f', cursor: 'pointer', fontSize: '0.90rem' }}
              title={isSaved ? 'Unsave' : 'Shortlist'}
            >{isSaved ? '?' : '?'}</button>
            <button
              onClick={handleClose}
              style={{ width: 36, height: 36, borderRadius: 7, border: '1px solid #3a3f54', background: '#23252f', color: '#8c909f', cursor: 'pointer', fontSize: '0.90rem' }}
            >?</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '8px 20px', borderBottom: '1px solid #2e3040', background: '#17181e', flexShrink: 0 }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '7px 16px', borderRadius: 3, fontSize: '0.80rem', fontWeight: 600, cursor: 'pointer',
                background: tab === t ? '#23252f' : 'transparent',
                border: tab === t ? '1px solid #3a3f54' : '1px solid transparent',
                color: tab === t ? '#f0f1f3' : '#50535f',
                textTransform: 'capitalize', transition: 'all 0.12s',
              }}
            >{t}</button>
          ))}
        </div>

        {/* Body */}
        <div ref={bodyRef} className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* -- OVERVIEW -- */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
              {/* Left: bio + tags */}
              <div>
                <Panel label="Scout Notes">
                  <p style={{ fontSize: '0.90rem', color: '#f0f1f3', lineHeight: 1.65 }}>{player.bio || '—'}</p>
                  {player.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                      {player.tags.map(t => (
                        <span key={t} style={{ fontSize: '0.76rem', padding: '4px 10px', borderRadius: 6, border: '1px solid #2e3040', color: '#8c909f' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </Panel>
                <Panel label="Player Info" style={{ marginTop: 12 }}>
                  {[
                    ['Position', player.pos],
                    ['Country',  player.country],
                    ['Region',   player.region],
                    ['Age',      `${player.age} yrs`],
                    ['Club',     player.club],
                    ['Height',   player.height],
                    ['Foot',     player.foot],
                    ['AI Match', `${player.aiMatch}%`],
                  ].map(([k, v]) => v && v !== '-' ? (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #2e3040' }}>
                      <span style={{ fontSize: '0.78rem', color: '#50535f' }}>{k}</span>
                      <span style={{ fontSize: '0.82rem', color: '#f0f1f3', fontWeight: 600 }}>{v}</span>
                    </div>
                  ) : null)}
                </Panel>
              </div>

              {/* Right: radar */}
              <Panel label="Performance Radar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <RadarChart scores={scores} labels={group.labels} size={260} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginTop: 16, width: '100%' }}>
                  {group.keys.map((k, i) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', padding: '3px 0' }}>
                      <span style={{ color: '#50535f' }}>{group.labels[i]}</span>
                      <span style={{ color: scoreColor(scores[i]), fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{scores[i]}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* -- METRICS -- */}
          {tab === 'metrics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.keys.map((key, i) => {
                const val  = player.metrics[key] ?? 0;
                const reel = player.reels?.[key] ?? player.reels?.highlight ?? null;
                return <MetricRow key={key} label={group.labels[i]} value={val} reel={reel} onPlay={() => reel && onOpenLightbox(reel, group.labels[i])} />;
              })}
            </div>
          )}

          {/* -- HIGHLIGHTS -- */}
          {tab === 'highlights' && (player.reels?.highlight || !player._local) && (
            <div>
              <div style={{ background: '#17181e', border: '1px solid #2e3040', borderRadius: 10, overflow: 'hidden', maxWidth: 860, margin: '0 auto' }}>
                {player.reels?.highlight ? (
                  <video
                    src={player.reels.highlight}
                    controls
                    autoPlay
                    style={{ width: '100%', display: 'block', background: '#000', maxHeight: 480 }}
                  />
                ) : (
                  <div style={{ aspectRatio: '16/9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#50535f' }}>
                    <span style={{ fontSize: '2rem', opacity: 0.3 }}>?</span>
                    <span style={{ fontSize: '0.88rem' }}>No highlight reel available</span>
                  </div>
                )}
              </div>

              {/* Evidence clips per metric */}
              {group.keys.some(k => player.reels?.[k] && player.reels[k] !== player.reels.highlight) && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#50535f', marginBottom: 12 }}>Evidence Clips</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
                    {group.keys.map((k, i) => {
                      const reel = player.reels?.[k];
                      if (!reel || reel === player.reels?.highlight) return null;
                      return (
                        <div
                          key={k}
                          onClick={() => onOpenLightbox(reel, group.labels[i])}
                          style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #2e3040', background: '#000', cursor: 'pointer', aspectRatio: '16/9', position: 'relative' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = '#3ecf70'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = '#2e3040'}
                        >
                          <video src={reel} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted playsInline preload="metadata" />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(62,207,112,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: '0.9rem', marginLeft: 2 }}>&#9654;</span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#fff', textTransform: 'capitalize' }}>{group.labels[i]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* -- CLIPS -- */}
          {tab === 'clips' && (
            <div>
              {player.clipUrls?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
                  {player.clipUrls.map((clip, i) => (
                    <div key={i} style={{ border: '1px solid #2e3040', borderRadius: 8, overflow: 'hidden', background: '#23252f' }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e2735', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', padding: '1px 7px', borderRadius: 2, background: 'rgba(0,200,83,0.08)', border: '1px solid rgba(0,200,83,0.18)', color: '#00c853', textTransform: 'capitalize' }}>{clip.metric}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.73rem', color: '#7e8fa3' }}>{clip.start} - {clip.end}</span>
                      </div>
                      <video src={clip.url} controls style={{ width: '100%', display: 'block', background: '#000', maxHeight: 280 }} />
                      {clip.description && <div style={{ padding: '8px 14px', fontSize: '0.78rem', color: '#4a5568', lineHeight: 1.4 }}>{clip.description}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '80px 20px', color: '#4a5568' }}>
                  <div style={{ fontSize: '0.90rem', marginBottom: 6 }}>No clips yet</div>
                  <div style={{ fontSize: '0.78rem' }}>Upload a video in the portal to get auto-cut highlight clips.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ label, children, style = {} }) {
  return (
    <div style={{ background: '#131920', border: '1px solid #1e2735', borderRadius: 4, padding: '14px 16px', ...style }}>
      <div style={{ fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4a5568', marginBottom: 10 }}>{label}</div>
      {children}
    </div>
  );
}

function MetricRow({ label, value, reel, onPlay }) {
  const [open, setOpen] = useState(false);
  const col = value >= 85 ? '#00c853' : value >= 72 ? '#c9a84c' : '#7e8fa3';
  return (
    <div style={{ background: '#131920', border: '1px solid #1e2735', borderRadius: 4, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen(x => !x)}
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = '#1c2433'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#dde3ec', fontSize: '0.90rem' }}>{label}</div>
          <div style={{ marginTop: 8, height: 4, background: '#1c2433', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${value}%`, height: '100%', background: col, borderRadius: 2, transition: 'width 0.6s ease' }} />
          </div>
        </div>
        <div className="font-syne" style={{ fontWeight: 800, fontSize: '1.4rem', color: col, letterSpacing: '-0.02em', flexShrink: 0 }}>{value}</div>
        <span style={{ color: '#4a5568', fontSize: '0.70rem', transition: 'transform 0.16s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>?</span>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid #1e2735', padding: '12px 16px' }}>
          {reel ? (
            <button
              onClick={onPlay}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0d1117', border: '1px solid #28384d', borderRadius: 3, padding: '8px 14px', cursor: 'pointer', color: '#dde3ec', fontSize: '0.82rem' }}
            >
              <span style={{ color: '#00c853' }}>?</span> Play Evidence Clip
            </button>
          ) : (
            <span style={{ fontSize: '0.80rem', color: '#4a5568' }}>No evidence clip available for this metric.</span>
          )}
        </div>
      )}
    </div>
  );
}