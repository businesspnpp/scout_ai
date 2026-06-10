/**
 * PlayerCard.jsx — Enterprise-grade player profile card.
 */
import { useState } from 'react';
import {
  getPositionGroup, getOverallColor, getScoreTone, initials, POS_COLORS,
} from '../data/mockPlayers.js';

// ── Score color (emerald / gold / muted) ─────────────────────────────────────
function scoreColor(v) {
  if (v >= 85) return '#3ecf70';
  if (v >= 72) return '#d4a850';
  return '#8c909f';
}

// ── Radar chart ───────────────────────────────────────────────────────────────
function RadarChart({ scores, labels, size = 200 }) {
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
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      {[0.25, 0.5, 0.75, 1].map(r => (
        <polygon key={r} points={hex(r * maxR)} fill="none" stroke="#2e3040" strokeWidth={r === 1 ? 1 : 0.6} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const a = ((i * 360) / n - 90) * (Math.PI / 180);
        return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="#2e3040" strokeWidth="0.6" />;
      })}
      <polygon points={polyPts} fill="rgba(62,207,112,0.07)" stroke="#3ecf70" strokeWidth="1.2" strokeLinejoin="round" />
      {scores.map((v, i) => {
        const p = pt(i, v); return <circle key={i} cx={p.x} cy={p.y} r="2.8" fill="#3ecf70" stroke="#17181e" strokeWidth="1.2" />;
      })}
      {labels.map((lbl, i) => {
        const a = ((i * 360) / n - 90) * (Math.PI / 180);
        const r = maxR + 14, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle';
        return <text key={i} x={x} y={y + (y < cy ? -3 : y > cy + 4 ? 11 : 4)} textAnchor={anchor} fontFamily="Inter" fontSize="8.5" fontWeight="500" fill="#8c909f">{lbl}</text>;
      })}
    </svg>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export default function PlayerCard({ player, onOpenLightbox, onSaveToggle, isSaved, animDelay = 0, onClick }) {
  const [expanded, setExpanded] = useState(false);
  const group  = getPositionGroup(player.pos);
  const scores = group.keys.map(k => player.metrics[k] ?? 0);
  const overall = player.overall;
  const oColor  = overall >= 85 ? '#3ecf70' : overall >= 72 ? '#d4a850' : '#8c909f';

  return (
    <div
      className="animate-card-in"
      style={{
        background: '#23252f',
        border: '1px solid #2e3040',
        borderRadius: 10,
        display: 'flex', flexDirection: 'column',
        opacity: 0,
        animationDelay: `${animDelay}s`,
        transition: 'border-color 0.14s',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#3a3f54'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#2e3040'}
    >
      {/* ── Header ─────────────────────────────────── */}
      <div onClick={onClick} style={{ padding: '14px 16px 12px', borderBottom: '1px solid #2e3040' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

          {/* Avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: 4,
            background: '#2a2d38', border: '1px solid #3a3f54',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden', position: 'relative',
          }}>
            <img src={player.headshot} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }} />
            <div style={{
              display: 'none', position: 'absolute', inset: 0,
              alignItems: 'center', justifyContent: 'center',
              fontSize: '0.80rem', fontWeight: 700, color: '#8c909f',
              fontFamily: 'Inter, sans-serif',
            }}>
              {initials(player.name)}
            </div>
          </div>

          {/* Name block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-syne" style={{ fontWeight: 700, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {player.name}
            </div>
            <div style={{ marginTop: 3, fontSize: '0.75rem', color: '#8c909f' }}>
              {player.country} · {player.age} yrs
              <span style={{ color: '#50535f' }}> · {player.club}</span>
            </div>
            {/* Position + region */}
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
                padding: '2px 7px', borderRadius: 2,
                background: '#2a2d38', border: '1px solid #3a3f54',
                color: '#f0f1f3', fontFamily: 'Inter, sans-serif',
              }}>{player.pos}</span>
              <span style={{ fontSize: '0.68rem', color: '#50535f', alignSelf: 'center' }}>{player.region}</span>
            </div>
          </div>

          {/* Score */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="font-syne" style={{ fontWeight: 800, fontSize: '2.1rem', lineHeight: 1, color: oColor, letterSpacing: '-0.02em' }}>
              {overall}
            </div>
            <div style={{ fontSize: '0.62rem', color: '#50535f', letterSpacing: '0.10em', textTransform: 'uppercase', marginTop: 2 }}>
              Overall
            </div>
            <div style={{ marginTop: 4, fontSize: '0.68rem', color: '#8c909f' }}>
              {player.aiMatch}<span style={{ color: '#50535f' }}>% match</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Metrics ─────────────────────────────────── */}
      <div style={{ padding: '10px 16px 12px' }}>
        {/* Radar toggle */}
        <button onClick={() => setExpanded(x => !x)} style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 0 8px', color: '#4a5568',
        }}>
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: '#50535f' }}>Radar</span>
          <span style={{ fontSize: '0.70rem', transition: 'transform 0.16s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
        </button>

        {expanded && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <RadarChart scores={scores} labels={group.labels} size={192} />
          </div>
        )}

        {/* Score bars */}
        {group.keys.map((key, i) => {
          const val = player.metrics[key] ?? 0;
          const reel = player.reels?.[key] ?? player.reels?.highlight ?? null;
          return (
            <button key={key} onClick={() => reel && onOpenLightbox(reel, group.labels[i])}
              title={reel ? `▶ ${group.labels[i]} clip` : group.labels[i]}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', background: 'none', border: 'none',
                padding: '4px 0', cursor: reel ? 'pointer' : 'default',
              }}>
              <span style={{ fontSize: '0.70rem', color: '#8c909f', width: 82, textAlign: 'left', flexShrink: 0 }}>
                {group.labels[i]}
              </span>
              <div style={{ flex: 1, height: 3, background: '#2a2d38', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{ width: `${val}%`, height: '100%', background: scoreColor(val), borderRadius: 1, transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ width: 26, textAlign: 'right', fontSize: '0.72rem', fontWeight: 600, color: scoreColor(val), fontFamily: 'Inter, sans-serif', flexShrink: 0 }}>
                {val}{reel ? <span style={{ opacity: 0.4, fontSize: '0.55rem', marginLeft: 2 }}>▶</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Footer ──────────────────────────────────── */}
      <div style={{
        marginTop: 'auto', padding: '8px 16px',
        borderTop: '1px solid #2e3040', background: '#1d1f27',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        {/* Tags */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {player.tags.slice(0, 2).map(t => (
            <span key={t} style={{
              fontSize: '0.66rem', color: '#50535f',
              border: '1px solid #2e3040', padding: '2px 6px', borderRadius: 5,
            }}>{t}</span>
          ))}
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onOpenLightbox(player.reels.highlight, 'Highlight')} title="Watch highlight"
            style={ActionBtn('#23252f', '#2e3040', '#8c909f')}>▶</button>
          <button onClick={() => onSaveToggle(player.id)} title={isSaved ? 'Unsave' : 'Shortlist'}
            style={ActionBtn(isSaved ? '#1a2520' : '#23252f', isSaved ? '#3ecf70' : '#2e3040', isSaved ? '#3ecf70' : '#8c909f')}>
            {isSaved ? '★' : '☆'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionBtn(bg, border, color) {
  return {
    width: 28, height: 28, borderRadius: 3,
    background: bg, border: `1px solid ${border}`,
    color, cursor: 'pointer', fontSize: '0.70rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'border-color 0.12s, background 0.12s',
  };
}
