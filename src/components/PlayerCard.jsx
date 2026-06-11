import { useState } from 'react';
import {
  getPositionGroup, getOverallColor, getScoreTone, initials, POS_COLORS,
} from '../data/mockPlayers.js';

// theme tokens
const THEME = {
  colors: {
    bgCanvas: '#0d0d0f',
    surfaceCard: '#141416',
    surfaceHover: '#1a1a1d',
    surfaceAlt: '#0a0a0c',
    borderDim: '#1e1e21',
    borderMid: '#2a2a2d',
    borderActive: '#3ecf70',

    // accents
    accentHigh: '#3ecf70',    // green
    accentMid: '#d4a850',     // amber
    accentLow: '#e05353',     // red

    // text
    textMain: '#f0f1f3',
    textMuted: '#8c909f',
    textDark: '#4e515f'
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

// Radar chart
function RadarChart({ scores, labels, size = 200 }) {
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
      {/* rings */}
      {[0.25, 0.5, 0.75, 1].map(r => (
        <polygon key={r} points={getHexPoints(r)} fill="none" stroke={THEME.colors.borderDim} strokeWidth={r === 1 ? 1 : 0.6} />
      ))}
      {/* axis lines */}
      {Array.from({ length: n }, (_, i) => {
        const a = ((i * 360) / n - 90) * (Math.PI / 180);
        return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke={THEME.colors.borderDim} strokeWidth="0.6" />;
      })}
      {/* filled polygon */}
      <polygon points={polyPts} fill="rgba(62,207,112,0.05)" stroke={THEME.colors.accentHigh} strokeWidth="1.2" strokeLinejoin="round" />
      {/* dots at each vertex */}
      {scores.map((v, i) => {
        const p = pt(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r="2.8" fill={THEME.colors.accentHigh} stroke={THEME.colors.surfaceCard} strokeWidth="1.2" />;
      })}
      {/* labels */}
      {labels.map((lbl, i) => {
        const a = ((i * 360) / n - 90) * (Math.PI / 180);
        const r = maxR + 14, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle';
        return <text key={i} x={x} y={y + (y < cy ? -3 : y > cy + 4 ? 11 : 4)} textAnchor={anchor} fontFamily="Inter, sans-serif" fontSize="8.5" fontWeight="500" fill={THEME.colors.textMuted}>{lbl.toUpperCase()}</text>;
      })}
    </svg>
  );
}

// PlayerCard
export default function PlayerCard({ player, onOpenLightbox, onSaveToggle, isSaved, animDelay = 0, onClick }) {
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const group  = getPositionGroup(player.pos);
  const scores = group.keys.map(k => player.metrics[k] ?? 0);
  const overall = player.overall;
  const oColor  = getScoreColor(overall);

  const currentBorderColor = isHovered ? THEME.colors.borderMid : THEME.colors.borderDim;
  const activeGlowShadow = isHovered ? '0 8px 24px rgba(0, 0, 0, 0.5)' : 'none';

  return (
    <div
      className="animate-card-in"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: THEME.colors.surfaceCard,
        border: `1px solid ${currentBorderColor}`,
        borderRadius: THEME.radius.card,
        display: 'flex', flexDirection: 'column',
        opacity: 0,
        animationDelay: `${animDelay}s`,
        boxShadow: activeGlowShadow,
        transition: 'border-color 0.14s ease, box-shadow 0.14s ease, background-color 0.14s ease',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden'
      }}
    >
      {/* header */}
      <div onClick={onClick} style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${THEME.colors.borderDim}`, background: 'rgba(255, 255, 255, 0.005)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

          {/* avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: THEME.radius.element,
            background: THEME.colors.surfaceAlt, border: `1px solid ${THEME.colors.borderDim}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden', position: 'relative',
          }}>
            <img src={player.headshot} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
            <div style={{
              display: 'none', position: 'absolute', inset: 0,
              alignItems: 'center', justifyContent: 'center',
              fontSize: '0.80rem', fontWeight: 700, color: THEME.colors.textMuted,
              fontFamily: 'Inter, sans-serif',
            }}>
              {initials(player.name)}
            </div>
          </div>

          {/* player info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-syne" style={{ fontWeight: 700, fontSize: '0.94rem', color: THEME.colors.textMain, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {player.name}
            </div>
            <div style={{ marginTop: 2, fontSize: '0.75rem', color: THEME.colors.textMuted }}>
              {player.country} · {player.age} yrs
              <span style={{ color: THEME.colors.textDark }}> · {player.club}</span>
            </div>
            {/* position + region badges */}
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
                padding: '2px 6px', borderRadius: THEME.radius.pill,
                background: THEME.colors.surfaceAlt, border: `1px solid ${THEME.colors.borderMid}`,
                color: THEME.colors.textMain, fontFamily: 'Inter, sans-serif',
              }}>{player.pos}</span>
              <span style={{ fontSize: '0.70rem', color: THEME.colors.textDark, fontWeight: 500 }}>{player.region}</span>
            </div>
          </div>

          {/* overall score */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="font-syne" style={{ fontWeight: 800, fontSize: '2.1rem', lineHeight: 1, color: oColor, letterSpacing: '-0.02em' }}>
              {overall}
            </div>
            <div style={{ fontSize: '0.60rem', color: THEME.colors.textDark, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>
              Overall
            </div>
            <div style={{ marginTop: 3, fontSize: '0.68rem', color: THEME.colors.textMuted, fontFamily: 'monospace' }}>
              {player.aiMatch}<span style={{ color: THEME.colors.textDark }}>% match</span>
            </div>
          </div>

        </div>
      </div>

      {/* stats section */}
      <div style={{ padding: '10px 16px 12px' }}>
        {/* radar toggle */}
        <button onClick={() => setExpanded(x => !x)} style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifycontent: 'space-between',
          padding: '0 0 8px', color: THEME.colors.textDark, outline: 'none', justifystyle: 'space-between'
        }}>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: THEME.colors.textDark, fontWeight: 700, flexGrow: 1, textAlign: 'left' }}>
            Tactical Vector Mesh
          </span>
          <span style={{ fontSize: '0.70rem', color: THEME.colors.textMuted, transition: 'transform 0.16s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>

        {expanded && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, marginTop: 4 }}>
            <RadarChart scores={scores} labels={group.labels} size={180} />
          </div>
        )}

        {/* metric bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {group.keys.map((key, i) => {
            const val = player.metrics[key] ?? 0;
            const reel = player.reels?.[key] ?? player.reels?.highlight ?? null;
            const currentScoreColor = getScoreColor(val);
            
            return (
              <button key={key} onClick={() => reel && onOpenLightbox(reel, group.labels[i])}
                title={reel ? `▶ View Verified ${group.labels[i]} Capture Reel` : group.labels[i]}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', background: 'none', border: 'none',
                  padding: '4px 0', cursor: reel ? 'pointer' : 'default', outline: 'none'
                }}
              >
                <span style={{ fontSize: '0.70rem', color: THEME.colors.textMuted, width: 82, textAlign: 'left', flexShrink: 0 }}>
                  {group.labels[i]}
                </span>
                
                {/* bar */}
                <div style={{ flex: 1, height: 3, background: THEME.colors.surfaceAlt, borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{ width: `${val}%`, height: '100%', background: currentScoreColor, borderRadius: 1, transition: 'width 0.4s cubic-bezier(0.1, 1, 0.1, 1)' }} />
                </div>
                
                <span style={{ width: 28, textAlign: 'right', fontSize: '0.72rem', fontWeight: 600, color: currentScoreColor, fontFamily: 'monospace', flexShrink: 0 }}>
                  {val}{reel ? <span style={{ opacity: 0.4, fontSize: '0.55rem', marginLeft: 2 }}>▶</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* footer */}
      <div style={{
        marginTop: 'auto', padding: '8px 16px',
        borderTop: `1px solid ${THEME.colors.borderDim}`, background: THEME.colors.surfaceAlt,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        {/* tags */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {player.tags.slice(0, 2).map(t => (
            <span key={t} style={{
              fontSize: '0.65rem', color: THEME.colors.textMuted, fontWeight: 500,
              border: `1px solid ${THEME.colors.borderDim}`, padding: '2px 6px', borderRadius: 4,
              background: THEME.colors.surfaceCard, textTransform: 'uppercase', letterSpacing: '0.02em'
            }}>
              #{t}
            </span>
          ))}
        </div>
        
        {/* action buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onOpenLightbox(player.reels.highlight, 'Highlight')} title="Stream Master Highlight File"
            style={actionBtnStyles(THEME.colors.surfaceCard, THEME.colors.borderDim, THEME.colors.textMain)}>▶</button>
          <button onClick={() => onSaveToggle(player.id)} title={isSaved ? 'Release Candidate' : 'Shortlist Pipeline'}
            style={actionBtnStyles(isSaved ? 'rgba(62,207,112,0.06)' : THEME.colors.surfaceCard, isSaved ? THEME.colors.accentHigh : THEME.colors.borderDim, isSaved ? THEME.colors.accentHigh : THEME.colors.textMuted)}>
            {isSaved ? '★' : '☆'}
          </button>
        </div>
      </div>
    </div>
  );
}

// helpers
function actionBtnStyles(bg, border, color) {
  return {
    width: 28, height: 28, borderRadius: THEME.radius.element,
    background: bg, border: `1px solid ${border}`,
    color, cursor: 'pointer', fontSize: '0.70rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    outline: 'none', transition: 'border-color 0.12s ease, background 0.12s ease',
  };
}