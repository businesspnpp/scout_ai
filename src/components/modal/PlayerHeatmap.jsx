/**
 * PlayerHeatmap.jsx
 * Fetches spatial tracking coordinates from `player_coordinates` Supabase table
 * and renders a football pitch heatmap overlay using Canvas + SVG.
 *
 * Table schema:
 *   player_id   uuid     – matches player_profiles.id
 *   video_id    text     – storage reference string
 *   match_name  text     – display name for the fixture
 *   x_pos       numeric  – 0.00–100.00 % of pitch width (left goal = 0)
 *   y_pos       numeric  – 0.00–100.00 % of pitch height (top touchline = 0)
 *   event_type  text     – movement | shot | pass | tackle | dribble
 *   video_timestamp numeric – second offset inside the video file
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../../services/supabaseClient.js';
import { THEME } from './theme.js';

const COORDS_TABLE = 'player_coordinates';

// Pitch aspect ratio (FIFA standard: 105m × 68m)
const PITCH_ASPECT = 68 / 105; // ≈ 0.6476

// Event colour palette
const EVENT_COLORS = {
  movement: { r: 62,  g: 207, b: 112 },  // green
  shot:     { r: 248, g: 113, b: 113 },  // red/coral
  pass:     { r: 96,  g: 165, b: 250 },  // blue
  tackle:   { r: 251, g: 191, b: 36  },  // amber
  dribble:  { r: 192, g: 132, b: 252 },  // purple
};

function colFor(eventType) {
  return EVENT_COLORS[eventType] ?? EVENT_COLORS.movement;
}

// Pre-computed arc intersections (left/right penalty arcs)
// Penalty spot at x=11, penalty area edge at x=16.5 → dy = √(9.15²−5.5²) ≈ 7.31
const ARC_DY = Math.sqrt(9.15 * 9.15 - 5.5 * 5.5); // 7.313

const LINE     = 'rgba(255,255,255,0.45)';
const LINE_DIM = 'rgba(255,255,255,0.25)';

function PitchSVG() {
  return (
    <svg
      viewBox="0 0 105 68"
      preserveAspectRatio="none"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
    >
      {/* Pitch surface */}
      <rect x={0} y={0} width={105} height={68} fill="#071120" />

      {/* Subtle stripe effect */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect
          key={i} x={i * 10.5} y={0} width={10.5} height={68}
          fill={i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'}
        />
      ))}

      {/* Outer touchlines */}
      <rect x={0} y={0} width={105} height={68} fill="none" stroke={LINE} strokeWidth={0.6} />

      {/* Halfway line */}
      <line x1={52.5} y1={0} x2={52.5} y2={68} stroke={LINE} strokeWidth={0.5} />

      {/* Centre circle */}
      <circle cx={52.5} cy={34} r={9.15} fill="none" stroke={LINE} strokeWidth={0.5} />
      <circle cx={52.5} cy={34} r={0.5} fill={LINE} />

      {/* Left penalty area */}
      <rect x={0} y={13.84} width={16.5} height={40.32} fill="none" stroke={LINE} strokeWidth={0.5} />
      {/* Right penalty area */}
      <rect x={88.5} y={13.84} width={16.5} height={40.32} fill="none" stroke={LINE} strokeWidth={0.5} />

      {/* Left 6-yard box */}
      <rect x={0} y={24.84} width={5.5} height={18.32} fill="none" stroke={LINE_DIM} strokeWidth={0.4} />
      {/* Right 6-yard box */}
      <rect x={99.5} y={24.84} width={5.5} height={18.32} fill="none" stroke={LINE_DIM} strokeWidth={0.4} />

      {/* Penalty spots */}
      <circle cx={11}  cy={34} r={0.5} fill={LINE} />
      <circle cx={94}  cy={34} r={0.5} fill={LINE} />

      {/* Left penalty arc (arc outside the penalty area) */}
      <path
        d={`M 16.5 ${(34 - ARC_DY).toFixed(3)} A 9.15 9.15 0 0 1 16.5 ${(34 + ARC_DY).toFixed(3)}`}
        fill="none" stroke={LINE_DIM} strokeWidth={0.4}
      />
      {/* Right penalty arc */}
      <path
        d={`M 88.5 ${(34 - ARC_DY).toFixed(3)} A 9.15 9.15 0 0 0 88.5 ${(34 + ARC_DY).toFixed(3)}`}
        fill="none" stroke={LINE_DIM} strokeWidth={0.4}
      />

      {/* Corner arcs (r = 1m) */}
      <path d="M 0 1 A 1 1 0 0 1 1 0"     fill="none" stroke={LINE_DIM} strokeWidth={0.4} />
      <path d="M 104 0 A 1 1 0 0 1 105 1"  fill="none" stroke={LINE_DIM} strokeWidth={0.4} />
      <path d="M 105 67 A 1 1 0 0 1 104 68" fill="none" stroke={LINE_DIM} strokeWidth={0.4} />
      <path d="M 1 68 A 1 1 0 0 1 0 67"    fill="none" stroke={LINE_DIM} strokeWidth={0.4} />

      {/* Goals (extend slightly outside boundary) */}
      <rect x={-2.2} y={30.34} width={2.2} height={7.32} fill="none" stroke={LINE} strokeWidth={0.5} />
      <rect x={105}  y={30.34} width={2.2} height={7.32} fill="none" stroke={LINE} strokeWidth={0.5} />
    </svg>
  );
}

