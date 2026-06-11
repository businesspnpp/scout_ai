/**
 * PlayerModal.jsx - Full-Screen Tac-Dark Detail Modal Matrix
 */
import { useEffect, useRef, useState } from 'react';
import { getPositionGroup, initials } from '../data/mockPlayers.js';

// ── TAC-DARK DESIGN SYSTEM (CHARCOAL & PITCH BLACK) ─────────────────────────
const THEME = {
  colors: {
    bgOverlay: 'rgba(7, 8, 10, 0.88)', // Deep canvas mask overlay
    bgCanvas: '#0b0c10',       // Base background
    surfaceCard: '#111217',    // Slate charcoal structural tiles
    surfaceHover: '#17181f',   // Component highlight elevations
    surfaceAlt: '#07080a',     // Deep inset panels and video bays
    borderDim: '#1f2026',      // Razor structural framework lines
    borderMid: '#2e303d',      // Mid-tier item line borders
    borderActive: '#3ecf70',   // High-visibility electric green focus
    
    // Performance Accent Array
    accentHigh: '#3ecf70',     // Elite Score Green
    accentMid: '#d4a850',      // Technical Amber
    accentLow: '#e05353',      // Risk Metric Crimson
    
    // Pure Typography System
    textMain: '#f0f1f3',       // Stark off-white text
    textMuted: '#8c909f',      // Medium steel subheadings
    textDark: '#4e515f'        // Low-visibility data labels
  },
  radius: {
    card: '10px',
    element: '4px',
    pill: '2px'
  }
};

function getScoreColor(val) {
  if (val >= 85) return THEME.colors.accentHigh;
  if (val >= 72) return THEME.colors.accentMid;
  return THEME.colors.textMuted;
}

