/**
 * ScoutDashboard.jsx
 */
import { useState, useMemo, useCallback } from 'react';
import { mockPlayers, getPositionGroup } from '../data/mockPlayers.js';
import PlayerCard from './PlayerCard.jsx';
import PlayerModal from './PlayerModal.jsx';
import useBreakpoint from '../hooks/useBreakpoint.js';

// ── TAC-DARK DESIGN SYSTEM (CHARCOAL & PITCH BLACK) ─────────────────────────
const THEME = {
  colors: {
    bgCanvas: '#0b0c10',      // Deep pitch black application frame
    surfaceCard: '#111217',   // Slate charcoal structural tiles
    surfaceHover: '#17181f',  // Hover elevations
    surfaceAlt: '#07080a',    // Technical data deep inset fields
    borderDim: '#1f2026',     // Thin frame dividers
    borderMid: '#2e303d',     // Structural element lines
    borderActive: '#3ecf70',  // High-visibility green accent
    
    // Performance Accent Framework
    accentHigh: '#3ecf70',    // Electric Pitch Green
    accentMid: '#d4a850',     // Technical Data Amber
    
    // Strict Monochrome Typography
    textMain: '#f0f1f3',      // Off-white main output
    textMuted: '#8c909f',     // Muted steel descriptions
    textDark: '#4e515f'       // Subdued terminal contextual text
  },
  radius: {
    card: '10px',
    element: '4px',
    pill: '2px'
  }
};

const POS_GROUPS = [
  { label: 'Attackers',   positions: ['ST', 'CAM'] },
  { label: 'Wingers',     positions: ['RW', 'LW'] },
  { label: 'Midfielders', positions: ['CM', 'CDM'] },
  { label: 'Defenders',   positions: ['CB', 'RB', 'LB'] },
  { label: 'Goalkeeper',  positions: ['GK'] },
];

