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
function CompactCard({ player, onClick, isSaved, onSaveToggle, tall = true }) {
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
  const [filtersOpen,     setFiltersOpen]     = useState(false);
  const [fullAnalysisFor, setFullAnalysisFor] = useState(null);
  const [navOpen,         setNavOpen]         = useState(false);

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

  const selectPlayer = useCallback(p => { setSelectedPlayer(p); onPlayerFocus?.(p); }, [onPlayerFocus]);

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

  const NAV_ITEMS = [
    { id: 'discover',  label: 'Discover',  icon: 'D' },
    { id: 'shortlist', label: 'Shortlist', icon: 'S' },
    { id: 'compare',   label: 'Compare',   icon: 'C' },
    { id: 'reports',   label: 'Reports',   icon: 'R' },
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
          <div style={{ padding: '22px 22px 14px' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: 'syne, sans-serif', letterSpacing: '-0.03em' }}>
              Scout <span style={{ color: C.green }}>AI</span>
            </div>
          </div>
        )}
        <nav style={{ padding: isMobile ? '16px 12px 0' : '4px 12px 0', flexShrink: 0 }}>
          {NAV_ITEMS.map(item => {
            const active = navSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setNavSection(item.id); if (isMobile) setNavOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '11px 14px', borderRadius: 12, marginBottom: 4,
                  background: active ? C.gnDim : 'transparent',
                  border: `1px solid ${active ? C.gnBdr : 'transparent'}`,
                  color: active ? C.green : C.txtMd,
                  cursor: 'pointer', fontSize: '0.92rem', fontWeight: active ? 600 : 400,
                  textAlign: 'left', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                {item.label}
                {item.id === 'shortlist' && savedIds.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', background: C.gnDim, border: `1px solid ${C.gnBdr}`, borderRadius: 999, padding: '1px 7px', color: C.green }}>
                    {savedIds.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── INLINE FILTERS ───────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: C.txtDim, fontWeight: 700, marginBottom: 10 }}>Filters</div>

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

        <div style={{ padding: '12px 14px 16px', flexShrink: 0 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px' }}>
            <div style={{ color: C.green, fontWeight: 700, fontSize: '0.85rem', marginBottom: 6 }}>AI Scouting</div>
            <p style={{ fontSize: '0.74rem', color: C.txtMd, margin: 0, lineHeight: 1.5 }}>
              Advanced AI analysis to find the next generation of football stars.
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: isMobile ? '18px 14px 80px' : '24px 24px 60px', flex: 1 }}>
          {!showGrid ? (
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
                    onClick={() => setSortBy('overall')}
                    style={{ marginTop: 18, padding: '10px 22px', background: C.green, border: 'none', borderRadius: 10, color: '#0d0d0f', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    Explore Players
                  </button>
                </div>
              </section>

              {/* AI Picks For You */}
              <section style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: C.txt }}>AI Picks For You</h2>
                  <button onClick={() => setNavSection('search-all')} style={{ background: 'none', border: 'none', color: C.txtMd, cursor: 'pointer', fontSize: '0.85rem' }}>View All</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 14 }}>
                  {aiPicks.map(p => (
                    <CompactCard key={p.id} player={p} tall={true} onClick={() => selectPlayer(p)} isSaved={savedIds.includes(p.id)} onSaveToggle={onSaveToggle} />
                  ))}
                </div>
              </section>

              {/* Recently Added */}
              <section style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: C.txt }}>Recently Added</h2>
                  <button onClick={() => setNavSection('search-all')} style={{ background: 'none', border: 'none', color: C.txtMd, cursor: 'pointer', fontSize: '0.85rem' }}>View All</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 12 }}>
                  {recentAdds.map(p => (
                    <CompactCard key={p.id} player={p} tall={false} onClick={() => selectPlayer(p)} isSaved={savedIds.includes(p.id)} onSaveToggle={onSaveToggle} />
                  ))}
                </div>
              </section>

              {/* Trending Searches */}
              <section>
                <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 600, color: C.txt }}>Trending Searches</h3>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {TRENDING.map(t => (
                    <button
                      key={t} onClick={() => setSearch(t)}
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
            /* GRID VIEW */
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: C.txt }}>
                    {navSection === 'shortlist' ? 'Shortlist' : search ? `"${search}"` : 'All Players'}
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: C.txtDim, marginTop: 2 }}>{filtered.length} of {allPlayers.length} players</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} style={{ padding: '7px 12px', borderRadius: 9, background: 'transparent', border: `1px solid ${C.border}`, color: C.txtMd, cursor: 'pointer', fontSize: '0.78rem' }}>
                      Clear filters
                    </button>
                  )}
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '7px 12px', borderRadius: 9, background: '#131315', border: `1px solid ${C.border}`, color: C.txt, cursor: 'pointer', fontSize: '0.82rem', outline: 'none' }}>
                    <option value="overall">Top Score</option>
                    <option value="aiMatch">AI Fit</option>
                    <option value="age">Youngest</option>
                    <option value="name">A-Z</option>
                  </select>
                </div>
              </div>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: C.txtDim }}>
                  <div style={{ fontSize: '2rem', marginBottom: 12 }}>O</div>
                  <div style={{ fontWeight: 600, color: C.txtMd, marginBottom: 8 }}>No players found</div>
                  <button onClick={clearFilters} style={{ padding: '8px 18px', borderRadius: 10, background: '#131315', border: `1px solid ${C.border}`, color: C.txtMd, cursor: 'pointer', fontSize: '0.84rem', marginTop: 6 }}>
                    Clear filters
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '155px' : '195px'}, 1fr))`, gap: 14 }}>
                  {filtered.map(p => (
                    <CompactCard key={p.id} player={p} tall={true} onClick={() => selectPlayer(p)} isSaved={savedIds.includes(p.id)} onSaveToggle={onSaveToggle} />
                  ))}
                </div>
              )}
            </>
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
        />
      )}
    </div>
  );
}
