// RadarChart.jsx — hexagonal radar chart for player metrics
import { THEME } from './theme.js';

export default function RadarChart({ scores, labels, size = 240 }) {
  const cx   = size / 2;
  const cy   = size / 2;
  const maxR = size * 0.36;
  const n    = labels.length;

  const pt = (i, v) => {
    const a = ((i * 360) / n - 90) * (Math.PI / 180);
    const r = (v / 100) * maxR;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const getHexPoints = (radiusRatio) =>
    Array.from({ length: n }, (_, i) => {
      const a = ((i * 360) / n - 90) * (Math.PI / 180);
      const r = radiusRatio * maxR;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');

  const polyPts = scores.map((v, i) => { const p = pt(i, v); return `${p.x},${p.y}`; }).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}
      style={{ display: 'block', overflow: 'visible' }} aria-hidden>

      {/* Concentric grid rings */}
      {[0.25, 0.5, 0.75, 1].map(r => (
        <polygon key={r} points={getHexPoints(r)} fill="none"
          stroke={THEME.colors.borderDim} strokeWidth={r === 1 ? 1 : 0.6} />
      ))}

      {/* Axis lines */}
      {Array.from({ length: n }, (_, i) => {
        const a = ((i * 360) / n - 90) * (Math.PI / 180);
        return <line key={i} x1={cx} y1={cy}
          x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)}
          stroke={THEME.colors.borderDim} strokeWidth="0.6" />;
      })}

      {/* Performance polygon */}
      <polygon points={polyPts} fill="rgba(184,135,74,0.10)"
        stroke={THEME.colors.accentHigh} strokeWidth="1.5" strokeLinejoin="round" />

      {/* Vertex dots */}
      {scores.map((v, i) => {
        const p = pt(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r="3"
          fill={THEME.colors.accentHigh} stroke={THEME.colors.surfaceCard} strokeWidth="1.5" />;
      })}

      {/* Axis labels */}
      {labels.map((lbl, i) => {
        const a = ((i * 360) / n - 90) * (Math.PI / 180);
        const r = maxR + 16;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle';
        return (
          <text key={i} x={x} y={y + (y < cy ? -3 : y > cy + 4 ? 11 : 4)}
            textAnchor={anchor} fontFamily="Inter, sans-serif"
            fontSize="8.5" fontWeight="600" fill={THEME.colors.textMuted}>
            {lbl.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}