const SEL_STYLE = {
  background: '#0a1220',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 6,
  color: 'rgba(255,255,255,0.70)',
  fontSize: '0.74rem',
  padding: '5px 10px',
  cursor: 'pointer',
  outline: 'none',
  appearance: 'none',
  WebkitAppearance: 'none',
};

export default function PlayerHeatmap({ playerId }) {
  const [points, setPoints]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const [matches, setMatches]             = useState([]);
  const [selectedMatch, setSelectedMatch] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState('all');
  const canvasRef  = useRef(null);
  const wrapperRef = useRef(null);

  // ── Fetch coordinates ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseEnabled || !playerId) { setPoints([]); return; }
    setLoading(true);
    supabase
      .from(COORDS_TABLE)
      .select('x_pos, y_pos, event_type, match_name')
      .eq('player_id', playerId)
      .then(({ data, error }) => {
        if (error) {
          console.error('[PlayerHeatmap] fetch error:', error.message);
          setPoints([]);
        } else {
          const rows = data ?? [];
          setPoints(rows);
          setMatches([...new Set(rows.map(p => p.match_name).filter(Boolean))]);
        }
        setLoading(false);
      });
  }, [playerId]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = points.filter(p =>
    (selectedMatch === 'all' || p.match_name === selectedMatch) &&
    (selectedEvent === 'all' || p.event_type === selectedEvent)
  );

  // ── Draw heatmap onto canvas ───────────────────────────────────────────────
  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width;
    const ch = canvas.height;
    if (!cw || !ch) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cw, ch);
    if (filtered.length === 0) return;

    const radius = Math.max(cw, ch) * 0.065;

    // Heat blobs
    filtered.forEach(pt => {
      const px = (parseFloat(pt.x_pos) / 100) * cw;
      const py = (parseFloat(pt.y_pos) / 100) * ch;
      const c  = colFor(pt.event_type);
      const g  = ctx.createRadialGradient(px, py, 0, px, py, radius);
      g.addColorStop(0,    `rgba(${c.r},${c.g},${c.b},0.22)`);
      g.addColorStop(0.45, `rgba(${c.r},${c.g},${c.b},0.08)`);
      g.addColorStop(1,    `rgba(${c.r},${c.g},${c.b},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Dots on top
    filtered.forEach(pt => {
      const px = (parseFloat(pt.x_pos) / 100) * cw;
      const py = (parseFloat(pt.y_pos) / 100) * ch;
      const c  = colFor(pt.event_type);
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.80)`;
      ctx.beginPath();
      ctx.arc(px, py, 2.0, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [filtered]);

  // ── Sync canvas pixel dimensions to container + redraw ────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const sync = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Use offsetWidth/offsetHeight for reliable integer pixel dimensions
      const w = wrapper.offsetWidth  || Math.round(wrapper.getBoundingClientRect().width);
      const h = wrapper.offsetHeight || Math.round(wrapper.getBoundingClientRect().height);
      if (!w || !h) return; // container not laid out yet
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
      }
      drawHeatmap();
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [drawHeatmap]);

  const uniqueEvents = [...new Set(points.map(p => p.event_type).filter(Boolean))];
  const hasData      = !loading && filtered.length > 0;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)} style={SEL_STYLE}>
          <option value="all">All Matches</option>
          {matches.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} style={SEL_STYLE}>
          <option value="all">All Actions</option>
          {uniqueEvents.map(ev => (
            <option key={ev} value={ev}>{ev.charAt(0).toUpperCase() + ev.slice(1)}</option>
          ))}
        </select>

        <span style={{ marginLeft: 'auto', fontSize: '0.70rem', color: THEME.colors.textDark, fontFamily: 'monospace' }}>
          {loading ? 'Loading…' : `${filtered.length.toLocaleString()} tracking point${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* ── Pitch + heatmap canvas ───────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '105 / 68',
          minHeight: 180,
          border: `1px solid rgba(255,255,255,0.12)`,
          borderRadius: 10,
          overflow: 'hidden',
          background: '#071120',
        }}
      >
        {/* SVG pitch markings */}
        <PitchSVG />

        {/* Canvas heatmap — fills same bounds as SVG */}
        <div ref={wrapperRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
        </div>

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 10, pointerEvents: 'none',
          }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" opacity="0.5">
              <circle cx="18" cy="18" r="16" stroke="white" strokeWidth="1.4" />
              <circle cx="18" cy="18" r="6"  stroke="white" strokeWidth="1.4" />
              <line x1="18" y1="2"  x2="18" y2="34" stroke="white" strokeWidth="1" />
              <line x1="2"  y1="18" x2="34" y2="18" stroke="white" strokeWidth="1" />
            </svg>
            <span style={{
              fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)',
              textAlign: 'center', maxWidth: 240, lineHeight: 1.5,
            }}>
              No tracking data for this player yet.{' '}
              <br />Ingest match video through the backend pipeline to populate.
            </span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(6,14,24,0.7)',
          }}>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.30)' }}>
              Fetching tracking data…
            </span>
          </div>
        )}

        {/* Live point count badge (only when data exists) */}
        {hasData && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(6,14,24,0.82)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
            padding: '3px 8px', fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.40)', fontFamily: 'monospace',
          }}>
            {filtered.length} pts
          </div>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.entries(EVENT_COLORS).map(([type, col]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: `rgb(${col.r},${col.g},${col.b})`,
              boxShadow: `0 0 5px rgba(${col.r},${col.g},${col.b},0.5)`,
            }} />
            <span style={{
              fontSize: '0.67rem', color: 'rgba(255,255,255,0.32)',
              textTransform: 'capitalize', letterSpacing: '0.04em',
            }}>
              {type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