function buildLocalPlayer(meta, urls = {}) {
  const pos    = meta.position ?? 'ST';
  const rawMet = meta.analysis?.metrics ?? {};
  const metrics = Object.keys(rawMet).length > 0 ? rawMet : (() => {
    // fallback to group keys if no real metrics
    const group = getPositionGroup(pos);
    const m = {};
    group.keys.forEach(k => { m[k] = 70; });
    return m;
  })();
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
      ...Object.fromEntries(Object.keys(metrics).map(k => [k, clipsByMetric[k] || videoUrl])),
    },
    headshot: urls.headshotUrl || '',
    clipUrls: urls.clipUrls ?? [],
    _local: true,
  };
}

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
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const allPlayers = useMemo(() => {
    const locals = localProfiles.map(m => buildLocalPlayer(m, blobUrls[m.id] ?? {}));
    const base = newProfile ? [buildInjectedPlayer(newProfile), ...mockPlayers] : mockPlayers;
    return [...locals, ...base];
  }, [newProfile, localProfiles, blobUrls]);

  const regions = useMemo(
    () => [...new Set(mockPlayers.map(p => p.region))].sort(),
    []
  );

  const filtered = useMemo(() => {
    let list = allPlayers.filter(p => {
      if (savedOnly && !savedIds.includes(p.id)) return false;
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
  }, [allPlayers, search, posFilter, regionFilter, ageMax, scoreMin, sortBy, savedOnly, savedIds]);

  const togglePos = useCallback(pos => {
    setPosFilter(prev => {
      const next = new Set(prev);
      next.has(pos) ? next.delete(pos) : next.add(pos);
      return next;
    });
  }, []);

  const clearFilters = () => {
    setSearch(''); setPosFilter(new Set()); setRegionFilter('');
    setAgeMax(30); setScoreMin(0); setSavedOnly(false); setSortBy('overall');
  };

  const hasActiveFilters = search || posFilter.size || regionFilter || ageMax < 30 || scoreMin > 0 || savedOnly;

  return (
    <div style={{ background: THEME.colors.bgCanvas, color: THEME.colors.textMain, minHeight: '100vh', display: 'flex' }}>

      {/* Mobile sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 150 }}
        />
      )}

      {/* ── SEARCH & FILTER CONTROL PANEL ───────────────────────────────────── */}
      <aside
        style={{
          width: sidebarOpen ? 280 : 0,
          minWidth: sidebarOpen ? 280 : 0,
          overflowX: 'hidden',
          transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          borderRight: `1px solid ${THEME.colors.borderDim}`,
          background: THEME.colors.surfaceCard,
          ...(isMobile ? {
            position: 'fixed',
            top: 56, left: 0,
            height: 'calc(100vh - 56px)',
            zIndex: 160,
            width: sidebarOpen ? '85vw' : 0,
            minWidth: sidebarOpen ? '85vw' : 0,
            maxWidth: 300,
            overflowY: 'auto',
          } : {
            position: 'sticky', top: 0,
            height: '100vh',
            overflowY: 'auto',
            flexShrink: 0,
            zIndex: 10,
          }),
        }}
        className="custom-scroll"
      >
        <div style={{ padding: '24px 20px', minWidth: 240 }}>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: THEME.colors.textDark, fontWeight: 800, marginBottom: 20 }}>
            Operational Filters
          </div>

          <FilterGroup label="Query Engine">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: THEME.colors.textDark, fontSize: '0.85rem', pointerEvents: 'none' }}>
                &#8981;
              </span>
              <input 
                className="input-base" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Name, country, club..." 
                style={inputStyleBlock({ paddingLeft: 34 })} 
              />
            </div>
          </FilterGroup>

          <FilterGroup label="Tactical Positions">
            {POS_GROUPS.map(grp => (
              <div key={grp.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.65rem', color: THEME.colors.textMuted, marginBottom: 6, fontWeight: 500 }}>{grp.label}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {grp.positions.map(pos => (
                    <PosPill key={pos} pos={pos} active={posFilter.has(pos)} onClick={() => togglePos(pos)} />
                  ))}
                </div>
              </div>
            ))}
          </FilterGroup>

          <FilterGroup label="Geographic Region">
            <select 
              className="input-base" 
              value={regionFilter} 
              onChange={e => setRegionFilter(e.target.value)} 
              style={inputStyleBlock({ fontSize: '0.82rem', appearance: 'none', cursor: 'pointer' })}
            >
              <option value="" style={{ background: THEME.colors.surfaceCard }}>All Regions</option>
              {regions.map(r => (
                <option key={r} value={r} style={{ background: THEME.colors.surfaceCard }}>{r}</option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label={`Age Threshold: Under ${ageMax}`}>
            <input type="range" min={16} max={30} value={ageMax} onChange={e => setAgeMax(Number(e.target.value))} style={rangeStyleBlock()} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: THEME.colors.textDark, marginTop: 6, fontFamily: 'monospace' }}>
              <span>16 YRS</span><span>30 YRS</span>
            </div>
          </FilterGroup>

          <FilterGroup label={`Minimum Assessment Score: ${scoreMin}`}>
            <input type="range" min={0} max={95} step={5} value={scoreMin} onChange={e => setScoreMin(Number(e.target.value))} style={rangeStyleBlock()} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: THEME.colors.textDark, marginTop: 6, fontFamily: 'monospace' }}>
              <span>00</span><span>95</span>
            </div>
          </FilterGroup>

          <FilterGroup label="">
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontSize: '0.82rem', color: THEME.colors.textMuted, userSelect: 'none' }}>
              <div
                onClick={() => setSavedOnly(x => !x)}
                style={{
                  width: 34, height: 18, borderRadius: 10,
                  background: savedOnly ? THEME.colors.accentHigh : THEME.colors.surfaceAlt,
                  border: `1px solid ${savedOnly ? 'rgba(62,207,112,0.3)' : THEME.colors.borderMid}`,
                  position: 'relative', cursor: 'pointer',
                  transition: 'background 0.14s ease', flexShrink: 0,
                }}
              >
                <div style={{ position: 'absolute', top: 2, left: savedOnly ? 18 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.14s ease' }} />
              </div>
              Pipeline Shortlist Only
            </label>
          </FilterGroup>

          {hasActiveFilters && (
            <button 
              onClick={clearFilters} 
              style={{ 
                width: '100%', marginTop: 12, padding: '8px', 
                background: 'transparent', border: `1px solid ${THEME.colors.borderMid}`, 
                color: THEME.colors.textMain, borderRadius: THEME.radius.element, 
                fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, transition: 'all 0.12s' 
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = THEME.colors.textMuted}
              onMouseLeave={e => e.currentTarget.style.borderColor = THEME.colors.borderMid}
            >
              Reset Core Engine Filters
            </button>
          )}
        </div>
      </aside>

      {/* ── MAIN WORKSPACE DASHBOARD CONTENT ──────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '16px 14px 80px' : '24px 24px 60px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Workspace Toolbar Context */}
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: isMobile ? 16 : 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <button 
              onClick={() => setSidebarOpen(x => !x)} 
              style={{ 
                marginBottom: 10, padding: '6px 12px', background: THEME.colors.surfaceCard, 
                border: `1px solid ${THEME.colors.borderDim}`, color: THEME.colors.textMuted, 
                borderRadius: THEME.radius.element, fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500 
              }}
            >
              {sidebarOpen ? (isMobile ? '× Filters' : 'Collapse Side Panel') : (isMobile ? '≣ Filters' : 'Expand Side Panel')}
            </button>
            {!isMobile && <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: THEME.colors.textDark, fontWeight: 700 }}>Scout Pipeline Portal</div>}
            <h1 className="font-syne" style={{ fontSize: isMobile ? '1.3rem' : 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: isMobile ? 0 : 4, color: THEME.colors.textMain }}>
              {isMobile ? <><span style={{ color: THEME.colors.accentHigh }}>African</span> Talent</> : <>Intel Matrix: <span style={{ color: THEME.colors.accentHigh }}>African</span> Talent</>}
            </h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select 
              className="input-base" 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)} 
              style={inputStyleBlock({ width: 'auto', minWidth: isMobile ? 130 : 160, fontSize: '0.82rem', cursor: 'pointer' })}
            >
              <option value="overall" style={{ background: THEME.colors.surfaceCard }}>Top Score</option>
              <option value="aiMatch" style={{ background: THEME.colors.surfaceCard }}>AI Fit</option>
              <option value="age" style={{ background: THEME.colors.surfaceCard }}>Youngest</option>
              <option value="name" style={{ background: THEME.colors.surfaceCard }}>A–Z</option>
            </select>
            {!isMobile && (
              <span style={{ fontSize: '0.82rem', color: THEME.colors.textDark }}>
                <strong style={{ color: THEME.colors.textMain }}>{filtered.length}</strong> of {allPlayers.length}
              </span>
            )}
          </div>
        </div>

        {/* Analytic Macro Counters Segment */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 24 }}>
          {[
            { label: 'Active Ingested Profiles', value: allPlayers.length },
            { label: 'Monitored Regions',        value: new Set(allPlayers.map(p => p.country)).size },
            { label: 'Aggregated Performance Avg', value: (allPlayers.reduce((s,p)=>s+p.overall,0)/allPlayers.length).toFixed(1) },
            { label: 'Isolatable Positions',     value: new Set(allPlayers.map(p => p.pos)).size },
          ].map(s => (
            <div key={s.label} style={{ background: THEME.colors.surfaceCard, border: `1px solid ${THEME.colors.borderDim}`, borderRadius: THEME.radius.card, padding: '12px 16px', flex: '1 1 200px' }}>
              <div className="font-syne" style={{ fontWeight: 800, fontSize: '1.4rem', color: THEME.colors.textMain, letterSpacing: '-0.01em' }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', color: THEME.colors.textDark, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── PLAYER DATABASE DISPLAY MATRIX ───────────────────────────────── */}
        {filtered.length === 0 ? (
          <div style={{ border: `1px dashed ${THEME.colors.borderMid}`, borderRadius: THEME.radius.card, padding: '64px 20px', textAlign: 'center', background: THEME.colors.surfaceCard, margin: 'auto 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12, color: THEME.colors.textDark }}>⊙</div>
            <div className="font-syne" style={{ fontWeight: 700, fontSize: '1.1rem', color: THEME.colors.textMain, marginBottom: 6 }}>Zero Pipeline Hits Registered</div>
            <div style={{ color: THEME.colors.textMuted, fontSize: '0.85rem', marginBottom: 18 }}>Adjust criteria nodes to display matching entries.</div>
            <button 
              style={{ padding: '8px 16px', background: THEME.colors.surfaceAlt, border: `1px solid ${THEME.colors.borderDim}`, color: THEME.colors.textMain, borderRadius: THEME.radius.element, fontSize: '0.80rem', cursor: 'pointer' }}
              onClick={clearFilters}
            >
              Flush Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '100%' : '310px'}, 1fr))`, gap: isMobile ? 10 : 14, alignItems: 'start' }}>
            {filtered.map((p, i) => (
              <PlayerCard 
                key={p.id} 
                player={p} 
                onOpenLightbox={onOpenLightbox} 
                onSaveToggle={onSaveToggle} 
                isSaved={savedIds.includes(p.id)} 
                animDelay={Math.min(i * 0.03, 0.3)} 
                onClick={() => { setSelectedPlayer(p); onPlayerFocus?.(p); }} 
              />
            ))}
          </div>
        )}
      </main>

      {/* Profile Lightbox Context Overlay */}
      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => { setSelectedPlayer(null); onPlayerFocus?.(null); }}
          onOpenLightbox={onOpenLightbox}
          isSaved={savedIds.includes(selectedPlayer.id)}
          onSaveToggle={onSaveToggle}
        />
      )}
    </div>
  );
}

// ── INTERNAL ATOM COMPONENTS & STRUCTURAL MIXINS ───────────────────────────
function FilterGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <div style={{ fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: THEME.colors.textMuted, fontWeight: 700, marginBottom: 8 }}>{label}</div>}
      {children}
    </div>
  );
}

function PosPill({ pos, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 8px', borderRadius: THEME.radius.pill, fontSize: '0.74rem', fontWeight: 600,
        border: `1px solid ${active ? THEME.colors.borderActive : THEME.colors.borderDim}`,
        background: active ? 'rgba(62,207,112,0.06)' : THEME.colors.surfaceAlt,
        color: active ? THEME.colors.textMain : THEME.colors.textMuted,
        cursor: 'pointer', transition: 'all 0.12s ease', outline: 'none'
      }}
    >
      {pos}
    </button>
  );
}

function inputStyleBlock(overrides = {}) {
  return {
    width: '100%',
    background: THEME.colors.surfaceAlt,
    border: `1px solid ${THEME.colors.borderDim}`,
    borderRadius: THEME.radius.element,
    padding: '8px 12px',
    color: THEME.colors.textMain,
    outline: 'none',
    fontSize: '0.85rem',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.12s ease',
    ...overrides
  };
}

function rangeStyleBlock() {
  return {
    width: '100%',
    accentColor: THEME.colors.accentHigh,
    background: THEME.colors.surfaceAlt,
    height: '4px',
    borderRadius: '2px',
    cursor: 'pointer'
  };
}

function buildInjectedPlayer(result) {
  const pos   = result.player?.position ?? 'ST';
  const group = getPositionGroup(pos);

  // normalize Gemini's metric strings to our exact group keys (case/space insensitive)
  const normalize = raw => {
    if (!raw) return raw;
    const clean = raw.toLowerCase().replace(/[\s_-]/g, '');
    return group.keys.find(k => k.toLowerCase() === clean)
      ?? group.keys.find(k => clean.includes(k.toLowerCase()) || k.toLowerCase().includes(clean))
      ?? raw;
  };

  const clipUrls = (result._clips ?? []).map(c => ({
    metric:      normalize(c.metric),
    url:         c.url,
    start:       c.start,
    end:         c.end,
    description: c.description ?? '',
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