// ── HIGH-PERFORMANCE RADAR CHART COMPONENT ──────────────────────────────────
function RadarChart({ scores, labels, size = 240 }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  const n = labels.length;

  const pt = (i, v) => {
    const a = ((i * 360) / n - 90) * (Math.PI / 180);
    const r = (v / 100) * maxR;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const getHexPoints = (radiusRatio) => {
    return Array.from({ length: n }, (_, i) => {
      const a = ((i * 360) / n - 90) * (Math.PI / 180);
      const currentRadius = radiusRatio * maxR;
      return `${cx + currentRadius * Math.cos(a)},${cy + currentRadius * Math.sin(a)}`;
    }).join(' ');
  };

  const polyPts = scores.map((v, i) => { const p = pt(i, v); return `${p.x},${p.y}`; }).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      {/* Concentric Structural Vectors */}
      {[0.25, 0.5, 0.75, 1].map(r => (
        <polygon key={r} points={getHexPoints(r)} fill="none" stroke={THEME.colors.borderDim} strokeWidth={r === 1 ? 1 : 0.6} />
      ))}
      {/* Target Cross-Axis Hub Dividers */}
      {Array.from({ length: n }, (_, i) => {
        const a = ((i * 360) / n - 90) * (Math.PI / 180);
        return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke={THEME.colors.borderDim} strokeWidth="0.6" />;
      })}
      {/* Performance Field Vector Area */}
      <polygon points={polyPts} fill="rgba(62,207,112,0.05)" stroke={THEME.colors.accentHigh} strokeWidth="1.5" strokeLinejoin="round" />
      {/* Micro Vertex Indicators */}
      {scores.map((v, i) => {
        const p = pt(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r="3" fill={THEME.colors.accentHigh} stroke={THEME.colors.surfaceCard} strokeWidth="1.5" />;
      })}
      {/* Typography Node Coordinates */}
      {labels.map((lbl, i) => {
        const a = ((i * 360) / n - 90) * (Math.PI / 180);
        const r = maxR + 16, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle';
        return (
          <text key={i} x={x} y={y + (y < cy ? -3 : y > cy + 4 ? 11 : 4)} textAnchor={anchor} fontFamily="Inter, sans-serif" fontSize="8.5" fontWeight="600" fill={THEME.colors.textMuted}>
            {lbl.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

// ── FULL DOSSIER PORTAL MODAL COMPONENT ─────────────────────────────────────
export default function PlayerModal({ player, onClose, onOpenLightbox, isSaved, onSaveToggle }) {
  const [tab, setTab] = useState('overview');
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);

  const group   = getPositionGroup(player.pos);
  const scores  = group.keys.map(k => player.metrics[k] ?? 0);
  const overall = player.overall;
  const oColor  = getScoreColor(overall);

  useEffect(() => {
    requestAnimationFrame(() => setOpen(true));
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 220);
  };

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
        background: open ? THEME.colors.bgOverlay : 'transparent',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        transition: 'background 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 1140,
          height: '90vh',
          background: THEME.colors.bgCanvas,
          border: `1px solid ${THEME.colors.borderDim}`,
          borderRadius: '12px 12px 0 0',
          display: 'flex', flexDirection: 'column',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.6)'
        }}
      >
        {/* Alignment Drag Handle Rig */}
        <div style={{ width: 36, height: 3, borderRadius: 2, background: THEME.colors.borderMid, margin: '12px auto 0', flexShrink: 0 }} />

        {/* ── CORE HEADER IDENTITY BAR ────────────────────────────────────── */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${THEME.colors.borderDim}`, background: THEME.colors.surfaceCard, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          
          {/* Hardware Anchor Headshot Frame */}
          <div style={{ width: 52, height: 52, borderRadius: THEME.radius.element, background: THEME.colors.surfaceAlt, border: `1px solid ${THEME.colors.borderDim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
            <img src={player.headshot} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
            <div style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: THEME.colors.textMuted, fontFamily: 'Inter, sans-serif' }}>
              {initials(player.name)}
            </div>
          </div>

          {/* Primary Meta String Group */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-syne" style={{ fontWeight: 800, fontSize: '1.3rem', color: THEME.colors.textMain, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {player.name}
            </div>
            <div style={{ marginTop: 4, fontSize: '0.80rem', color: THEME.colors.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, color: THEME.colors.textMain, fontSize: '0.68rem', background: THEME.colors.surfaceAlt, border: `1px solid ${THEME.colors.borderMid}`, padding: '2px 6px', borderRadius: THEME.radius.pill, letterSpacing: '0.04em' }}>{player.pos}</span>
              <span>{player.country}</span>
              <span style={{ color: THEME.colors.textDark }}>•</span>
              <span>{player.age} Yrs</span>
              <span style={{ color: THEME.colors.textDark }}>•</span>
              <span style={{ color: THEME.colors.textDark }}>{player.club}</span>
            </div>
          </div>

          {/* Core Analytics Target Score Block */}
          <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 16 }}>
            <div className="font-syne" style={{ fontWeight: 800, fontSize: '2.5rem', lineHeight: 1, color: oColor, letterSpacing: '-0.03em' }}>{overall}</div>
            <div style={{ fontSize: '0.58rem', color: THEME.colors.textDark, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>Overall Rating</div>
            <div style={{ fontSize: '0.70rem', color: THEME.colors.textMuted, marginTop: 1, fontFamily: 'monospace' }}>{player.aiMatch}% match</div>
          </div>

          {/* Pipeline Processing Triggers */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => onSaveToggle(player.id)}
              style={{ width: 36, height: 36, borderRadius: THEME.radius.element, border: `1px solid ${isSaved ? THEME.colors.accentHigh : THEME.colors.borderDim}`, background: isSaved ? 'rgba(62,207,112,0.06)' : THEME.colors.surfaceAlt, color: isSaved ? THEME.colors.accentHigh : THEME.colors.textMuted, cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}
              title={isSaved ? 'Release from Pipeline' : 'Shortlist Player'}
            >
              {isSaved ? '★' : '☆'}
            </button>
            <button
              onClick={handleClose}
              style={{ width: 36, height: 36, borderRadius: THEME.radius.element, border: `1px solid ${THEME.colors.borderDim}`, background: THEME.colors.surfaceAlt, color: THEME.colors.textMuted, cursor: 'pointer', fontSize: '0.90rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = THEME.colors.borderMid}
              onMouseLeave={e => e.currentTarget.style.borderColor = THEME.colors.borderDim}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── PARALLEL NAVIGATION TAB ROW ─────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 24px', borderBottom: `1px solid ${THEME.colors.borderDim}`, background: THEME.colors.surfaceAlt, flexShrink: 0 }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 14px', borderRadius: THEME.radius.pill, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                background: tab === t ? THEME.colors.surfaceCard : 'transparent',
                border: `1px solid ${tab === t ? THEME.colors.borderMid : 'transparent'}`,
                color: tab === t ? THEME.colors.textMain : THEME.colors.textDark,
                textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'all 0.12s', outline: 'none'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── CENTRAL DATA STORAGE BAY ────────────────────────────────────── */}
        <div ref={bodyRef} className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px', background: THEME.colors.bgCanvas }}>

          {/* MAP MODE: PROFILE OVERVIEW */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'start' }}>
              
              {/* Left Column Stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Panel label="AI Field Synthesis Notes">
                  <p style={{ fontSize: '0.88rem', color: THEME.colors.textMain, lineHeight: 1.6, margin: 0 }}>{player.bio || 'No scouting summary file recorded.'}</p>
                  {player.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
                      {player.tags.map(t => (
                        <span key={t} style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: 4, background: THEME.colors.surfaceAlt, border: `1px solid ${THEME.colors.borderDim}`, color: THEME.colors.textMuted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </Panel>
                
                <Panel label="Attribute Matrix Metrics">
                  {[
                    ['Target Position', player.pos],
                    ['Nationality', player.country],
                    ['Scouting Region', player.region],
                    ['Age Profile', `${player.age} yrs`],
                    ['Club / Source Assignment', player.club],
                    ['Stature Height', player.height],
                    ['Dominant Footing', player.foot],
                    ['Scout Match Confidence', `${player.aiMatch}%`],
                  ].map(([k, v]) => v && v !== '-' ? (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${THEME.colors.borderDim}` }}>
                      <span style={{ fontSize: '0.78rem', color: THEME.colors.textMuted }}>{k}</span>
                      <span style={{ fontSize: '0.82rem', color: THEME.colors.textMain, fontWeight: 600 }}>{v}</span>
                    </div>
                  ) : null)}
                </Panel>
              </div>

              {/* Right Radar Column Panel */}
              <Panel label="Parametric Vector Mesh" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
                <div style={{ margin: '12px 0 20px' }}>
                  <RadarChart scores={scores} labels={group.labels} size={250} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px', width: '100%', borderTop: `1px solid ${THEME.colors.borderDim}`, paddingTop: 14 }}>
                  {group.keys.map((k, i) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', padding: '4px 0' }}>
                      <span style={{ color: THEME.colors.textMuted }}>{group.labels[i]}</span>
                      <span style={{ color: getScoreColor(scores[i]), fontWeight: 700, fontFamily: 'monospace' }}>{scores[i]}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* MAP MODE: SLIDER METRICS ENGINE */}
          {tab === 'metrics' && (() => {
            const clipMetrics = (player.clipUrls ?? []).map(c => c.metric).filter(Boolean);
            const allKeys = [...new Set([...Object.keys(player.metrics), ...clipMetrics])];
            // hide rows that have no score AND no clips — they're Gemini noise
            const rows = allKeys.filter(key => {
              const hasScore = (player.metrics[key] ?? 0) > 0;
              const normKey  = key.toLowerCase().replace(/[\s_-]/g, '');
              const hasClip  = clipMetrics.some(m => m.toLowerCase().replace(/[\s_-]/g, '') === normKey);
              return hasScore || hasClip;
            });
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 860, margin: '0 auto' }}>
                {rows.map(key => {
                  const val   = player.metrics[key] ?? 0;
                  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                  const reel  = player.reels?.[key] ?? null;
                  const normKey = key.toLowerCase().replace(/[\s_-]/g, '');
                  const clips = player.clipUrls?.filter(c =>
                    c.metric?.toLowerCase().replace(/[\s_-]/g, '') === normKey
                  ) ?? [];
                  return <MetricRow key={key} label={label} value={val} reel={reel} clips={clips} onPlay={() => reel && onOpenLightbox(reel, label)} />;
                })}
              </div>
            );
          })()}

          {/* MAP MODE: MASTER REELS */}
          {tab === 'highlights' && (
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <div style={{ background: THEME.colors.surfaceAlt, border: `1px solid ${THEME.colors.borderDim}`, borderRadius: THEME.radius.card, overflow: 'hidden' }}>
                {player.reels?.highlight ? (
                  <VideoHUD>
                    <video
                      src={player.reels.highlight}
                      controls
                      autoPlay
                      style={{ width: '100%', display: 'block', background: '#000', maxHeight: 460 }}
                    />
                  </VideoHUD>
                ) : (
                  <div style={{ aspectRatio: '16/9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: THEME.colors.textDark }}>
                    <span style={{ fontSize: '2.5rem' }}>⊙</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: THEME.colors.textMuted }}>Primary Video Stream Unavailable</span>
                  </div>
                )}
              </div>

              {/* Per-metric evidence clips */}
              {Object.keys(player.reels || {}).some(k => k !== 'highlight' && player.reels[k] && player.reels[k] !== player.reels?.highlight) && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: THEME.colors.textDark, fontWeight: 800, marginBottom: 12 }}>
                    Evidence Clips
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {Object.entries(player.reels || {}).map(([k, reel]) => {
                      if (k === 'highlight' || !reel || reel === player.reels?.highlight) return null;
                      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                      return (
                        <div
                          key={k}
                          onClick={() => onOpenLightbox(reel, label)}
                          style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${THEME.colors.borderDim}`, background: '#000', cursor: 'pointer', aspectRatio: '16/9', position: 'relative', transition: 'border-color 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = THEME.colors.borderActive}
                          onMouseLeave={e => e.currentTarget.style.borderColor = THEME.colors.borderDim}
                        >
                          <video src={reel} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted playsInline preload="metadata" />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,8,10,0.5)' }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: THEME.colors.accentHigh, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                              <span style={{ fontSize: '0.75rem', color: THEME.colors.bgCanvas, marginLeft: 2 }}>▶</span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: THEME.colors.textMain, fontWeight: 600, textTransform: 'capitalize', letterSpacing: '0.04em' }}>{label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MAP MODE: AUTOMATED CLIPS GRID */}
          {tab === 'clips' && (
            <div style={{ maxWidth: 940, margin: '0 auto' }}>
              {player.clipUrls?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
                  {player.clipUrls.map((clip, i) => (
                    <div key={i} style={{ border: `1px solid ${THEME.colors.borderDim}`, borderRadius: THEME.radius.card, overflow: 'hidden', background: THEME.colors.surfaceCard }}>
                      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${THEME.colors.borderDim}`, background: THEME.colors.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: THEME.radius.pill, background: 'rgba(62,207,112,0.06)', border: `1px solid ${THEME.colors.borderActive}`, color: THEME.colors.accentHigh, fontWeight: 700, textTransform: 'uppercase' }}>
                          {clip.metric}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: THEME.colors.textMuted }}>
                          T: [{clip.start} - {clip.end}]
                        </span>
                      </div>
                      <VideoHUD metric={clip.metric}>
                        <video src={clip.url} controls preload="auto" style={{ width: '100%', display: 'block', background: '#000', maxHeight: 240 }} />
                      </VideoHUD>
                      {clip.description && (
                        <div style={{ padding: '12px 14px', fontSize: '0.78rem', color: THEME.colors.textMuted, lineHeight: 1.45, background: THEME.colors.surfaceAlt, borderTop: `1px solid ${THEME.colors.borderDim}` }}>
                          {clip.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: THEME.colors.surfaceCard, border: `1px dashed ${THEME.colors.borderDim}`, borderRadius: THEME.radius.card }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8, color: THEME.colors.textDark }}>⊘</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: THEME.colors.textMain, marginBottom: 4 }}>Automated Feed Clip Pools Empty</div>
                  <div style={{ fontSize: '0.78rem', color: THEME.colors.textMuted }}>Ingest full matches via server portals to generate automated micro clips.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// HUD overlay — wraps any <video> with tactical telemetry chrome
function TelField({ label, value }) {
  return (
    <span style={{ fontSize: '0.55rem', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
      <span style={{ color: 'rgba(160,165,180,0.50)' }}>{label} </span>
      <span style={{ color: 'rgba(220,225,235,0.75)' }}>{value}</span>
    </span>
  );
}

function VideoHUD({ children, metric = null }) {
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

  const G  = 'rgba(180,185,200,0.70)';  // muted gray
  const GA = 'rgba(180,185,200,0.35)';  // dim gray accent
  const BG = 'rgba(7,8,10,0.72)';
  const br = { position: 'absolute', width: 12, height: 12, pointerEvents: 'none' };

  return (
    <div style={{ position: 'relative', background: '#000', overflow: 'hidden' }}>
      {children}

      {/* scanline veil */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.008) 3px, rgba(255,255,255,0.008) 4px)' }} />

      {/* corner brackets */}
      <div style={{ ...br, top: 7, left: 7,    borderTop:    `1px solid ${GA}`, borderLeft:  `1px solid ${GA}` }} />
      <div style={{ ...br, top: 7, right: 7,   borderTop:    `1px solid ${GA}`, borderRight: `1px solid ${GA}` }} />
      <div style={{ ...br, bottom: 28, left: 7,  borderBottom: `1px solid ${GA}`, borderLeft:  `1px solid ${GA}` }} />
      <div style={{ ...br, bottom: 28, right: 7, borderBottom: `1px solid ${GA}`, borderRight: `1px solid ${GA}` }} />

      {/* ● ANALYTICS STREAM: ACTIVE */}
      <div style={{ position: 'absolute', top: 8, left: 20, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', gap: 4,
        background: BG, border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 2, padding: '2px 7px' }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: G, display: 'inline-block',
          animation: 'termBlink 1.8s step-end infinite' }} />
        <span style={{ fontSize: '0.52rem', fontWeight: 600, letterSpacing: '0.09em', color: G, fontFamily: 'monospace' }}>
          ANALYTICS STREAM: ACTIVE
        </span>
      </div>

      {/* LOCK % top-right */}
      <div style={{ position: 'absolute', top: 8, right: 20, pointerEvents: 'none',
        background: BG, border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 2, padding: '2px 7px' }}>
        <span style={{ fontSize: '0.52rem', fontWeight: 600, letterSpacing: '0.07em', color: G, fontFamily: 'monospace' }}>
          LOCK {tel.lock}%
        </span>
      </div>

      {/* telemetry bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, pointerEvents: 'none',
        background: BG, borderTop: `1px solid rgba(255,255,255,0.07)`,
        padding: '3px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <TelField label="FPS"  value={tel.fps} />
        <TelField label="X"    value={tel.x} />
        <TelField label="Y"    value={tel.y} />
        <TelField label="PROC" value={`${tel.ms}ms`} />
        {metric && (
          <span style={{ fontSize: '0.50rem', fontFamily: 'monospace', color: 'rgba(180,185,200,0.30)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            {metric.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

// ── INTERNAL ATOM PANEL SUBSTRUCTURE ────────────────────────────────────────
function Panel({ label, children, style = {} }) {
  return (
    <div style={{ background: THEME.colors.surfaceCard, border: `1px solid ${THEME.colors.borderDim}`, borderRadius: THEME.radius.card, padding: '16px', width: '100%', boxSizing: 'border-box', ...style }}>
      {label && <div style={{ fontSize: '0.65rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: THEME.colors.textDark, fontWeight: 800, marginBottom: 14 }}>{label}</div>}
      {children}
    </div>
  );
}

// ── PARAMETRIC EXPANDABLE METRIC ROW ELEMENT ────────────────────────────────
function MetricRow({ label, value, reel, clips = [], onPlay }) {
  const [open, setOpen] = useState(false);
  const col = getScoreColor(value);
  const hasContent = clips.length > 0 || reel;

  return (
    <div style={{ background: THEME.colors.surfaceCard, border: `1px solid ${THEME.colors.borderDim}`, borderRadius: THEME.radius.element, overflow: 'hidden' }}>
      <div
        onClick={() => hasContent && setOpen(x => !x)}
        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', cursor: hasContent ? 'pointer' : 'default', transition: 'background 0.12s' }}
        onMouseEnter={e => { if (hasContent) e.currentTarget.style.background = THEME.colors.surfaceHover; }}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: THEME.colors.textMain, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            {label}
            {clips.length > 0 && (
              <span style={{ fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.06em', color: THEME.colors.accentHigh, background: 'rgba(62,207,112,0.07)', border: `1px solid rgba(62,207,112,0.25)`, borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase' }}>
                {clips.length} clip{clips.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ marginTop: 8, height: 4, background: THEME.colors.surfaceAlt, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${value}%`, height: '100%', background: col, borderRadius: 2, transition: 'width 0.4s cubic-bezier(0.1, 1, 0.1, 1)' }} />
          </div>
        </div>
        <div className="font-syne" style={{ fontWeight: 800, fontSize: '1.5rem', color: col, letterSpacing: '-0.02em', flexShrink: 0 }}>
          {value}
        </div>
        {hasContent && (
          <span style={{ color: THEME.colors.textDark, fontSize: '0.75rem', transition: 'transform 0.16s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>▼</span>
        )}
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${THEME.colors.borderDim}`, padding: '14px 18px', background: THEME.colors.surfaceAlt }}>
          {clips.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {clips.map((clip, i) => (
                <div key={i} style={{ border: `1px solid ${THEME.colors.borderDim}`, borderRadius: THEME.radius.element, overflow: 'hidden', background: THEME.colors.surfaceCard }}>
                  <div style={{ padding: '6px 10px', borderBottom: `1px solid ${THEME.colors.borderDim}`, background: THEME.colors.bgCanvas, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.06em', color: THEME.colors.accentHigh, textTransform: 'uppercase' }}>{clip.metric}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: THEME.colors.textDark }}>{clip.start} – {clip.end}</span>
                  </div>
                  <VideoHUD metric={clip.metric}>
                    <video src={clip.url} controls preload="auto" style={{ width: '100%', display: 'block', background: '#000', maxHeight: 200 }} />
                  </VideoHUD>
                  {clip.description && (
                    <div style={{ padding: '8px 10px', fontSize: '0.76rem', color: THEME.colors.textMuted, lineHeight: 1.45 }}>{clip.description}</div>
                  )}
                </div>
              ))}
            </div>
          ) : reel ? (
            <button
              onClick={onPlay}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: THEME.colors.surfaceCard, border: `1px solid ${THEME.colors.borderMid}`, borderRadius: 4, padding: '6px 12px', cursor: 'pointer', color: THEME.colors.textMain, fontSize: '0.78rem', fontWeight: 600 }}
            >
              <span style={{ color: THEME.colors.accentHigh }}>▶</span> View Evidence
            </button>
          ) : (
            <span style={{ fontSize: '0.78rem', color: THEME.colors.textDark }}>No evidence clip for this metric.</span>
          )}
        </div>
      )}
    </div>
  );
}