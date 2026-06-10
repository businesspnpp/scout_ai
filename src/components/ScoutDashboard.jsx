/**
 * ScoutDashboard.jsx
 */
import { useState, useMemo, useCallback } from 'react';
import { mockPlayers, getPositionGroup } from '../data/mockPlayers.js';
import PlayerCard from './PlayerCard.jsx';
import PlayerModal from './PlayerModal.jsx';

const POS_GROUPS = [
  { label: 'Attackers',   positions: ['ST', 'CAM'] },
  { label: 'Wingers',     positions: ['RW', 'LW'] },
  { label: 'Midfielders', positions: ['CM', 'CDM'] },
  { label: 'Defenders',   positions: ['CB', 'RB', 'LB'] },
  { label: 'Goalkeeper',  positions: ['GK'] },
];

function buildLocalPlayer(meta, urls = {}) {
  const pos   = meta.position ?? 'ST';
  const group = getPositionGroup(pos);
  const rawMet = meta.analysis?.metrics ?? {};
  const metrics = {};
  group.keys.forEach(k => { metrics[k] = rawMet[k] ?? 70; });
  const videoUrl = urls.videoUrl ?? meta.videoUrl ?? '';
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
    reels: { highlight: videoUrl, ...Object.fromEntries(group.keys.map(k => [k, videoUrl])) },
    headshot: urls.headshotUrl || '',
    clipUrls: urls.clipUrls ?? [],
    _local: true,
  };
}

