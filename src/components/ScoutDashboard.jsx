/**
 * ScoutDashboard.jsx — Redesigned layout
 * Left nav sidebar · Scrollable main (hero + cards + trending) · Right player panel
 */
import { useState, useMemo, useCallback } from 'react';
import { mockPlayers, getPositionGroup, POS_COLORS } from '../data/mockPlayers.js';
import PlayerModal from './PlayerModal.jsx';
import useBreakpoint from '../hooks/useBreakpoint.js';

// ── COLOUR TOKENS ──────────────────────────────────────────────────────────────
const C = {
  bg:     '#0b0b0d',
  card:   '#131315',
  border: 'rgba(255,255,255,0.07)',
  brdHi:  'rgba(255,255,255,0.14)',
  green:  '#4ade80',
  gnDim:  'rgba(74,222,128,0.08)',
  gnBdr:  'rgba(74,222,128,0.22)',
  txt:    '#f1f5f9',
  txtMd:  '#94a3b8',
  txtDim: '#475569',
};

function posColor(pos) { return POS_COLORS[pos] ?? '#94a3b8'; }

function scoreCol(v) {
  if (v >= 85) return '#4ade80';
  if (v >= 72) return '#fbbf24';
  return '#94a3b8';
}

// ── BUILD LOCAL PLAYER ────────────────────────────────────────────────────────
function buildLocalPlayer(meta, urls = {}) {
  const pos     = meta.position ?? 'ST';
  const rawMet  = meta.analysis?.metrics ?? {};
  const group   = getPositionGroup(pos);
  const metrics = Object.keys(rawMet).length > 0
    ? rawMet
    : Object.fromEntries(group.keys.map(k => [k, 70]));
  const videoUrl = urls.videoUrl ?? meta.videoUrl ?? '';
  const clipsByMetric = {};
  (urls.clipUrls ?? []).forEach(c => { if (c.metric && c.url) clipsByMetric[c.metric] = c.url; });
  return {
    id: meta.id, slug: meta.id,
    name: meta.name || 'Unknown Player',
    age: parseInt(meta.age) || 19, pos,
    country: meta.region?.split(',').pop()?.trim() || 'Africa',
    flag: '', region: meta.region || 'Africa',
    club: `Uploaded ${new Date(meta.createdAt).toLocaleDateString()}`,
    height: '-', foot: '-',
    overall: meta.analysis?.overallScore ?? 80,
    aiMatch: meta.analysis?.aiMatchConfidence ?? 85,
    metrics,
    bio: meta.analysis?.scoutNotes ?? 'Locally cached profile.',
    tags: ['uploaded', ...(meta.analysis?.developmentAreas?.slice(0, 2) ?? [])],
    reels: {
      highlight: videoUrl,
      ...Object.fromEntries(group.keys.map(k => [k, clipsByMetric[k] || videoUrl])),
    },
    headshot: urls.headshotUrl || '',
    clipUrls: urls.clipUrls ?? [],
    videos:   urls.videos   ?? [],
    analysis: meta.analysis ?? null,
    _local: true,
  };
}

// ── BUILD INJECTED (just-analyzed) PLAYER ──────────────────────────────────────
function buildInjectedPlayer(result) {
  const pos   = result.player?.position ?? 'ST';
  const group = getPositionGroup(pos);
  const normalize = raw => {
    if (!raw) return raw;
    const clean = raw.toLowerCase().replace(/[\s_-]/g, '');
    return group.keys.find(k => k.toLowerCase() === clean)
      ?? group.keys.find(k => clean.includes(k.toLowerCase()) || k.toLowerCase().includes(clean))
      ?? raw;
  };
  const clipUrls = (result._clips ?? []).map(c => ({
    metric: normalize(c.metric), url: c.url,
    start: c.start, end: c.end, description: c.description ?? '',
  }));
  const clipsByMetric = {};
  clipUrls.forEach(c => { if (c.metric && c.url) clipsByMetric[c.metric] = c.url; });
  return {
    id: 999, slug: 'analyzed-player',
    name: result.player?.name ?? 'Analyzed Player',
    age: parseInt(result.player?.age) || 19, pos,
    country: result.player?.region?.split(',').pop()?.trim() ?? 'Africa',
    flag: '', region: result.player?.region ?? 'Africa',
    club: 'Submitted via Scout AI', height: '-', foot: '-',
    overall: result.overallScore ?? 80,
    aiMatch: result.aiMatchConfidence ?? 88,
    metrics: result.metrics ?? {},
    bio: result.scoutNotes ?? 'Freshly analyzed player.',
    tags: result.developmentAreas?.slice(0, 3) ?? ['new'],
    reels: { highlight: clipUrls[0]?.url ?? '', ...clipsByMetric },
    headshot: '', clipUrls, _injected: true,
  };
}

