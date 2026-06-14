// RadarChart.jsx — immersive interactive parametric vector mesh
import { useState, useEffect } from 'react';
import { THEME, getScoreColor } from './theme.js';

const ACCENT     = '#3ecf70';
const ACCENT_DIM = 'rgba(62,207,112,0.18)';
const GLOW       = 'rgba(62,207,112,0.55)';

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('rc-styles')) {
  const s = document.createElement('style');
  s.id = 'rc-styles';
  s.textContent = `
@keyframes rc-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes rc-ring-breathe {
  0%,100% { opacity: 0.14; }
  50%      { opacity: 0.35; }
}
@keyframes rc-dot-idle {
  0%,100% { r: 3.5; }
  50%      { r: 4.5; }
}
@keyframes rc-outer-glow {
  0%,100% { opacity: 0.14; }
  50%      { opacity: 0.38; }
}
  `;
  document.head.appendChild(s);
}

export default function RadarChart({ scores, labels, size = 250 }) {
  const [hovered, setHovered] = useState(null);
  const [mounted,  setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);
  const cx   = size / 2;
  const cy   = size / 2;
  const maxR = size * 0.36;
  const n    = labels.length;

  const pt = (i, v) => {
    const a = ((i * 360) / n - 90) * (Math.PI / 180);
    const r = (v / 100) * maxR;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const ringPoints = ratio =>
    Array.from({ length: n }, (_, i) => {
      const a = ((i * 360) / n - 90) * (Math.PI / 180);
      return `${cx + ratio * maxR * Math.cos(a)},${cy + ratio * maxR * Math.sin(a)}`;
    }).join(' ');

  const polyPts = scores.map((v, i) => { const p = pt(i, v); return `${p.x},${p.y}`; }).join(' ');

  // tooltip position — keep it inside the SVG
  const tooltip = hovered !== null ? (() => {
    const p    = pt(hovered, scores[hovered]);
    const offX = p.x < cx ? -106 : 10;
    const offY = p.y < cy - 10 ? 2 : -46;
    return { x: p.x + offX, y: p.y + offY };
  })() : null;

  const RINGS = [
    { r: 0.20, dash: undefined, stroke: 'rgba(255,255,255,0.04)', w: 0.4 },
    { r: 0.35, dash: '2 5',     stroke: 'rgba(62,207,112,0.08)',  w: 0.5 },
    { r: 0.50, dash: undefined, stroke: 'rgba(255,255,255,0.05)', w: 0.4 },
    { r: 0.65, dash: '2 5',     stroke: 'rgba(62,207,112,0.09)',  w: 0.5 },
    { r: 0.80, dash: undefined, stroke: 'rgba(255,255,255,0.05)', w: 0.4 },
    { r: 1.00, dash: undefined, stroke: 'rgba(62,207,112,0.25)',  w: 1, breathe: true },
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block', userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        style={{ display: 'block', overflow: 'visible', cursor: 'crosshair' }}
      >
        <defs>
          <radialGradient id="rc-fill-g" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={ACCENT} stopOpacity="0.22" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" />
          </radialGradient>
          <filter id="rc-glow-f" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="rc-dot-f" x="-300%" y="-300%" width="700%" height="700%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <clipPath id="rc-scan-clip">
            <circle cx={cx} cy={cy} r={maxR + 2} />
          </clipPath>
        </defs>

        {/* Background rings */}
        {RINGS.map(({ r, dash, stroke, w, breathe }) => (
          <polygon key={r} points={ringPoints(r)} fill="none"
            stroke={stroke} strokeWidth={w}
            strokeDasharray={dash}
            style={breathe ? { animation: 'rc-ring-breathe 3.5s ease-in-out infinite' } : undefined}
          />
        ))}

        {/* Axis lines */}
        {Array.from({ length: n }, (_, i) => {
          const a  = ((i * 360) / n - 90) * (Math.PI / 180);
          const isH = hovered === i;
          return (
            <line key={i}
              x1={cx} y1={cy}
              x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)}
              stroke={isH ? 'rgba(62,207,112,0.5)' : 'rgba(255,255,255,0.07)'}
              strokeWidth={isH ? 1 : 0.6}
              style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
            />
          );
        })}

        {/* Rotating scan line */}
        <g clipPath="url(#rc-scan-clip)"
           style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'rc-spin 9s linear infinite', opacity: 0.2 }}>
          <line x1={cx} y1={cy} x2={cx} y2={cy - maxR - 2}
            stroke={ACCENT} strokeWidth="1" strokeDasharray="3 4" />
        </g>

        {/* Fill */}
        <polygon points={polyPts} fill="url(#rc-fill-g)"
          style={{ opacity: mounted ? 1 : 0, transition: 'opacity 1s ease' }}
        />

        {/* Stroke — animated draw */}
        <polygon points={polyPts} fill="none"
          stroke={ACCENT} strokeWidth="1.8" strokeLinejoin="round"
          filter="url(#rc-glow-f)"
          strokeDasharray="1400"
          strokeDashoffset={mounted ? 0 : 1400}
          style={{ transition: mounted ? 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' : 'none' }}
        />

        {/* Vertex dots */}
        {scores.map((v, i) => {
          const p   = pt(i, v);
          const isH = hovered === i;
          const col = getScoreColor(v);
          return (
            <g key={i} style={{ cursor: 'pointer' }}
               onMouseEnter={() => setHovered(i)}
               onMouseLeave={() => setHovered(null)}>
              {/* outer pulse ring */}
              <circle cx={p.x} cy={p.y} r={isH ? 12 : 8} fill="none"
                stroke={ACCENT} strokeWidth="1"
                style={{
                  opacity: isH ? 0.45 : 0.14,
                  transition: 'r 0.2s, opacity 0.2s',
                  animation: isH ? undefined : 'rc-outer-glow 2.8s ease-in-out infinite',
                  animationDelay: `${i * 0.5}s`,
                }}
              />
              {/* main dot */}
              <circle cx={p.x} cy={p.y} r={isH ? 5.5 : 3.5}
                fill={isH ? '#ffffff' : col}
                stroke={isH ? ACCENT : '#0d0d0f'} strokeWidth={isH ? 2 : 1.5}
                filter={isH ? 'url(#rc-dot-f)' : undefined}
                style={{
                  transition: 'r 0.18s ease, fill 0.18s ease',
                  animation: isH ? undefined : 'rc-dot-idle 2.5s ease-in-out infinite',
                  animationDelay: `${i * 0.35}s`,
                }}
              />
            </g>
          );
        })}

        {/* Tooltip */}
        {hovered !== null && tooltip && (
          <foreignObject x={tooltip.x} y={tooltip.y} width="96" height="46"
            style={{ overflow: 'visible', pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(8,8,10,0.96)',
              border: `1px solid ${ACCENT}`,
              borderRadius: 5,
              padding: '5px 9px',
              boxShadow: `0 0 16px ${GLOW}, inset 0 0 8px rgba(62,207,112,0.04)`,
              display: 'flex', flexDirection: 'column', gap: 2,
              pointerEvents: 'none',
            }}>
              <span style={{ color: '#5a5f72', letterSpacing: '0.09em', textTransform: 'uppercase', fontSize: '0.56rem', fontWeight: 800, fontFamily: 'Inter, sans-serif' }}>
                {labels[hovered]}
              </span>
              <span style={{ color: getScoreColor(scores[hovered]), fontFamily: '"JetBrains Mono", monospace', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, letterSpacing: '-0.02em' }}>
                {scores[hovered]}
              </span>
            </div>
          </foreignObject>
        )}

        {/* Axis labels */}
        {labels.map((lbl, i) => {
          const a   = ((i * 360) / n - 90) * (Math.PI / 180);
          const r   = maxR + 18;
          const x   = cx + r * Math.cos(a);
          const y   = cy + r * Math.sin(a);
          const anc = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle';
          const isH = hovered === i;
          return (
            <text key={i} x={x} y={y + (y < cy ? -3 : y > cy + 4 ? 11 : 4)}
              textAnchor={anc} fontFamily="Inter, sans-serif"
              fontSize={isH ? '9' : '8'} fontWeight={isH ? '700' : '600'}
              fill={isH ? ACCENT : THEME.colors.textMuted}
              style={{ transition: 'fill 0.2s' }}>
              {lbl.toUpperCase()}
            </text>
          );
        })}

        {/* Centre crosshair */}
        <circle cx={cx} cy={cy} r="3"   fill="rgba(62,207,112,0.15)" />
        <circle cx={cx} cy={cy} r="1.3" fill={ACCENT} />
      </svg>
    </div>
  );
}
