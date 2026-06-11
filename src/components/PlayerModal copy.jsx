/**
 * PlayerModal.jsx - Full-Screen Tac-Dark Detail Modal Matrix
 */
import { useEffect, useRef, useState } from 'react';
import { getPositionGroup, initials } from '../data/mockPlayers.js';
import { THEME, getScoreColor } from './modal/theme.js';
import RadarChart from './modal/RadarChart.jsx';
import VideoHUD   from './modal/VideoHUD.jsx';
import MetricRow  from './modal/MetricRow.jsx';
import Panel      from './modal/Panel.jsx';
import useBreakpoint from '../hooks/useBreakpoint.js';

// ── Inline sub-components extracted to src/components/modal/ ──────────────
// THEME, getScoreColor → modal/theme.js
// RadarChart → modal/RadarChart.jsx
// VideoHUD   → modal/VideoHUD.jsx
// MetricRow  → modal/MetricRow.jsx
// Panel      → modal/Panel.jsx

// ── FULL DOSSIER PORTAL MODAL COMPONENT ─────────────────────────────────────
export default function PlayerModal({ player, onClose, onOpenLightbox, isSaved, onSaveToggle }) {
  const [tab, setTab] = useState('overview');
  const [open, setOpen] = useState(false);
  const bodyRef = useRef(null);
  const { isMobile } = useBreakpoint();

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
        <div style={{ padding: isMobile ? '12px 14px' : '16px 24px', borderBottom: `1px solid ${THEME.colors.borderDim}`, background: THEME.colors.surfaceCard, display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16, flexShrink: 0 }}>
          
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
          <div style={{ textAlign: 'right', flexShrink: 0, marginRight: isMobile ? 0 : 16 }}>
            <div className="font-syne" style={{ fontWeight: 800, fontSize: isMobile ? '1.8rem' : '2.5rem', lineHeight: 1, color: oColor, letterSpacing: '-0.03em' }}>{overall}</div>
            {!isMobile && <div style={{ fontSize: '0.58rem', color: THEME.colors.textDark, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>Overall Rating</div>}
            <div style={{ fontSize: '0.70rem', color: THEME.colors.textMuted, marginTop: 1, fontFamily: 'monospace' }}>{player.aiMatch}%</div>
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
        <div style={{ display: 'flex', gap: 4, padding: isMobile ? '8px 14px' : '10px 24px', borderBottom: `1px solid ${THEME.colors.borderDim}`, background: THEME.colors.surfaceAlt, flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: isMobile ? '5px 10px' : '6px 14px', borderRadius: THEME.radius.pill, fontSize: isMobile ? '0.72rem' : '0.78rem', fontWeight: 600, cursor: 'pointer',
                background: tab === t ? THEME.colors.surfaceCard : 'transparent',
                border: `1px solid ${tab === t ? THEME.colors.borderMid : 'transparent'}`,
                color: tab === t ? THEME.colors.textMain : THEME.colors.textDark,
                textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'all 0.12s', outline: 'none',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── CENTRAL DATA STORAGE BAY ────────────────────────────────────── */}
        <div ref={bodyRef} className="custom-scroll" style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px' : '24px', background: THEME.colors.bgCanvas }}>

          {/* MAP MODE: PROFILE OVERVIEW */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: isMobile ? 14 : 20, alignItems: 'start' }}>
              
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

// TelField, VideoHUD, Panel, MetricRow are imported from ./modal/