export default function ScoutDashboard({
  onOpenLightbox, savedIds, onSaveToggle, newProfile,
  localProfiles = [], blobUrls = {},
}) {
  const [search,       setSearch]       = useState('');
  const [posFilter,    setPosFilter]    = useState(new Set());
  const [regionFilter, setRegionFilter] = useState('');
  const [ageMax,       setAgeMax]       = useState(30);
  const [scoreMin,     setScoreMin]     = useState(0);
  const [sortBy,       setSortBy]       = useState('overall');
  const [savedOnly,    setSavedOnly]    = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
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
    <div style={{ paddingTop: 64, minHeight: '100vh', display: 'flex' }}>

      {/* sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 260 : 0,
          minWidth: sidebarOpen ? 260 : 0,
          overflowX: 'hidden',
          transition: 'width 0.22s ease, min-width 0.22s ease',
          borderRight: '1px solid #2e3040',
          background: '#1d1f27',
          position: 'sticky', top: 64,
          height: 'calc(100vh - 64px)',
          overflowY: 'auto',
          flexShrink: 0,
          zIndex: 10,
        }}
        className="custom-scroll"
      >
        <div style={{ padding: '20px 16px', minWidth: 228 }}>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#50535f', marginBottom: 18 }}>Filters</div>

          <FilterGroup label="Search">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#50535f', fontSize: '0.90rem', pointerEvents: 'none' }}>&#8981;</span>
              <input className="input-base" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, country, club" style={{ paddingLeft: 30 }} />
            </div>
          </FilterGroup>

          <FilterGroup label="Position">
            {POS_GROUPS.map(grp => (
              <div key={grp.label} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: '0.68rem', color: '#50535f', marginBottom: 5 }}>{grp.label}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {grp.positions.map(pos => <PosPill key={pos} pos={pos} active={posFilter.has(pos)} onClick={() => togglePos(pos)} />)}
                </div>
              </div>
            ))}
          </FilterGroup>

          <FilterGroup label="Region">
            <select className="input-base" value={regionFilter} onChange={e => setRegionFilter(e.target.value)} style={{ fontSize: '0.84rem' }}>
              <option value="">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </FilterGroup>

          <FilterGroup label={`Max Age ${ageMax}`}>
            <input type="range" min={16} max={30} value={ageMax} onChange={e => setAgeMax(Number(e.target.value))} style={{ width: '100%', accentColor: '#3ecf70' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#50535f', marginTop: 4 }}><span>16</span><span>30</span></div>
          </FilterGroup>

          <FilterGroup label={`Min Score ${scoreMin}`}>
            <input type="range" min={0} max={95} step={5} value={scoreMin} onChange={e => setScoreMin(Number(e.target.value))} style={{ width: '100%', accentColor: '#3ecf70' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#50535f', marginTop: 4 }}><span>0</span><span>95</span></div>
          </FilterGroup>

          <FilterGroup label="">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.84rem', color: '#8c909f' }}>
              <div
                onClick={() => setSavedOnly(x => !x)}
                style={{
                  width: 36, height: 20, borderRadius: 3,
                  background: savedOnly ? '#3ecf70' : '#2e3040',
                  border: savedOnly ? '1px solid rgba(62,207,112,0.30)' : '1px solid #3a3f54',
                  position: 'relative', cursor: 'pointer',
                  transition: 'background 0.16s ease', flexShrink: 0,
                }}
              >
                <div style={{ position: 'absolute', top: 2, left: savedOnly ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.16s ease' }} />
              </div>
              Shortlisted only
            </label>
          </FilterGroup>

          {hasActiveFilters && (
            <button className="btn-ghost" onClick={clearFilters} style={{ width: '100%', marginTop: 8, fontSize: '0.80rem' }}>Clear All Filters</button>
          )}
        </div>
      </aside>

      {/* main */}
      <main style={{ flex: 1, minWidth: 0, padding: '20px 20px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <button className="btn-ghost" onClick={() => setSidebarOpen(x => !x)} style={{ marginBottom: 12, padding: '7px 12px', fontSize: '0.80rem' }}>
              {sidebarOpen ? 'Hide Filters' : 'Show Filters'}
            </button>
            <div style={{ fontSize: '0.70rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#50535f' }}>BeOrchid Africa 2026</div>
            <h1 className="font-syne" style={{ fontSize: 'clamp(1.4rem,3vw,2.0rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 4 }}>
              Discover <span style={{ color: '#3ecf70' }}>African</span> Talent
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <select className="input-base" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto', minWidth: 160, fontSize: '0.84rem' }}>
              <option value="overall">Sort: Overall</option>
              <option value="aiMatch">Sort: AI Match</option>
              <option value="age">Sort: Youngest</option>
              <option value="name">Sort: Name A-Z</option>
            </select>
            <span style={{ fontSize: '0.85rem', color: '#50535f' }}>
              Showing <strong style={{ color: '#f0f1f3' }}>{filtered.length}</strong> of {allPlayers.length}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
          {[
            { label: 'Active Profiles', value: allPlayers.length },
            { label: 'Countries',       value: new Set(allPlayers.map(p => p.country)).size },
            { label: 'Avg Score',       value: (allPlayers.reduce((s,p)=>s+p.overall,0)/allPlayers.length).toFixed(1) },
            { label: 'Positions',       value: new Set(allPlayers.map(p => p.pos)).size },
          ].map(s => (
            <div key={s.label} style={{ background: '#23252f', border: '1px solid #2e3040', borderRadius: 8, padding: '10px 14px' }}>
              <div className="font-syne" style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.01em' }}>{s.value}</div>
              <div style={{ fontSize: '0.70rem', color: '#50535f', letterSpacing: '0.10em', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>


        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.70rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#50535f' }}>Scout Database</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ border: '1px dashed #3a3f54', borderRadius: 10, padding: '52px 20px', textAlign: 'center', background: '#23252f' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: 10, opacity: 0.3 }}>&#9673;</div>
            <div className="font-syne" style={{ fontWeight: 800, color: '#f0f1f3', marginBottom: 6 }}>No players match your filters</div>
            <div style={{ color: '#50535f', marginBottom: 16 }}>Try broadening the search criteria.</div>
            <button className="btn-ghost" onClick={clearFilters}>Clear Filters</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14, alignItems: 'start' }}>
            {filtered.map((p, i) => (
              <PlayerCard key={p.id} player={p} onOpenLightbox={onOpenLightbox} onSaveToggle={onSaveToggle} isSaved={savedIds.includes(p.id)} animDelay={Math.min(i * 0.04, 0.4)} onClick={() => setSelectedPlayer(p)} />
            ))}
          </div>
        )}
      </main>

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onOpenLightbox={onOpenLightbox}
          isSaved={savedIds.includes(selectedPlayer.id)}
          onSaveToggle={onSaveToggle}
        />
      )}
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {label && <div style={{ fontSize: '0.70rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: '#50535f', marginBottom: 8 }}>{label}</div>}
      {children}
    </div>
  );
}

function PosPill({ pos, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', borderRadius: 3, fontSize: '0.76rem', fontWeight: 600,
        border: active ? '1px solid rgba(62,207,112,0.30)' : '1px solid #2e3040',
        background: active ? 'rgba(62,207,112,0.07)' : '#1d1f27',
        color: active ? '#f0f1f3' : '#8c909f',
        cursor: 'pointer', transition: 'all 0.12s ease',
      }}
    >{pos}</button>
  );
}

function buildInjectedPlayer(result) {
  const pos = result.player?.position ?? 'ST';
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
    reels: { highlight: '' }, headshot: '', _injected: true,
  };
}