// ── MINI RADAR ────────────────────────────────────────────────────────────────
function MiniRadar({ scores, labels, size = 180 }) {
  const cx = size / 2, cy = size / 2, maxR = size * 0.36, n = labels.length;
  const pt = (i, v) => {
    const a = ((i * 360) / n - 90) * (Math.PI / 180);
    return { x: cx + (v / 100) * maxR * Math.cos(a), y: cy + (v / 100) * maxR * Math.sin(a) };
  };
  const hexPts = r => Array.from({ length: n }, (_, i) => {
    const a = ((i * 360) / n - 90) * (Math.PI / 180);
    return `${cx + r * maxR * Math.cos(a)},${cy + r * maxR * Math.sin(a)}`;
  }).join(' ');
  const polyPts = scores.map((v, i) => { const p = pt(i, v); return `${p.x},${p.y}`; }).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
      {[0.25, 0.5, 0.75, 1].map(r => (
        <polygon key={r} points={hexPts(r)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={0.8} />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const a = ((i * 360) / n - 90) * (Math.PI / 180);
        return <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" />;
      })}
      <polygon points={polyPts} fill="rgba(74,222,128,0.06)" stroke="#4ade80" strokeWidth="1.2" strokeLinejoin="round" />
      {scores.map((v, i) => {
        const p = pt(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#4ade80" stroke="#131315" strokeWidth="1" />;
      })}
      {labels.map((lbl, i) => {
        const a = ((i * 360) / n - 90) * (Math.PI / 180);
        const r = maxR + 14, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        return (
          <text key={i} x={x} y={y + (y < cy - 2 ? -2 : y > cy + 4 ? 10 : 4)}
            textAnchor={x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle'}
            fontFamily="Inter, sans-serif" fontSize="8" fontWeight="500" fill="#64748b">
            {lbl.slice(0, 6).toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

// ── COMPACT PLAYER CARD ───────────────────────────────────────────────────────
// ── LOCAL STORAGE HOOK ──────────────────────────────────────────────────────
function useLocalStorage(key, init) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; }
    catch { return init; }
  });
  const set = useCallback(fn => {
    setVal(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  return [val, set];
}

function CompactCard({ player, onClick, isSaved, onSaveToggle, tall = true, isWatched, onWatchToggle, viewCount }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative',
        height: tall ? 300 : 220,
        borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        border: `1px solid ${hov ? C.brdHi : C.border}`,
        background: '#0e0e10',
        transition: 'border-color 0.15s, transform 0.15s',
        transform: hov ? 'translateY(-3px)' : 'none',
        flexShrink: 0,
      }}
    >
      {/* Full-bleed image */}
      {player.headshot ? (
        <img
          src={player.headshot} alt={player.name}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
          loading="lazy"
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #1a1a1e 0%, #131315 50%, #0d0d0f 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: tall ? '3.5rem' : '2.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.06)', fontFamily: 'syne, sans-serif', letterSpacing: '-0.04em' }}>
            {player.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
        </div>
      )}

      {/* Dark gradient — bottom third only */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, #060607 0%, rgba(6,6,8,0.98) 16%, rgba(8,8,10,0.85) 30%, rgba(10,10,13,0.45) 48%, rgba(10,10,13,0.08) 62%, transparent 72%)',
      }} />

      {/* Score badge — top right */}
      <div style={{
        position: 'absolute', top: 10, right: 10,
        background: 'rgba(5,11,20,0.82)', backdropFilter: 'blur(8px)',
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 8, padding: '3px 8px',
        fontSize: '0.88rem', fontWeight: 800, color: scoreCol(player.overall), fontFamily: 'monospace',
        zIndex: 2,
      }}>
        {player.overall}
      </div>

      {/* Save button — top left */}
      {onSaveToggle && (
        <button
          onClick={e => { e.stopPropagation(); onSaveToggle(player.id); }}
          style={{
            position: 'absolute', top: 8, left: 8, zIndex: 2,
            background: 'rgba(5,11,20,0.70)', backdropFilter: 'blur(6px)',
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 7, padding: '3px 7px',
            color: isSaved ? C.green : 'rgba(255,255,255,0.45)',
            cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          {isSaved ? '★' : '☆'}
        </button>
      )}

      {/* Watchlist button */}
      {onWatchToggle && (
        <button
          onClick={e => { e.stopPropagation(); onWatchToggle(); }}
          style={{
            position: 'absolute', top: 8, left: onSaveToggle ? 44 : 8, zIndex: 2,
            background: 'rgba(5,11,20,0.70)', backdropFilter: 'blur(6px)',
            border: `1px solid ${isWatched ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 7, padding: '4px 8px',
            color: isWatched ? '#60a5fa' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4Z" stroke="currentColor" strokeWidth="1.2"/><circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" fill={isWatched ? 'currentColor' : 'none'}/></svg>
        </button>
      )}

      {viewCount > 0 && (
        <div style={{ position: 'absolute', top: 36, right: 10, zIndex: 2, background: 'rgba(5,11,20,0.82)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '2px 6px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>
          {viewCount}×
        </div>
      )}

      {/* Text overlay — bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 14px 14px', zIndex: 2 }}>
        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f1f5f9', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
          {player.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: posColor(player.pos), background: 'rgba(5,11,20,0.6)', borderRadius: 4, padding: '1px 6px' }}>
            {player.pos}
          </span>
          <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.55)' }}>{player.age} · {player.country}</span>
        </div>
      </div>
    </div>
  );
}

// ── FILTERS SHEET ─────────────────────────────────────────────────────────────
const POS_GROUPS_LIST = [
  { label: 'Attackers',   positions: ['ST', 'CAM'] },
  { label: 'Wingers',     positions: ['RW', 'LW'] },
  { label: 'Midfielders', positions: ['CM', 'CDM'] },
  { label: 'Defenders',   positions: ['CB', 'RB', 'LB'] },
  { label: 'Goalkeeper',  positions: ['GK'] },
];
const fLabel = {
  display: 'block', fontSize: '0.70rem', color: C.txtDim, fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, marginTop: 14,
};
const fInput = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
  borderRadius: 8, padding: '9px 12px', color: C.txt, outline: 'none',
  fontSize: '0.85rem', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
};

function FiltersSheet({ open, onClose, state, handlers, regions }) {
  const { search, posFilter, regionFilter, ageMax, scoreMin, sortBy, savedOnly } = state;
  const { setSearch, togglePos, setRegionFilter, setAgeMax, setScoreMin, setSortBy, setSavedOnly, clearFilters } = handlers;
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'relative', zIndex: 1, background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: '24px 28px', width: '90vw', maxWidth: 480, maxHeight: '82vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: C.txt }}>Filters</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.txtMd, cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>x</button>
        </div>
        <label style={fLabel}>Search</label>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, country, club..." style={fInput} />
        <label style={fLabel}>Positions</label>
        {POS_GROUPS_LIST.map(grp => (
          <div key={grp.label} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '0.68rem', color: C.txtDim, marginBottom: 6 }}>{grp.label}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {grp.positions.map(pos => (
                <button key={pos} onClick={() => togglePos(pos)} style={{
                  padding: '3px 9px', borderRadius: 4, fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer',
                  background: posFilter.has(pos) ? C.gnDim : 'transparent',
                  border: `1px solid ${posFilter.has(pos) ? C.gnBdr : C.border}`,
                  color: posFilter.has(pos) ? C.green : C.txtMd,
                }}>
                  {pos}
                </button>
              ))}
            </div>
          </div>
        ))}
        <label style={fLabel}>Region</label>
        <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} style={{ ...fInput, cursor: 'pointer' }}>
          <option value="">All Regions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
          <div>
            <label style={fLabel}>Max Age: {ageMax}</label>
            <input type="range" min={16} max={30} value={ageMax} onChange={e => setAgeMax(Number(e.target.value))} style={{ width: '100%', accentColor: C.green }} />
          </div>
          <div>
            <label style={fLabel}>Min Score: {scoreMin}</label>
            <input type="range" min={0} max={95} step={5} value={scoreMin} onChange={e => setScoreMin(Number(e.target.value))} style={{ width: '100%', accentColor: C.green }} />
          </div>
        </div>
        <label style={fLabel}>Sort By</label>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...fInput, cursor: 'pointer' }}>
          <option value="overall">Top Score</option>
          <option value="aiMatch">AI Fit</option>
          <option value="age">Youngest</option>
          <option value="name">A-Z</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, cursor: 'pointer', fontSize: '0.85rem', color: C.txtMd }}>
          <input type="checkbox" checked={savedOnly} onChange={e => setSavedOnly(e.target.checked)} style={{ accentColor: C.green }} />
          Shortlist only
        </label>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={clearFilters} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.txtMd, cursor: 'pointer', fontSize: '0.85rem' }}>
            Reset
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: C.gnDim, border: `1px solid ${C.gnBdr}`, color: C.green, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RIGHT PLAYER PANEL ────────────────────────────────────────────────────────
function PlayerPanel({ player, onClose, isSaved, onSaveToggle, onOpenLightbox, onFullAnalysis }) {
  const [tab, setTab] = useState('overview');
  const group    = getPositionGroup(player.pos);
  const scores   = group.keys.map(k => player.metrics?.[k] ?? 0);
  const videoUrl = player.reels?.highlight || '';
  const TABS     = ['Overview', 'Attributes', 'Matches', 'Analysis'];
  return (
    <div style={{
      width: 460, flexShrink: 0,
      borderLeft: `1px solid ${C.border}`,
      background: C.bg, overflowY: 'auto',
      height: '100%', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '20px 24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: C.txt, lineHeight: 1.15, fontFamily: 'syne, sans-serif' }}>
              {player.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: C.txtMd, marginTop: 5 }}>
              <span style={{ color: posColor(player.pos), fontWeight: 700 }}>{player.pos}</span>
              {' - '}{player.age}{' - '}{player.country}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 10 }}>
            {onSaveToggle && (
              <button onClick={() => onSaveToggle(player.id)} style={{
                background: isSaved ? C.gnDim : 'transparent',
                border: `1px solid ${isSaved ? C.gnBdr : C.border}`,
                borderRadius: 9, padding: '6px 11px', color: isSaved ? C.green : C.txtMd,
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
              }}>
                {isSaved ? 'Saved' : 'Save'}
              </button>
            )}
            {onFullAnalysis && (
              <button onClick={onFullAnalysis} style={{
                background: C.gnDim, border: `1px solid ${C.gnBdr}`,
                borderRadius: 9, padding: '6px 11px', color: C.green,
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700,
              }}>
                Full Report
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 9, padding: '6px 10px', color: C.txtMd, cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>
              x
            </button>
          </div>
        </div>
        {/* Video */}
        <div style={{ marginTop: 16, borderRadius: 14, overflow: 'hidden', background: '#0e0e10', border: `1px solid ${C.border}` }}>
          {videoUrl ? (
            <video src={videoUrl} controls preload="metadata" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.txtDim }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" /><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
              </svg>
              <span style={{ fontSize: '0.8rem' }}>No video available</span>
            </div>
          )}
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginTop: 20 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t.toLowerCase())} style={{
              padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', color: tab === t.toLowerCase() ? C.txt : C.txtMd,
              borderBottom: `2px solid ${tab === t.toLowerCase() ? C.green : 'transparent'}`,
              marginBottom: -1, fontWeight: tab === t.toLowerCase() ? 600 : 400,
              transition: 'color 0.12s',
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {/* Tab content */}
      <div style={{ padding: '20px 24px', flex: 1 }}>
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ background: '#131315', border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.txt, marginBottom: 12 }}>Player Info</div>
                <div style={{ fontSize: '0.82rem', color: C.txtMd, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div>Height: <span style={{ color: C.txt }}>{player.height ?? '-'}</span></div>
                  <div>Foot: <span style={{ color: C.txt }}>{player.foot ?? '-'}</span></div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Club: <span style={{ color: C.txt, fontSize: '0.76rem' }}>{player.club ?? '-'}</span></div>
                  <div>Region: <span style={{ color: C.txt }}>{player.country}</span></div>
                </div>
              </div>
              <div style={{ background: '#131315', border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.green, marginBottom: 8 }}>AI Scout Report</div>
                <p style={{ fontSize: '0.79rem', color: C.txtMd, lineHeight: 1.55, margin: 0 }}>
                  {(player.bio?.slice(0, 140) ?? 'No AI analysis available.')}{(player.bio?.length ?? 0) > 140 ? '...' : ''}
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#131315', border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px' }}>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: C.green, lineHeight: 1, fontFamily: 'monospace' }}>{player.overall}</div>
                <div style={{ color: C.txtMd, fontSize: '0.78rem', marginTop: 4 }}>Overall Score</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: scoreCol(player.aiMatch), lineHeight: 1, fontFamily: 'monospace', marginTop: 10 }}>{player.aiMatch}</div>
                <div style={{ color: C.txtDim, fontSize: '0.70rem', marginTop: 2 }}>AI Match %</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => onSaveToggle?.(player.id)} style={{ padding: '12px', borderRadius: 12, background: C.green, border: 'none', color: '#0d0d0f', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
                  {isSaved ? 'In Shortlist' : 'Add to Shortlist'}
                </button>
                {onFullAnalysis && (
                  <button onClick={onFullAnalysis} style={{ padding: '12px', borderRadius: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.txtMd, cursor: 'pointer', fontSize: '0.85rem' }}>
                    Full Analysis
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        {tab === 'attributes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <MiniRadar scores={scores} labels={group.labels} size={200} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {group.keys.map((k, i) => {
                const v = player.metrics?.[k] ?? 0;
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 88, fontSize: '0.75rem', color: C.txtMd, textTransform: 'capitalize', flexShrink: 0 }}>{group.labels[i]}</div>
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${v}%`, height: '100%', background: scoreCol(v), borderRadius: 2, transition: 'width 0.5s ease' }} />
                    </div>
                    <div style={{ width: 28, fontSize: '0.78rem', fontWeight: 700, color: scoreCol(v), fontFamily: 'monospace', textAlign: 'right' }}>{v}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {(tab === 'matches' || tab === 'analysis') && (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: C.txtDim }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>O</div>
            <div style={{ fontWeight: 600, color: C.txtMd, marginBottom: 8 }}>
              {tab === 'matches' ? 'Match History' : 'Detailed Analysis'}
            </div>
            <div style={{ fontSize: '0.83rem', marginBottom: 18 }}>
              {tab === 'analysis' ? 'Open Full Analysis for complete AI breakdown, clips and radar.' : 'Match data will appear once synced.'}
            </div>
            {tab === 'analysis' && onFullAnalysis && (
              <button onClick={onFullAnalysis} style={{ padding: '10px 20px', borderRadius: 10, background: C.gnDim, border: `1px solid ${C.gnBdr}`, color: C.green, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                Open Full Analysis
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── COMPARE VIEW ──────────────────────────────────────────────────────────────
function CompareView({ allPlayers, compareIds, setCompareIds, onSelect }) {
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const playerA = allPlayers.find(p => String(p.id) === String(compareIds[0]));
  const playerB = allPlayers.find(p => String(p.id) === String(compareIds[1]));
  const mkList = (excludeId, q) => allPlayers.filter(p =>
    String(p.id) !== String(excludeId) &&
    (!q || `${p.name} ${p.pos} ${p.country}`.toLowerCase().includes(q.toLowerCase()))
  );
  const metricKeys = playerA && playerB
    ? [...new Set([...Object.keys(playerA.metrics), ...Object.keys(playerB.metrics)])]
    : [];

  const Slot = ({ player, idx, search, setSearch }) => (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
      {player ? (
        <>
          <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, overflow: 'hidden', background: '#0e0e10', flexShrink: 0, border: `1px solid ${C.border}` }}>
              {player.headshot ? <img src={player.headshot} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800, color: 'rgba(255,255,255,0.08)' }}>{player.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.93rem', color: C.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</div>
              <div style={{ fontSize: '0.76rem', color: C.txtMd, marginTop: 2 }}>{player.pos} &middot; {player.age} &middot; {player.country}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => onSelect(player)} style={{ padding: '4px 9px', borderRadius: 7, background: C.gnDim, border: `1px solid ${C.gnBdr}`, color: C.green, cursor: 'pointer', fontSize: '0.70rem', fontWeight: 600 }}>Profile</button>
              <button onClick={() => setCompareIds(p => idx === 0 ? [null, p[1]] : [p[0], null])} style={{ padding: '4px 9px', borderRadius: 7, background: 'transparent', border: `1px solid ${C.border}`, color: C.txtDim, cursor: 'pointer', fontSize: '0.70rem' }}>Remove</button>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 14px', display: 'flex', gap: 16 }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.3rem', fontWeight: 800, color: scoreCol(player.overall), fontFamily: 'monospace' }}>{player.overall}</div><div style={{ fontSize: '0.58rem', color: C.txtDim, textTransform: 'uppercase' }}>Overall</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: '1.3rem', fontWeight: 800, color: C.txtMd, fontFamily: 'monospace' }}>{player.aiMatch}%</div><div style={{ fontSize: '0.58rem', color: C.txtDim, textTransform: 'uppercase' }}>AI Match</div></div>
          </div>
        </>
      ) : (
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: '0.62rem', color: C.txtDim, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>Player {idx === 0 ? 'A' : 'B'} — Select</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, position, country..." style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 10px', color: C.txt, outline: 'none', fontSize: '0.82rem', boxSizing: 'border-box', marginBottom: 10 }} />
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {mkList(idx === 0 ? compareIds[1] : compareIds[0], search).slice(0, 14).map(p => (
              <button key={p.id} onClick={() => setCompareIds(prev => idx === 0 ? [p.id, prev[1]] : [prev[0], p.id])} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px', background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left', marginBottom: 1 }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: posColor(p.pos), background: 'rgba(255,255,255,0.05)', borderRadius: 3, padding: '1px 5px' }}>{p.pos}</span>
                <span style={{ flex: 1, fontSize: '0.82rem', color: C.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: scoreCol(p.overall), fontFamily: 'monospace' }}>{p.overall}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 700, color: C.txt }}>Compare Players</h2>
        <div style={{ fontSize: '0.8rem', color: C.txtDim }}>Select two players to compare their stats side by side</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 36px minmax(0,1fr)', gap: 10, marginBottom: 24, alignItems: 'start' }}>
        <Slot player={playerA} idx={0} search={searchA} setSearch={setSearchA} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60, color: C.txtDim, fontWeight: 700, fontSize: '0.82rem' }}>vs</div>
        <Slot player={playerB} idx={1} search={searchB} setSearch={setSearchB} />
      </div>
      {playerA && playerB && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr', background: '#0e0e10', borderBottom: `1px solid ${C.border}`, padding: '12px 16px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playerA.name}</div>
            <div style={{ textAlign: 'center', fontSize: '0.60rem', color: C.txtDim, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', alignSelf: 'center' }}>Metric</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.txt, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playerB.name}</div>
          </div>
          {[['Overall', playerA.overall, playerB.overall], ...metricKeys.map(k => [k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), playerA.metrics[k] ?? 0, playerB.metrics[k] ?? 0])].map(([label, aV, bV], i) => {
            const w = aV > bV ? 'A' : bV > aV ? 'B' : '';
            return (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr', padding: '9px 16px', borderBottom: i < metricKeys.length ? `1px solid ${C.border}` : 'none', background: i % 2 === 1 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: w === 'A' ? 700 : 400, color: w === 'A' ? C.green : C.txt, fontFamily: 'monospace', minWidth: 26 }}>{aV || '—'}</span>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}><div style={{ height: '100%', borderRadius: 2, width: aV ? `${Math.min(aV, 100)}%` : '0%', background: w === 'A' ? C.green : C.txtDim, transition: 'width 0.5s' }} /></div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.64rem', color: C.txtDim, textTransform: 'uppercase', letterSpacing: '0.04em', alignSelf: 'center' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row-reverse' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: w === 'B' ? 700 : 400, color: w === 'B' ? C.green : C.txt, fontFamily: 'monospace', minWidth: 26, textAlign: 'right' }}>{bV || '—'}</span>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}><div style={{ height: '100%', borderRadius: 2, width: bV ? `${Math.min(bV, 100)}%` : '0%', background: w === 'B' ? C.green : C.txtDim, transition: 'width 0.5s', marginLeft: 'auto' }} /></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── REPORTS VIEW ──────────────────────────────────────────────────────────────
function ReportsView({ savedReports, allPlayers, onSelect }) {
  const [expanded, setExpanded] = useState(null);
  const entries = Object.entries(savedReports).sort((a, b) => new Date(b[1].generatedAt) - new Date(a[1].generatedAt));
  if (entries.length === 0) return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: '1.2rem', fontWeight: 700, color: C.txt }}>Reports</h2>
      <div style={{ textAlign: 'center', padding: '60px 20px', color: C.txtDim }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>○</div>
        <div style={{ fontWeight: 600, color: C.txtMd, marginBottom: 8 }}>No reports yet</div>
        <div style={{ fontSize: '0.82rem' }}>Generate a Transfer Pitch from a player profile to save it here automatically</div>
      </div>
    </div>
  );
  return (
    <div>
      <div style={{ marginBottom: 22 }}><h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 700, color: C.txt }}>Reports</h2><div style={{ fontSize: '0.8rem', color: C.txtDim }}>{entries.length} saved report{entries.length !== 1 ? 's' : ''}</div></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map(([id, report]) => {
          const player = allPlayers.find(p => String(p.id) === String(id));
          const isExp = expanded === id;
          return (
            <div key={id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setExpanded(isExp ? null : id)}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#0e0e10', border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0 }}>
                  {player?.headshot ? <img src={player.headshot} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.1)' }}>{report.playerName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.txt }}>{report.playerName}</div>
                  <div style={{ fontSize: '0.70rem', color: C.txtDim, marginTop: 2 }}>{new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                  {!isExp && <div style={{ fontSize: '0.76rem', color: C.txtMd, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.text.slice(0, 90)}…</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {player && <button onClick={e => { e.stopPropagation(); onSelect(player); }} style={{ padding: '4px 9px', borderRadius: 6, background: C.gnDim, border: `1px solid ${C.gnBdr}`, color: C.green, cursor: 'pointer', fontSize: '0.70rem', fontWeight: 600 }}>Profile</button>}
                  <button style={{ padding: '4px 9px', borderRadius: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.txtMd, cursor: 'pointer', fontSize: '0.70rem' }}>{isExp ? '▲' : '▼'}</button>
                </div>
              </div>
              {isExp && <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.border}` }}><div style={{ paddingTop: 14, fontFamily: '"JetBrains Mono","Courier New",monospace', fontSize: '0.76rem', color: C.txt, lineHeight: 1.8, whiteSpace: 'pre-wrap', background: '#0b0b0d', borderRadius: 8, padding: '14px 16px' }}>{report.text}</div></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MY NOTES VIEW ─────────────────────────────────────────────────────────────
function MyNotesView({ notes, saveNote, allPlayers, onSelect }) {
  const [editing, setEditing] = useState(null);
  const [editText, setEditText] = useState('');
  const noted = allPlayers.filter(p => notes[p.id]?.trim());
  if (noted.length === 0) return (
    <div>
      <h2 style={{ margin: '0 0 24px', fontSize: '1.2rem', fontWeight: 700, color: C.txt }}>My Notes</h2>
      <div style={{ textAlign: 'center', padding: '60px 20px', color: C.txtDim }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>○</div>
        <div style={{ fontWeight: 600, color: C.txtMd, marginBottom: 8 }}>No notes yet</div>
        <div style={{ fontSize: '0.82rem' }}>Open a player profile and go to the Notes tab to write your scouting notes</div>
      </div>
    </div>
  );
  return (
    <div>
      <div style={{ marginBottom: 22 }}><h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 700, color: C.txt }}>My Notes</h2><div style={{ fontSize: '0.8rem', color: C.txtDim }}>{noted.length} player{noted.length !== 1 ? 's' : ''} with notes</div></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {noted.map(p => {
          const isEd = editing === p.id;
          return (
            <div key={p.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#0e0e10', border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0, cursor: 'pointer' }} onClick={() => onSelect(p)}>
                  {p.headshot ? <img src={p.headshot} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.1)' }}>{p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onSelect(p)}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.txt }}>{p.name}</div>
                  <div style={{ fontSize: '0.74rem', color: C.txtMd, marginTop: 1 }}>{p.pos} &middot; {p.club}</div>
                </div>
                <button onClick={() => { if (isEd) { setEditing(null); } else { setEditing(p.id); setEditText(notes[p.id] || ''); } }} style={{ padding: '5px 10px', borderRadius: 7, background: isEd ? C.gnDim : 'transparent', border: `1px solid ${isEd ? C.gnBdr : C.border}`, color: isEd ? C.green : C.txtMd, cursor: 'pointer', fontSize: '0.72rem', flexShrink: 0 }}>{isEd ? 'Close' : 'Edit'}</button>
              </div>
              {isEd ? (
                <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${C.border}` }}>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ marginTop: 12, width: '100%', minHeight: 120, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.txt, fontSize: '0.84rem', fontFamily: 'Inter,sans-serif', lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                  <button onClick={() => { saveNote(p.id, editText); setEditing(null); }} style={{ marginTop: 8, padding: '7px 16px', borderRadius: 7, background: C.gnDim, border: `1px solid ${C.gnBdr}`, color: C.green, cursor: 'pointer', fontSize: '0.80rem', fontWeight: 600 }}>Save</button>
                </div>
              ) : (
                <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${C.border}` }}><div style={{ paddingTop: 10, fontSize: '0.82rem', color: C.txtMd, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{notes[p.id]}</div></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function ScoutDashboard({
  onOpenLightbox, savedIds, onSaveToggle, newProfile,
  localProfiles = [], blobUrls = {},
  onPlayerFocus,
}) {
  const { isMobile, isTablet } = useBreakpoint();
  const [search,       setSearch]       = useState('');
  const [posFilter,    setPosFilter]    = useState(new Set());
  const [regionFilter, setRegionFilter] = useState('');
  const [ageMax,       setAgeMax]       = useState(30);
  const [scoreMin,     setScoreMin]     = useState(0);
  const [sortBy,       setSortBy]       = useState('overall');
  const [savedOnly,    setSavedOnly]    = useState(false);
  const [navSection,      setNavSection]      = useState('discover');
  const [selectedPlayer,  setSelectedPlayer]  = useState(null);
  const [filtersOpen,       setFiltersOpen]       = useState(false);
  const [sidebarFiltersOpen, setSidebarFiltersOpen] = useState(true);
  const [fullAnalysisFor, setFullAnalysisFor] = useState(null);
  const [navOpen,         setNavOpen]         = useState(false);
  const [insightsOpen,    setInsightsOpen]    = useState(true);
  const [myScoutingOpen,  setMyScoutingOpen]  = useState(true);

  // ── PERSISTED LOCAL-STORAGE STATE ──────────────────────────────────────────────────
  const [watchlistIds, setWatchlistIds] = useLocalStorage('scoutai_watchlist', []);
  const [notes,        setNotes]        = useLocalStorage('scoutai_notes', {});
  const [seenData,     setSeenData]     = useLocalStorage('scoutai_seen', {});
  const [recentIds,    setRecentIds]    = useLocalStorage('scoutai_recent', []);
  const [savedReports, setSavedReports] = useLocalStorage('scoutai_reports', {});
  const [compareIds,   setCompareIds]   = useLocalStorage('scoutai_compare', [null, null]);

  const allPlayers = useMemo(() => {
    const locals = localProfiles.map(m => buildLocalPlayer(m, blobUrls[m.id] ?? {}));
    const base   = newProfile ? [buildInjectedPlayer(newProfile), ...mockPlayers] : mockPlayers;
    return [...locals, ...base];
  }, [newProfile, localProfiles, blobUrls]);

  const regions = useMemo(() => [...new Set(mockPlayers.map(p => p.region))].sort(), []);

  const togglePos = useCallback(pos => {
    setPosFilter(prev => {
      const next = new Set(prev);
      next.has(pos) ? next.delete(pos) : next.add(pos);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearch(''); setPosFilter(new Set()); setRegionFilter('');
    setAgeMax(30); setScoreMin(0); setSavedOnly(false); setSortBy('overall');
  }, []);

  const hasActiveFilters = search || posFilter.size || regionFilter || ageMax < 30 || scoreMin > 0 || savedOnly;

  const filtered = useMemo(() => {
    let list = allPlayers.filter(p => {
      if (navSection === 'shortlist' || savedOnly) { if (!savedIds.includes(p.id)) return false; }
      if (posFilter.size > 0 && !posFilter.has(p.pos)) return false;
      if (regionFilter && p.region !== regionFilter) return false;
      if (p.age > ageMax) return false;
      if (p.overall < scoreMin) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!`${p.name} ${p.country} ${p.club} ${p.pos}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'overall') return b.overall - a.overall;
      if (sortBy === 'aiMatch') return b.aiMatch  - a.aiMatch;
      if (sortBy === 'age')     return a.age      - b.age;
      if (sortBy === 'name')    return a.name.localeCompare(b.name);
      return 0;
    });
  }, [allPlayers, search, posFilter, regionFilter, ageMax, scoreMin, sortBy, savedOnly, savedIds, navSection]);

  const selectPlayer = useCallback(p => {
    setSelectedPlayer(p); onPlayerFocus?.(p);
    const now = new Date().toISOString();
    setSeenData(prev => ({ ...prev, [p.id]: { count: (prev[p.id]?.count ?? 0) + 1, lastSeen: now } }));
    setRecentIds(prev => [p.id, ...prev.filter(id => String(id) !== String(p.id))].slice(0, 20));
  }, [onPlayerFocus]);

  const toggleWatchlist = useCallback(id => setWatchlistIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), []);
  const saveNote        = useCallback((id, text) => setNotes(prev => ({ ...prev, [id]: text })), []);
  const saveReport      = useCallback((id, name, text) => setSavedReports(prev => ({ ...prev, [id]: { text, generatedAt: new Date().toISOString(), playerName: name } })), []);

  const trendingPlayers = useMemo(() =>
    [...allPlayers].sort((a, b) => ((seenData[b.id]?.count ?? 0) - (seenData[a.id]?.count ?? 0)) || b.overall - a.overall),
    [allPlayers, seenData]);
  const topPerformerPlayers = useMemo(() =>
    [...allPlayers].filter(p => p.overall >= 82).sort((a, b) => b.overall - a.overall), [allPlayers]);
  const newUploadPlayers = useMemo(() => allPlayers.filter(p => p._local || p._injected), [allPlayers]);
  const seenPlayersList  = useMemo(() =>
    [...allPlayers].filter(p => seenData[p.id]).sort((a, b) => (seenData[b.id]?.count ?? 0) - (seenData[a.id]?.count ?? 0)),
    [allPlayers, seenData]);
  const recentlyViewedPlayers = useMemo(() =>
    recentIds.map(id => allPlayers.find(p => String(p.id) === String(id))).filter(Boolean),
    [allPlayers, recentIds]);

  const aiPicks    = useMemo(() => [...allPlayers].sort((a, b) => b.overall - a.overall).slice(0, 4), [allPlayers]);
  const recentAdds = useMemo(() => {
    const locals = allPlayers.filter(p => p._local || p._injected);
    const fill   = allPlayers.filter(p => !p._local && !p._injected);
    return [...locals, ...fill].slice(0, 5);
  }, [allPlayers]);

  const TRENDING = ['U17 Talents', 'Score > 85', 'Strikers', 'Left Wingers', 'Ghana', 'Nigeria'];
  const showGrid = navSection !== 'discover' || !!hasActiveFilters;

  const filterHandlers = { setSearch, togglePos, setRegionFilter, setAgeMax, setScoreMin, setSortBy, setSavedOnly, clearFilters };
  const filterState    = { search, posFilter, regionFilter, ageMax, scoreMin, sortBy, savedOnly };

  const NAV_MAIN = [
    {
      id: 'discover', label: 'Discover',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 3.5v1.5M8 11v1.5M3.5 8H5M11 8h1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M6.5 6.5l3 3M9.5 6.5L6.5 9.5" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round"/><circle cx="8" cy="8" r="1.1" fill="currentColor"/></svg>,
    },
    {
      id: 'search', label: 'Search',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.35"/><line x1="9.5" y1="9.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
    },
    {
      id: 'shortlist', label: 'Shortlist',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><path d="M8 13C8 13 2 9 2 5.5A3 3 0 0 1 8 3.8 3 3 0 0 1 14 5.5C14 9 8 13 8 13Z" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>,
    },
    {
      id: 'compare', label: 'Compare',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><line x1="2" y1="5" x2="14" y2="5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/><circle cx="9.5" cy="5" r="1.8" stroke="currentColor" strokeWidth="1.2" fill="none"/><line x1="2" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/><circle cx="5.5" cy="11" r="1.8" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>,
    },
    {
      id: 'watchlist', label: 'Watchlist',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><circle cx="3" cy="4" r="1.1" fill="currentColor"/><line x1="6" y1="4" x2="13.5" y2="4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/><circle cx="3" cy="8" r="1.1" fill="currentColor"/><line x1="6" y1="8" x2="13.5" y2="8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/><circle cx="3" cy="12" r="1.1" fill="currentColor"/><line x1="6" y1="12" x2="11" y2="12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/></svg>,
    },
    {
      id: 'reports', label: 'Reports',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><rect x="2.5" y="1.5" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><polyline points="4.5,11 6.5,8 8.5,9.5 11.5,5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
  ];
  const NAV_INSIGHTS = [
    {
      id: 'trending', label: 'Trending',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><rect x="1.5" y="8.5" width="3" height="5.5" rx="0.6" stroke="currentColor" strokeWidth="1.2"/><rect x="6.5" y="5.5" width="3" height="8.5" rx="0.6" stroke="currentColor" strokeWidth="1.2"/><rect x="11.5" y="2.5" width="3" height="11.5" rx="0.6" stroke="currentColor" strokeWidth="1.2"/></svg>,
    },
    {
      id: 'topPerformers', label: 'Top Performers',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><path d="M8 2.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L8 10.8l-3.2 1.6.6-3.6L2.8 6.3l3.6-.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      id: 'newUploads', label: 'New Uploads',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3"/><line x1="8" y1="5.2" x2="8" y2="10.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><line x1="5.2" y1="8" x2="10.8" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
    },
  ];
  const NAV_MY_SCOUTING = [
    {
      id: 'myNotes', label: 'My Notes',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><rect x="2.5" y="1.5" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><line x1="4.5" y1="5.5" x2="11.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><polyline points="4.5,11.5 6,13 9,9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      id: 'playersSeen', label: 'Players Seen',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><rect x="2.5" y="1.5" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><line x1="4.5" y1="5.5" x2="11.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="4.5" y1="8" x2="11.5" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="4.5" y1="10.5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
    },
    {
      id: 'recentlyViewed', label: 'Recently Viewed',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3"/><line x1="8" y1="5" x2="8" y2="8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><line x1="8" y1="8.5" x2="10.5" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
    },
  ];

  return (
    <div style={{ background: C.bg, color: C.txt, height: 'calc(100vh - 56px)', display: 'flex', overflow: 'hidden' }}>
      {/* Mobile nav backdrop */}
      {isMobile && navOpen && (
        <div onClick={() => setNavOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200 }} />
      )}

      {/* LEFT NAV SIDEBAR */}
      <aside style={{
        width: 240, flexShrink: 0,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        background: C.bg, overflow: 'hidden',
        ...(isMobile ? {
          position: 'fixed', top: 56, left: 0, bottom: 0, zIndex: 210,
          transform: navOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.16,1,0.3,1)',
        } : {
          position: 'sticky', top: 0, height: '100%',
        }),
      }}>
        {!isMobile && (
          <div style={{ padding: '20px 16px 10px' }}>
            <span style={{ fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: C.txtDim, fontWeight: 700 }}>Scout AI</span>
          </div>
        )}
        <nav style={{ padding: isMobile ? '16px 0 0' : '4px 0 0', flexShrink: 0 }}>
          {/* ── Main nav items ───────────────────────────────────── */}
          {NAV_MAIN.map(item => {
            const active = navSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setNavSection(item.id); if (isMobile) setNavOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '9px 14px 9px 13px',
                  borderLeft: `3px solid ${active ? '#3ecf70' : 'transparent'}`,
                  borderRight: 'none', borderTop: 'none', borderBottom: 'none',
                  background: active
                    ? 'linear-gradient(90deg, rgba(62,207,112,0.06) 0%, rgba(13,15,20,0) 100%)'
                    : 'transparent',
                  borderRadius: '0px 6px 6px 0px',
                  color: active ? '#ffffff' : C.txtDim,
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: active ? 600 : 400,
                  textAlign: 'left', transition: 'color 0.12s, background 0.12s, border-color 0.12s',
                  outline: 'none', marginBottom: 1,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === 'shortlist' && savedIds.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.70rem', background: C.gnDim, border: `1px solid ${C.gnBdr}`, borderRadius: 999, padding: '1px 7px', color: C.green }}>
                    {savedIds.length}
                  </span>
                )}
              </button>
            );
          })}

          {/* ── Insights section ──────────────────────────────────── */}
          <div style={{ height: 1, background: C.border, margin: '10px 14px 2px' }} />
          <button
            onClick={() => setInsightsOpen(x => !x)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '8px 14px 8px 16px', background: 'transparent',
              border: 'none', cursor: 'pointer', marginTop: 2,
            }}
          >
            <span style={{ fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: C.txtDim, fontWeight: 700 }}>Insights</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)', transform: insightsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <path d="M1.5 3.5l3.5 3.5 3.5-3.5" stroke={C.txtDim} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{
            overflow: 'hidden',
            maxHeight: insightsOpen ? '400px' : '0px',
            opacity: insightsOpen ? 1 : 0,
            transition: insightsOpen
              ? 'max-height 0.45s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease 0.05s'
              : 'max-height 0.35s cubic-bezier(0.4,0,1,1), opacity 0.2s ease',
          }}>
            {NAV_INSIGHTS.map(item => {
              const active = navSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setNavSection(item.id); if (isMobile) setNavOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '9px 14px 9px 13px',
                    borderLeft: `3px solid ${active ? '#3ecf70' : 'transparent'}`,
                    borderRight: 'none', borderTop: 'none', borderBottom: 'none',
                    background: active
                      ? 'linear-gradient(90deg, rgba(62,207,112,0.06) 0%, rgba(13,15,20,0) 100%)'
                      : 'transparent',
                    borderRadius: '0px 6px 6px 0px',
                    color: active ? '#ffffff' : C.txtDim,
                    cursor: 'pointer', fontSize: '0.875rem', fontWeight: active ? 600 : 400,
                    textAlign: 'left', transition: 'color 0.12s, background 0.12s, border-color 0.12s',
                    outline: 'none', marginBottom: 1,
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── My Scouting section ───────────────────────────────── */}
          <div style={{ height: 1, background: C.border, margin: '10px 14px 2px' }} />
          <button
            onClick={() => setMyScoutingOpen(x => !x)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '8px 14px 8px 16px', background: 'transparent',
              border: 'none', cursor: 'pointer', marginTop: 2,
            }}
          >
            <span style={{ fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: C.txtDim, fontWeight: 700 }}>My Scouting</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)', transform: myScoutingOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <path d="M1.5 3.5l3.5 3.5 3.5-3.5" stroke={C.txtDim} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{
            overflow: 'hidden',
            maxHeight: myScoutingOpen ? '400px' : '0px',
            opacity: myScoutingOpen ? 1 : 0,
            transition: myScoutingOpen
              ? 'max-height 0.45s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease 0.05s'
              : 'max-height 0.35s cubic-bezier(0.4,0,1,1), opacity 0.2s ease',
          }}>
            {NAV_MY_SCOUTING.map(item => {
              const active = navSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setNavSection(item.id); if (isMobile) setNavOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '9px 14px 9px 13px',
                    borderLeft: `3px solid ${active ? '#3ecf70' : 'transparent'}`,
                    borderRight: 'none', borderTop: 'none', borderBottom: 'none',
                    background: active
                      ? 'linear-gradient(90deg, rgba(62,207,112,0.06) 0%, rgba(13,15,20,0) 100%)'
                      : 'transparent',
                    borderRadius: '0px 6px 6px 0px',
                    color: active ? '#ffffff' : C.txtDim,
                    cursor: 'pointer', fontSize: '0.875rem', fontWeight: active ? 600 : 400,
                    textAlign: 'left', transition: 'color 0.12s, background 0.12s, border-color 0.12s',
                    outline: 'none', marginBottom: 1,
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* ── INLINE FILTERS ───────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px' }}>
          <button
            onClick={() => setSidebarFiltersOpen(x => !x)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '0 0 12px 0',
            }}
          >
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: C.txtDim, fontWeight: 700 }}>Filters</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)', transform: sidebarFiltersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <path d="M2 4l4 4 4-4" stroke={C.txtDim} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div style={{
            overflow: 'hidden',
            maxHeight: sidebarFiltersOpen ? '1200px' : '0px',
            opacity: sidebarFiltersOpen ? 1 : 0,
            transition: sidebarFiltersOpen
              ? 'max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease 0.05s'
              : 'max-height 0.35s cubic-bezier(0.4, 0, 1, 1), opacity 0.2s ease',
          }}>
          {/* Search */}
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Name, country, club..."
            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 10px', color: C.txt, outline: 'none', fontSize: '0.82rem', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box', marginBottom: 14 }}
          />

          {/* Positions */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.62rem', color: C.txtDim, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>Position</div>
            {POS_GROUPS_LIST.map(grp => (
              <div key={grp.label} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.65rem', color: C.txtDim, marginBottom: 5 }}>{grp.label}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {grp.positions.map(pos => (
                    <button key={pos} onClick={() => togglePos(pos)} style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                      background: posFilter.has(pos) ? C.gnDim : 'transparent',
                      border: `1px solid ${posFilter.has(pos) ? C.gnBdr : C.border}`,
                      color: posFilter.has(pos) ? C.green : C.txtMd,
                    }}>{pos}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Region */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.62rem', color: C.txtDim, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>Region</div>
            <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 10px', color: C.txt, outline: 'none', fontSize: '0.80rem', cursor: 'pointer', boxSizing: 'border-box' }}>
              <option value="">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Age slider */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: '0.62rem', color: C.txtDim, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Max Age</span>
              <span style={{ fontSize: '0.75rem', color: C.txtMd, fontFamily: 'monospace' }}>{ageMax}</span>
            </div>
            <input type="range" min={16} max={30} value={ageMax} onChange={e => setAgeMax(Number(e.target.value))} style={{ width: '100%', accentColor: C.green }} />
          </div>

          {/* Score slider */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: '0.62rem', color: C.txtDim, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Min Score</span>
              <span style={{ fontSize: '0.75rem', color: C.txtMd, fontFamily: 'monospace' }}>{scoreMin}</span>
            </div>
            <input type="range" min={0} max={95} step={5} value={scoreMin} onChange={e => setScoreMin(Number(e.target.value))} style={{ width: '100%', accentColor: C.green }} />
          </div>

          {/* Sort */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: '0.62rem', color: C.txtDim, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>Sort By</div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 10px', color: C.txt, outline: 'none', fontSize: '0.80rem', cursor: 'pointer', boxSizing: 'border-box' }}>
              <option value="overall">Top Score</option>
              <option value="aiMatch">AI Fit</option>
              <option value="age">Youngest</option>
              <option value="name">A–Z</option>
            </select>
          </div>

          {/* Shortlist only toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', marginBottom: 12 }}>
            <div
              onClick={() => setSavedOnly(x => !x)}
              style={{
                width: 32, height: 18, borderRadius: 10, flexShrink: 0,
                background: savedOnly ? C.green : 'rgba(255,255,255,0.06)',
                border: `1px solid ${savedOnly ? C.gnBdr : C.border}`,
                position: 'relative', cursor: 'pointer', transition: 'background 0.14s',
              }}
            >
              <div style={{ position: 'absolute', top: 2, left: savedOnly ? 16 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.14s' }} />
            </div>
            <span style={{ fontSize: '0.80rem', color: C.txtMd }}>Shortlist only</span>
          </label>

          {hasActiveFilters && (
            <button onClick={clearFilters} style={{ width: '100%', padding: '7px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.txtMd, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
              Clear all filters
            </button>
          )}
          </div>
        </div>


      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: isMobile ? '18px 14px 80px' : '24px 24px 60px', flex: 1 }}>
          {/* ─── MULTI-SECTION CONTENT ───────────────────────────────────────────────────── */}
          {navSection === 'compare' ? (
            <CompareView allPlayers={allPlayers} compareIds={compareIds} setCompareIds={setCompareIds} onSelect={selectPlayer} />
          ) : navSection === 'reports' ? (
            <ReportsView savedReports={savedReports} allPlayers={allPlayers} onSelect={selectPlayer} />
          ) : navSection === 'myNotes' ? (
            <MyNotesView notes={notes} saveNote={saveNote} allPlayers={allPlayers} onSelect={selectPlayer} />
          ) : navSection === 'discover' && !hasActiveFilters ? (
            <>
              {/* Hero Banner */}
              <section style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, height: isMobile ? 200 : 280, marginBottom: 32, background: '#111113', border: `1px solid ${C.border}` }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #0b0b0d 0%, rgba(11,11,13,0.85) 50%, rgba(11,11,13,0) 100%)', zIndex: 1 }} />
                <div style={{ position: 'absolute', right: 0, top: 0, width: '60%', height: '100%', overflow: 'hidden' }}>
                  <img src="/assets/banner.png" alt="Scout AI hero" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                </div>
                <div style={{ position: 'relative', zIndex: 2, padding: isMobile ? '22px 20px' : '26px 36px', maxWidth: 500 }}>
                  <div style={{ fontSize: isMobile ? '1.5rem' : '2.2rem', fontWeight: 800, lineHeight: 1.15, fontFamily: 'syne, sans-serif' }}>
                    Find the{' '}<span style={{ color: C.green }}>next generation</span>{' '}of stars
                  </div>
                  <p style={{ marginTop: 12, color: C.txtMd, fontSize: isMobile ? '0.85rem' : '0.92rem', lineHeight: 1.5 }}>
                    AI-powered scouting to discover, analyze and recruit talent worldwide.
                  </p>
                  <button
                    onClick={() => setNavSection('search')}
                    style={{ marginTop: 18, padding: '10px 22px', background: C.green, border: 'none', borderRadius: 10, color: '#0d0d0f', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    Explore Players
                  </button>
                </div>
              </section>

              {/* AI Picks */}
              <section style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: C.txt }}>AI Picks For You</h2>
                  <button onClick={() => setNavSection('topPerformers')} style={{ background: 'none', border: 'none', color: C.txtMd, cursor: 'pointer', fontSize: '0.85rem' }}>View All</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 14 }}>
                  {aiPicks.map(p => (
                    <CompactCard key={p.id} player={p} tall={true} onClick={() => selectPlayer(p)} isSaved={savedIds.includes(p.id)} onSaveToggle={onSaveToggle} isWatched={watchlistIds.includes(p.id)} onWatchToggle={() => toggleWatchlist(p.id)} viewCount={seenData[p.id]?.count} />
                  ))}
                </div>
              </section>

              {/* Recently Added */}
              <section style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: C.txt }}>Recently Added</h2>
                  <button onClick={() => setNavSection('newUploads')} style={{ background: 'none', border: 'none', color: C.txtMd, cursor: 'pointer', fontSize: '0.85rem' }}>View All</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 12 }}>
                  {recentAdds.map(p => (
                    <CompactCard key={p.id} player={p} tall={false} onClick={() => selectPlayer(p)} isSaved={savedIds.includes(p.id)} onSaveToggle={onSaveToggle} isWatched={watchlistIds.includes(p.id)} onWatchToggle={() => toggleWatchlist(p.id)} />
                  ))}
                </div>
              </section>

              {/* Trending Searches */}
              <section>
                <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 600, color: C.txt }}>Trending Searches</h3>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {TRENDING.map(t => (
                    <button
                      key={t} onClick={() => { setSearch(t); setNavSection('search'); }}
                      style={{ padding: '9px 18px', borderRadius: 999, background: '#131315', border: `1px solid ${C.border}`, color: C.txtMd, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.brdHi; e.currentTarget.style.color = C.txt; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.txtMd; }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            /* ── STANDARD GRID VIEWS ────────────────────────────────────────────────────────────── */
            (() => {
              let players = filtered;
              let title = search ? `"${search}"` : 'All Players';
              let subtitle = `${filtered.length} of ${allPlayers.length} players`;
              let emptyTitle = 'No players found';
              let emptyNote = '';
              const ns = navSection;

              if (ns === 'shortlist') {
                players = allPlayers.filter(p => savedIds.includes(p.id));
                title = 'My Shortlist'; subtitle = `${players.length} saved`;
                emptyTitle = 'Your shortlist is empty'; emptyNote = 'Click ☆ on any player card to save them here';
              } else if (ns === 'watchlist') {
                players = allPlayers.filter(p => watchlistIds.includes(p.id));
                title = 'Watchlist'; subtitle = `${players.length} players being watched`;
                emptyTitle = 'Your watchlist is empty'; emptyNote = 'Click the eye icon on any player card to add them';
              } else if (ns === 'search') {
                title = search ? `"${search}"` : 'All Players'; subtitle = `${players.length} results`;
                emptyTitle = 'No matches'; emptyNote = 'Try a different name, country or position';
              } else if (ns === 'trending') {
                players = trendingPlayers; title = 'Trending'; subtitle = 'Most viewed in your session';
              } else if (ns === 'topPerformers') {
                players = topPerformerPlayers; title = 'Top Performers'; subtitle = `${players.length} players scoring 82+`;
              } else if (ns === 'newUploads') {
                players = newUploadPlayers; title = 'New Uploads'; subtitle = `${players.length} uploaded`;
                emptyTitle = 'No uploads yet'; emptyNote = 'Upload player profiles from the Uploader';
              } else if (ns === 'playersSeen') {
                players = seenPlayersList; title = 'Players Seen'; subtitle = `${players.length} profiles viewed`;
                emptyTitle = 'No players viewed yet'; emptyNote = 'Open a player profile to track it here';
              } else if (ns === 'recentlyViewed') {
                players = recentlyViewedPlayers; title = 'Recently Viewed'; subtitle = 'Most recent first';
                emptyTitle = 'No recent views'; emptyNote = 'Players you open will appear here';
              }

              const noSort = ['watchlist','shortlist','trending','topPerformers','newUploads','playersSeen','recentlyViewed'].includes(ns);
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: C.txt }}>{title}</h2>
                      <div style={{ fontSize: '0.8rem', color: C.txtDim, marginTop: 2 }}>{subtitle}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {hasActiveFilters && !noSort && (
                        <button onClick={clearFilters} style={{ padding: '7px 12px', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.txtMd, cursor: 'pointer', fontSize: '0.78rem' }}>Clear filters</button>
                      )}
                      {!noSort && (
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '7px 12px', borderRadius: 9, background: '#131315', border: `1px solid ${C.border}`, color: C.txt, cursor: 'pointer', fontSize: '0.82rem', outline: 'none' }}>
                          <option value="overall">Top Score</option>
                          <option value="aiMatch">AI Fit</option>
                          <option value="age">Youngest</option>
                          <option value="name">A-Z</option>
                        </select>
                      )}
                    </div>
                  </div>
                  {players.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: C.txtDim }}>
                      <div style={{ fontSize: '2rem', marginBottom: 12 }}>○</div>
                      <div style={{ fontWeight: 600, color: C.txtMd, marginBottom: 8 }}>{emptyTitle}</div>
                      {emptyNote && <div style={{ fontSize: '0.82rem', color: C.txtDim }}>{emptyNote}</div>}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '155px' : '195px'}, 1fr))`, gap: 14 }}>
                      {players.map(p => (
                        <CompactCard key={p.id} player={p} tall={true} onClick={() => selectPlayer(p)}
                          isSaved={savedIds.includes(p.id)} onSaveToggle={onSaveToggle}
                          isWatched={watchlistIds.includes(p.id)} onWatchToggle={() => toggleWatchlist(p.id)}
                          viewCount={seenData[p.id]?.count}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()
          )}
        </div>
      </main>

      {/* RIGHT PLAYER PANEL (desktop only) */}
      {selectedPlayer && !isMobile && !isTablet && (
        <PlayerPanel
          player={selectedPlayer}
          onClose={() => { setSelectedPlayer(null); onPlayerFocus?.(null); }}
          isSaved={savedIds.includes(selectedPlayer.id)}
          onSaveToggle={onSaveToggle}
          onOpenLightbox={onOpenLightbox}
          onFullAnalysis={() => setFullAnalysisFor(selectedPlayer)}
        />
      )}

      {/* FILTERS MODAL */}
      <FiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} state={filterState} handlers={filterHandlers} regions={regions} />

      {/* FULL ANALYSIS MODAL (desktop button + all mobile/tablet taps) */}
      {(fullAnalysisFor || ((isMobile || isTablet) && selectedPlayer)) && (
        <PlayerModal
          player={fullAnalysisFor ?? selectedPlayer}
          onClose={() => {
            setFullAnalysisFor(null);
            if (isMobile || isTablet) { setSelectedPlayer(null); onPlayerFocus?.(null); }
          }}
          onOpenLightbox={onOpenLightbox}
          isSaved={savedIds.includes((fullAnalysisFor ?? selectedPlayer).id)}
          onSaveToggle={onSaveToggle}
          notes={notes[(fullAnalysisFor ?? selectedPlayer).id] || ''}
          onSaveNote={saveNote}
          onSaveReport={saveReport}
          watchlistIds={watchlistIds}
          onWatchlistToggle={toggleWatchlist}
        />
      )}
    </div>
  );
}
