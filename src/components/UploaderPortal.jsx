import { useState, useRef, useCallback, useEffect } from 'react';
import { analyzePlayer } from '../services/geminiService.js';
import { processHighlightsInstant, processHighlightsShotstack, loadFFmpeg } from '../services/clipService.js';
import { validateHeadshotFile, validateVideoFile, validatePlayerForm } from '../services/validate.js';
import PortalTelemetry    from './uploader/PortalTelemetry.jsx';
import AnalysisStatusCard from './uploader/AnalysisStatusCard.jsx';
import { SyncBadge, ShotstackBadge } from './uploader/StatusBadges.jsx';
import { Label, Field, InfoCard }    from './uploader/FormAtoms.jsx';
import useBreakpoint from '../hooks/useBreakpoint.js';

export default function UploaderPortal({
  onAnalysisComplete, onSaveProfile, onAppendVideo, onGoToScout,
  localProfiles = [], blobUrls = {}, onRemoveProfile, onUpdateProfileClips,
}) {
  const [form,             setForm]             = useState({ name: '', age: '', region: '', position: 'ST', height: '', foot: 'Right', club: '' });
  const [headshot,         setHeadshot]         = useState(null);
  const [headshotPreview,  setHeadshotPreview]  = useState(null);
  const [videoFiles,       setVideoFiles]       = useState([]);
  const [videoUrl,         setVideoUrl]         = useState('');
  const [videoMode,        setVideoMode]        = useState('file');
  const [phase,            setPhase]            = useState('idle');  // idle|analyzing|cutting|done
  const [streamOutput,     setStreamOutput]     = useState('');
  const [cuttingProgress,  setCuttingProgress]  = useState(null);
  const [result,           setResult]           = useState(null);
  const [metricClips,      setMetricClips]      = useState([]);
  const [error,            setError]            = useState('');
  const [syncStatus,       setSyncStatus]       = useState('idle');
  const [headshotWarn,     setHeadshotWarn]     = useState('');
  const [uploadInfo,       setUploadInfo]       = useState(null);   // { startMs, totalMB } when uploading
  const [uploadPct,        setUploadPct]        = useState(0);
  const [shotstackStatus,  setShotstackStatus]  = useState(null); // null|'submitting'|'rendering'|'done'|'failed'
  const [shotstackDone,    setShotstackDone]    = useState(0);   // count of clips done
  const [shotstackTotal,   setShotstackTotal]   = useState(0);
  const savedProfileIdRef  = useRef(null);  const [editingId,        setEditingId]        = useState(null);
  const [targetProfileId,  setTargetProfileId]  = useState(null); // null = new player; string = append to existing
  const { isMobile } = useBreakpoint();

  const headshotRef  = useRef(null);
  const videoRef     = useRef(null);
  const streamBoxRef = useRef(null);

  // Preload FFmpeg WASM as soon as the uploader mounts so it's ready before the user hits Analyze
  useEffect(() => {
    loadFFmpeg().catch(err => console.warn('[UploaderPortal] FFmpeg preload failed:', err?.message || err));
  }, []);

  const handleForm = useCallback(e => setForm(f => ({ ...f, [e.target.name]: e.target.value })), []);

  const handleHeadshot = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateHeadshotFile(file);
    if (err) { setError(err); return; }
    setHeadshotWarn('');
    const url = URL.createObjectURL(file);
    setHeadshot(file);
    setHeadshotPreview(url);
    // Check resolution - Gemini needs a clear, visible face
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth < 200 || img.naturalHeight < 200) {
        setHeadshotWarn(`Low resolution (${img.naturalWidth}x${img.naturalHeight}px). Use a clearer photo for better AI tracking accuracy.`);
      } else if (img.naturalWidth < 400 || img.naturalHeight < 400) {
        setHeadshotWarn('Photo quality is acceptable but a higher resolution image will improve player identification.');
      }
    };
    img.src = url;
  };

  const addVideoFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateVideoFile(file);
    if (err) { setError(err); e.target.value = ''; return; }
    setVideoFiles(prev => [...prev, file]);
    e.target.value = '';
  };

  const removeVideoFile = idx => setVideoFiles(prev => prev.filter((_, i) => i !== idx));

  useEffect(() => {
    if (streamBoxRef.current) streamBoxRef.current.scrollTop = streamBoxRef.current.scrollHeight;
  }, [streamOutput]);

  // Revoke clip preview URLs on unmount
  useEffect(() => {
    return () => { metricClips.forEach(c => { if (c.url?.startsWith('blob:')) URL.revokeObjectURL(c.url); }); };
  }, [metricClips]);

  // Detect upload phase from stream markers
  useEffect(() => {
    if (!streamOutput) return;
    const match = streamOutput.match(/Uploading video.*?\(([0-9.]+) MB\)|Uploading video/);
    const mbMatch = streamOutput.match(/([0-9.]+) MB/);
    if (streamOutput.includes('Uploading video') && !uploadInfo) {
      const totalMB = mbMatch ? parseFloat(mbMatch[1]) : 20;
      setUploadInfo({ startMs: Date.now(), totalMB });
      setUploadPct(0);
    }
    if (streamOutput.includes('Running analysis')) {
      setUploadPct(1);
      setTimeout(() => { setUploadInfo(null); setUploadPct(0); }, 800);
    }
  }, [streamOutput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick estimated upload progress
  useEffect(() => {
    if (!uploadInfo) return;
    const { startMs, totalMB } = uploadInfo;
    const estSecs = Math.max(20, totalMB / 0.6); // assume ~600 KB/s upload
    const id = setInterval(() => {
      const elapsed = (Date.now() - startMs) / 1000;
      setUploadPct(Math.min(0.93, elapsed / estSecs));
    }, 500);
    return () => clearInterval(id);
  }, [uploadInfo]);

  const loadProfile = meta => {
    setEditingId(meta.id);
    setForm({ name: meta.name || '', age: meta.age || '', region: meta.region || '', position: meta.position || 'ST', height: meta.height || '', foot: meta.foot || 'Right', club: meta.club || '' });
    const urls = blobUrls[meta.id] ?? {};
    if (urls.headshotUrl) setHeadshotPreview(urls.headshotUrl);
    setHeadshot(null); setVideoFiles([]); setVideoUrl(meta.videoUrl || '');
    setResult(null); setError(''); setStreamOutput('');
    setMetricClips([]); setCuttingProgress(null); setPhase('idle');
    setShotstackStatus(null); setShotstackDone(0); setShotstackTotal(0);
    savedProfileIdRef.current = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearEdit = () => {
    setEditingId(null);
    setForm({ name: '', age: '', region: '', position: 'ST', height: '', foot: 'Right', club: '' });
    setHeadshot(null); setHeadshotPreview(null); setHeadshotWarn('');
    setVideoFiles([]); setVideoUrl('');
    setResult(null); setError(''); setStreamOutput('');
    setMetricClips([]); setCuttingProgress(null); setPhase('idle');
  };

  async function handleAnalyze() {
    const formErrors = validatePlayerForm(form);
    if (formErrors.length > 0) { setError(formErrors[0]); return; }
    setError(''); setResult(null); setStreamOutput(''); setMetricClips([]);
    setCuttingProgress(null); setPhase('analyzing');

    // Capture old profile for score merging BEFORE removal
    const oldProfile  = editingId ? localProfiles.find(p => p.id === editingId) : null;
    const oldAnalysis = oldProfile?.analysis;

    try {
      // If editing and no new headshot was uploaded, fetch the existing one as a File
      // so Gemini receives actual image data (headshot state is null for existing CDN/blob URLs)
      let headshotForAnalysis = headshot;
      if (!headshotForAnalysis && headshotPreview) {
        try {
          const resp = await fetch(headshotPreview);
          const blob = await resp.blob();
          headshotForAnalysis = new File([blob], 'headshot.jpg', { type: blob.type || 'image/jpeg' });
          console.log('[gemini] fetched existing headshot for analysis:', (blob.size/1024).toFixed(1), 'KB');
        } catch (e) {
          console.warn('[gemini] could not fetch existing headshot:', e.message);
        }
      }

      // -- Phase 1: Gemini analysis --
      let analysisResult = await analyzePlayer(
        { name: form.name, age: form.age, position: form.position, region: form.region, height: form.height, foot: form.foot, club: form.club, id: editingId ?? undefined },
        videoMode === 'file' ? videoFiles : [],
        videoMode === 'url'  ? videoUrl   : '',
        headshotForAnalysis,
        token => setStreamOutput(prev => prev + token),
      );

      // -- Merge scores if re-analysing existing player --
      if (oldAnalysis) {
        const allKeys = [...new Set([...Object.keys(oldAnalysis.metrics ?? {}), ...Object.keys(analysisResult.metrics ?? {})])];
        const merged = {};
        allKeys.forEach(k => {
          const o = oldAnalysis.metrics?.[k] ?? 0;
          const n = analysisResult.metrics?.[k] ?? 0;
          merged[k] = o && n ? Math.round((o + n) / 2) : o || n;
        });
        analysisResult = {
          ...analysisResult,
          metrics:           merged,
          overallScore:      Math.round(((oldAnalysis.overallScore ?? 0) + analysisResult.overallScore) / 2),
          aiMatchConfidence: Math.round(((oldAnalysis.aiMatchConfidence ?? 0) + analysisResult.aiMatchConfidence) / 2),
          _analysisCount:    (oldAnalysis._analysisCount ?? 1) + 1,
        };
      }

      setResult(analysisResult);

      // -- Phase 2: Instant clips via media fragments (no FFmpeg/WASM needed) --
      let cuts = [];
      if (videoMode === 'file' && videoFiles.length > 0 && analysisResult.highlights?.length > 0) {
        cuts = processHighlightsInstant(videoFiles, analysisResult.highlights);
        setMetricClips(cuts);
      }

      setPhase('done');
      setSyncStatus('saving');

      // Capture existing headshot URL BEFORE removing old profile (editing without new headshot)
      const existingHeadshotUrl  = (editingId && !headshot)
        ? (blobUrls[editingId]?.headshotUrl ?? null)
        : null;
      const existingHeadshotPath = (editingId && !headshot)
        ? (localProfiles.find(p => p.id === editingId)?._headshotPath ?? null)
        : null;

      // Track saved profile ID for Shotstack upgrade
      const savedHighlights   = [...analysisResult.highlights];
      const savedVideoFiles   = [...videoFiles];

      if (targetProfileId && onAppendVideo) {
        // ── Append video to existing player ──────────────────────────────────
        onAppendVideo({
          targetId:   targetProfileId,
          videoFile:  videoMode === 'file' && videoFiles.length > 0 ? videoFiles[0] : null,
          videoUrl:   videoMode === 'url' ? videoUrl : '',
          analysis:   analysisResult,
          metricClips: cuts,
          onSyncProgress: prog => {
            const status = typeof prog === 'string' ? prog : prog?.status;
            setSyncStatus(status);
            const vidUrl = typeof prog === 'object' ? prog.videoPublicUrl : null;
            if (status === 'done' && vidUrl && savedHighlights.length > 0) {
              setShotstackStatus('submitting');
              setShotstackTotal(savedHighlights.length);
              processHighlightsShotstack([vidUrl], savedHighlights, ss => {
                if (ss.phase === 'submitting') setShotstackStatus('submitting');
                if (ss.phase === 'rendering' || ss.phase === 'polling') setShotstackStatus('rendering');
                if (ss.phase === 'rendering') setShotstackDone(d => d + 1);
              })
                .then(shotstackClips => {
                  if (shotstackClips.length > 0) {
                    setShotstackStatus('done');
                    setShotstackDone(shotstackClips.length);
                    setMetricClips(shotstackClips.map(c => ({ ...c })));
                    if (targetProfileId && onUpdateProfileClips) onUpdateProfileClips(targetProfileId, shotstackClips);
                  } else {
                    setShotstackStatus('failed');
                  }
                })
                .catch(err => { console.warn('[UploaderPortal] Shotstack failed:', err.message); setShotstackStatus('failed'); });
            }
          },
        }).then(meta => {
          if (meta?.id) savedProfileIdRef.current = meta.id;
        }).catch(() => setSyncStatus('error'));
      } else if (onSaveProfile) {
        onSaveProfile({
          formData:          { ...form, _videoFileName: videoFiles[0]?.name ?? null },
          headshotFile:      headshot,
          existingHeadshotUrl,
          existingHeadshotPath,
          videoFile:    videoMode === 'file' && videoFiles.length > 0 ? videoFiles[0] : null,
          videoUrl:     videoMode === 'url' ? videoUrl : '',
          analysis:     analysisResult,
          metricClips:  cuts,
          onSyncProgress: prog => {
            const status = typeof prog === 'string' ? prog : prog?.status;
            setSyncStatus(status);

            // When Supabase has the video public URL ? kick off Shotstack cloud renders
            const vidUrl = typeof prog === 'object' ? prog.videoPublicUrl : null;
            if (status === 'done' && vidUrl && savedHighlights.length > 0) {
              setShotstackStatus('submitting');
              setShotstackTotal(savedHighlights.length);
              // Run Shotstack in background, non-blocking
              processHighlightsShotstack([vidUrl], savedHighlights, ss => {
                if (ss.phase === 'submitting') setShotstackStatus('submitting');
                if (ss.phase === 'rendering' || ss.phase === 'polling') setShotstackStatus('rendering');
                if (ss.phase === 'rendering') setShotstackDone(d => d + 1);
              })
                .then(shotstackClips => {
                  if (shotstackClips.length > 0) {
                    setShotstackStatus('done');
                    setShotstackDone(shotstackClips.length);
                    setMetricClips(shotstackClips.map(c => ({ ...c })));
                    // Update stored profile clips to CDN URLs
                    const profId = savedProfileIdRef.current;
                    if (profId && onUpdateProfileClips) onUpdateProfileClips(profId, shotstackClips);
                  } else {
                    setShotstackStatus('failed');
                  }
                })
                .catch(err => {
                  console.warn('[UploaderPortal] Shotstack failed:', err.message);
                  setShotstackStatus('failed');
                });
            }
          },
        }).then(meta => {
          // Remove old profile only if this is a genuine re-analysis of the same player
          const editingProfile = editingId ? localProfiles.find(p => p.id === editingId) : null;
          const isReallyEditing = editingProfile && editingProfile.name?.trim() === form.name?.trim();
          if (isReallyEditing) onRemoveProfile?.(editingId, { skipHeadshotDelete: true });
          if (meta?.id) savedProfileIdRef.current = meta.id;
        }).catch(() => setSyncStatus('error'));
      }
      onAnalysisComplete?.(analysisResult, cuts);
    } catch (err) {
      setError('Analysis failed. Please try again.');
      setPhase('idle');
      console.error(err);
    }
  }

  async function handleSaveChanges() {
    if (!form.name.trim() || !editingId) return;
    setSyncStatus('saving');
    const oldProfile = localProfiles.find(p => p.id === editingId);
    const existingHeadshotUrl  = !headshot ? (blobUrls[editingId]?.headshotUrl ?? null) : null;
    const existingHeadshotPath = !headshot ? (oldProfile?._headshotPath ?? null) : null;
    try {
      const meta = await onSaveProfile?.({
        formData: form,
        headshotFile: headshot,
        existingHeadshotUrl,
        existingHeadshotPath,
        videoFile: null,
        videoUrl: oldProfile?.videoUrl || '',
        analysis: oldProfile?.analysis ?? null,
        metricClips: oldProfile?.metricClips ?? [],
        onSyncProgress: prog => {
          const status = typeof prog === 'string' ? prog : prog?.status;
          setSyncStatus(status);
        },
      });
      if (editingId) onRemoveProfile?.(editingId, { skipHeadshotDelete: true });
      if (meta?.id) { setEditingId(meta.id); savedProfileIdRef.current = meta.id; }
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch { setSyncStatus('error'); }
  }

  const addMoreFootage = () => {
    // Route the next analysis as an append to the just-saved profile
    if (savedProfileIdRef.current) setTargetProfileId(savedProfileIdRef.current);
    setResult(null); setError(''); setStreamOutput(''); setMetricClips([]);
    setCuttingProgress(null); setPhase('idle');
    setShotstackStatus(null); setShotstackDone(0); setShotstackTotal(0);
    savedProfileIdRef.current = null;
    setVideoFiles([]); setVideoUrl(''); setError('');
  };

  const analyzing = phase === 'analyzing';
  const cutting   = phase === 'cutting';

  return (
    <div style={{ minHeight: '100vh', paddingTop: 62, paddingBottom: 60, background: 'transparent' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '0 12px' : '0 20px' }}>

        {/* -- Saved Profiles Table -- */}
        {localProfiles.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4a5568' }}>Profile Management</div>
                <div className="font-syne" style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: 2 }}>Saved Profiles</div>
              </div>
              <span style={{ fontSize: '0.76rem', color: '#4a5568' }}>{localProfiles.length} profile{localProfiles.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ border: '1px solid #2e3040', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '32px 1fr 68px' : '36px 1fr 72px 56px 140px 88px', padding: '7px 12px', background: '#1d1f27', borderBottom: '1px solid #2e3040' }}>
                {(isMobile ? ['', 'Player', ''] : ['', 'Player', 'Pos', 'Age', 'Region', '']).map((h, i) => (
                  <div key={i} style={{ fontSize: '0.64rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: '#4a5568' }}>{h}</div>
                ))}
              </div>
              {localProfiles.map((meta, i) => {
                const urls = blobUrls[meta.id] ?? {};
                const isEditing = editingId === meta.id;
                const clipCount = meta.metricClips?.length ?? 0;
                return (
                  <div key={meta.id}
                    style={{ display: 'grid', gridTemplateColumns: isMobile ? '32px 1fr 68px' : '36px 1fr 72px 56px 140px 88px', padding: isMobile ? '9px 12px' : '9px 14px', alignItems: 'center', borderBottom: i < localProfiles.length - 1 ? '1px solid #2e3040' : 'none', background: isEditing ? 'rgba(62,207,112,0.04)' : '#23252f', cursor: 'pointer', transition: 'background 0.10s' }}
                    onMouseEnter={e => !isEditing && (e.currentTarget.style.background = '#2a2d38')}
                    onMouseLeave={e => !isEditing && (e.currentTarget.style.background = '#23252f')}
                    onClick={() => isEditing ? clearEdit() : loadProfile(meta)}
                  >
                    <div style={{ width: 26, height: 26, borderRadius: 6, background: '#2a2d38', border: '1px solid #3a3f54', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.58rem', color: '#50535f' }}>
                      {urls.headshotUrl ? <img src={urls.headshotUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (meta.name?.slice(0, 2).toUpperCase() || '--')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: isEditing ? '#3ecf70' : '#f0f1f3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.name || 'Unnamed'}</div>
                      <div style={{ fontSize: '0.70rem', color: '#4a5568' }}>
                        {isMobile ? (meta.position || '') : (
                          <>{clipCount > 0 && <span style={{ color: '#3ecf70', marginRight: 6 }}>? {clipCount} clips</span>}{meta.createdAt ? new Date(meta.createdAt).toLocaleDateString() : ''}</>
                        )}
                      </div>
                    </div>
                    {!isMobile && <div style={{ fontSize: '0.76rem', color: '#7e8fa3', fontFamily: 'JetBrains Mono, monospace' }}>{meta.position || '-'}</div>}
                    {!isMobile && <div style={{ fontSize: '0.76rem', color: '#7e8fa3' }}>{meta.age || '-'}</div>}
                    {!isMobile && <div style={{ fontSize: '0.76rem', color: '#7e8fa3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.region || '-'}</div>}
                    <div style={{ display: 'flex', gap: 5, justifyContent: isMobile ? 'flex-end' : 'flex-start' }}>
                      <button onClick={e => { e.stopPropagation(); isEditing ? clearEdit() : loadProfile(meta); }} style={{ fontSize: '0.70rem', padding: '2px 7px', borderRadius: 5, border: isEditing ? '1px solid rgba(62,207,112,0.30)' : '1px solid #3a3f54', background: '#1d1f27', color: isEditing ? '#3ecf70' : '#8c909f', cursor: 'pointer' }}>
                        {isEditing ? 'Cancel' : 'Edit'}
                      </button>
                      {!isMobile && <button onClick={e => { e.stopPropagation(); if (editingId === meta.id) clearEdit(); onRemoveProfile?.(meta.id); }} style={{ fontSize: '0.70rem', padding: '2px 7px', borderRadius: 2, border: '1px solid #222225', background: '#0d0d0f', color: '#c94f4f', cursor: 'pointer' }}>Del</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* -- Form header -- */}
        <div style={{ marginBottom: 24 }}>
          {editingId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#00c853' }}>Editing Profile</span>
              <button onClick={clearEdit} style={{ fontSize: '0.70rem', padding: '2px 8px', borderRadius: 2, border: '1px solid #222225', background: '#0d0d0f', color: '#4a5568', cursor: 'pointer' }}>+ New Profile</button>
            </div>
          ) : (
            <div style={{ fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4a5568', marginBottom: 6 }}>BeOrchid Africa 2026</div>
          )}
          <h1 className="font-syne" style={{ fontSize: 'clamp(1.3rem,3vw,1.9rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {editingId ? 'Update Player Profile' : 'Add New Player Profile'}
          </h1>
        </div>

        {/* -- Attach to existing player? -- */}
        {localProfiles.length > 0 && !editingId && (
          <div style={{ background: '#131920', border: '1px solid #1e1e21', borderRadius: 4, padding: '14px 22px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#8c909f', flexShrink: 0 }}>Add video to:</span>
            <select
              value={targetProfileId ?? ''}
              onChange={e => {
                const val = e.target.value || null;
                setTargetProfileId(val);
                if (val) {
                  const p = localProfiles.find(x => x.id === val);
                  if (p) setForm({ name: p.name || '', age: String(p.age || ''), region: p.region || '', position: p.position || 'ST', height: p.height || '', foot: p.foot || 'Right', club: p.club || '' });
                } else {
                  setForm({ name: '', age: '', region: '', position: 'ST', height: '', foot: 'Right', club: '' });
                }
              }}
              style={{ flex: 1, minWidth: 160, height: 36, borderRadius: 6, background: '#0d0d0f', border: '1px solid #222225', color: '#f0f1f3', fontSize: '0.82rem', padding: '0 10px', cursor: 'pointer' }}
            >
              <option value="">＋ New Player</option>
              {localProfiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name || 'Unnamed'} ({p.position || '?'}) — {(p.videos?.length ?? 0) + 1} video{(p.videos?.length ?? 0) >= 1 ? 's' : ''}
                </option>
              ))}
            </select>
            {targetProfileId && (
              <button onClick={() => { setTargetProfileId(null); setForm({ name: '', age: '', region: '', position: 'ST', height: '', foot: 'Right', club: '' }); }}
                style={{ fontSize: '0.70rem', padding: '4px 10px', borderRadius: 4, border: '1px solid #222225', background: 'transparent', color: '#8c909f', cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>
        )}

        {/* -- Player Details -- */}
        <div style={{ background: '#131920', border: '1px solid #1e1e21', borderRadius: 4, padding: '18px 22px', marginBottom: 12 }}>
          <Label>Player Details</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginTop: 12 }}>
            <Field label="Full Name *">
              <input className="input-base" name="name" value={form.name} onChange={handleForm} placeholder="e.g. Celestin Kamdem" autoComplete="off" />
            </Field>
            <Field label="Age">
              <input className="input-base" name="age" value={form.age} onChange={handleForm} type="number" min={14} max={35} placeholder="e.g. 18" />
            </Field>
            <Field label="Position">
              <select className="input-base" name="position" value={form.position} onChange={handleForm}>
                {['ST','CAM','CM','CDM','RW','LW','CB','RB','LB','GK'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Region / City, Country">
              <input className="input-base" name="region" value={form.region} onChange={handleForm} placeholder="e.g. Lagos, Nigeria" autoComplete="off" />
            </Field>
            <Field label="Current Club / Academy">
              <input className="input-base" name="club" value={form.club} onChange={handleForm} placeholder="e.g. Bamako United FC" autoComplete="off" />
            </Field>
            <Field label="Height">
              <input className="input-base" name="height" value={form.height} onChange={handleForm} placeholder="e.g. 182cm" autoComplete="off" />
            </Field>
            <Field label="Preferred Foot">
              <select className="input-base" name="foot" value={form.foot} onChange={handleForm}>
                <option value="Right">Right</option>
                <option value="Left">Left</option>
                <option value="Both">Both</option>
              </select>
            </Field>
          </div>
        </div>

        {/* -- Reference Photo -- */}
        <div style={{ background: '#131920', border: '1px solid #1e1e21', borderRadius: 4, padding: '18px 22px', marginBottom: 12 }}>
          <Label>Reference Photo</Label>
          <p style={{ fontSize: '0.78rem', color: '#4a5568', marginTop: 4, marginBottom: 12 }}>Sent to Gemini to identify and track this player in footage</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div onClick={() => headshotRef.current?.click()} style={{ width: 74, height: 74, borderRadius: 3, background: '#0d0d0f', border: headshotPreview ? '1px solid rgba(0,200,83,0.30)' : '1px solid #222225', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {headshotPreview ? <img src={headshotPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#222225', fontSize: '1.4rem' }}>+</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="btn-ghost" onClick={() => headshotRef.current?.click()}>
                {headshotPreview ? 'Replace Photo' : 'Upload Photo'}
              </button>
              <div style={{ fontSize: '0.70rem', color: '#4a5568' }}>Clear, front-facing photo &mdash; min 200&times;200px</div>
              {headshotWarn && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 2, padding: '6px 10px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 4, maxWidth: 340 }}>
                  <span style={{ color: '#c9a84c', fontSize: '0.75rem', flexShrink: 0, marginTop: 1 }}>&#9888;</span>
                  <span style={{ fontSize: '0.72rem', color: '#c9a84c', lineHeight: 1.4 }}>{headshotWarn}</span>
                </div>
              )}
            </div>
            <input ref={headshotRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleHeadshot} />
          </div>
        </div>

        {/* -- Match Footage -- */}
        <div style={{ background: '#131920', border: '1px solid #1e1e21', borderRadius: 4, padding: '18px 22px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Label>Match Footage</Label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['file', 'url'].map(m => (
                <button key={m} onClick={() => setVideoMode(m)} style={{ padding: '4px 10px', borderRadius: 2, border: videoMode === m ? '1px solid rgba(0,200,83,0.30)' : '1px solid #1e1e21', background: videoMode === m ? 'rgba(0,200,83,0.06)' : 'transparent', color: videoMode === m ? '#dde3ec' : '#4a5568', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>
                  {m === 'file' ? 'File Upload' : 'Video URL'}
                </button>
              ))}
            </div>
          </div>
          {videoMode === 'file' ? (
            <>
              {videoFiles.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  {videoFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', background: '#0d0d0f', border: '1px solid #1e1e21', borderRadius: 2, marginBottom: 5 }}>
                      <span style={{ fontSize: '0.66rem', color: '#4a5568', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>Clip {i + 1}</span>
                      <span style={{ flex: 1, fontSize: '0.82rem', color: '#dde3ec', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize: '0.74rem', color: '#4a5568', flexShrink: 0 }}>{(f.size/1024/1024).toFixed(1)} MB</span>
                      <button onClick={() => removeVideoFile(i)} style={{ fontSize: '0.70rem', padding: '1px 6px', borderRadius: 2, border: '1px solid #222225', background: 'transparent', color: '#c94f4f', cursor: 'pointer', flexShrink: 0 }}>&times;</button>
                    </div>
                  ))}
                </div>
              )}
              <div
                onClick={() => videoRef.current?.click()}
                style={{ border: '1px dashed #222225', borderRadius: 3, padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#0d0d0f' }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#334257'; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = '#222225'; }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#222225'; const f = e.dataTransfer.files?.[0]; if (!f) return; const err = validateVideoFile(f); if (err) { setError(err); return; } setVideoFiles(prev => [...prev, f]); }}
              >
                <div style={{ color: '#4a5568', fontSize: '0.84rem', marginBottom: 3 }}>{videoFiles.length > 0 ? '+ Add another clip' : 'Drop video or click to browse'}</div>
                <div style={{ color: '#222225', fontSize: '0.72rem' }}>MP4, MOV, AVI &mdash; Recommended under 45 MB for best speed &mdash; larger files are auto-compressed</div>
              </div>
              <input ref={videoRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={addVideoFile} />
            </>
          ) : (
            <Field label="Direct Video URL">
              <input className="input-base" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://... (direct .mp4 link)" autoComplete="off" />
              <div style={{ fontSize: '0.72rem', color: '#4a5568', marginTop: 5 }}>Note: auto-cutting requires file upload. URL mode = analysis only.</div>
            </Field>
          )}
        </div>

        {error && (
          <div style={{ background: '#1a0f0f', border: '1px solid rgba(201,79,79,0.25)', borderRadius: 3, padding: '9px 13px', fontSize: '0.84rem', color: '#e05252', marginBottom: 12 }}>{error}</div>
        )}

        {phase === 'idle' && !result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {editingId && (
              <button className="btn-primary" onClick={handleSaveChanges} disabled={syncStatus === 'saving'} style={{ width: '100%', fontSize: '0.92rem', padding: '12px 20px', background: 'transparent', border: '1px solid rgba(62,207,112,0.4)', color: '#3ecf70' }}>
                  {syncStatus === 'saving' ? 'Saving...' : syncStatus === 'done' ? 'Saved ✓' : 'Save Changes'}
              </button>
            )}
            <button className="btn-primary" onClick={handleAnalyze} disabled={!form.name.trim()} style={{ width: '100%', fontSize: '0.92rem', padding: '12px 20px' }}>
              {editingId ? 'Re-analyze & Update' : `Analyze${videoFiles.length > 0 ? ` (${videoFiles.length} clip${videoFiles.length > 1 ? 's' : ''})` : ''}`}
            </button>
          </div>
        )}

        {/* -- Analysis Status Card -- */}
        {(analyzing || (streamOutput && !result)) && (
          <AnalysisStatusCard
            streamOutput={streamOutput}
            analyzing={analyzing}
            uploadInfo={uploadInfo}
            uploadPct={uploadPct}
          />
        )}

        {/* -- Cutting Progress -- */}
        {cutting && (
          <div style={{ marginTop: 12, background: '#131920', border: '1px solid #1e1e21', borderRadius: 4, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c9a84c', animation: 'pulse 1.2s ease-in-out infinite' }} />
              <span style={{ fontSize: '0.70rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c9a84c' }}>
                {cuttingProgress?.phase === 'loading' ? 'Preparing' : 'Extracting Highlight Clips'}
              </span>
            </div>
            {cuttingProgress?.phase === 'cutting' && (
              <>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', marginBottom: 6 }}>
                    <span style={{ color: '#dde3ec', textTransform: 'capitalize' }}>{cuttingProgress.metric}</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#7e8fa3' }}>{cuttingProgress.start} - {cuttingProgress.end}</span>
                  </div>
                  <div style={{ height: 3, background: '#0d0d0f', borderRadius: 2 }}>
                    <div style={{ height: '100%', borderRadius: 2, background: '#c9a84c', width: `${(cuttingProgress.current / cuttingProgress.total) * 100}%`, transition: 'width 0.3s ease' }} />
                  </div>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#4a5568' }}>Clip {cuttingProgress.current} of {cuttingProgress.total}</div>
              </>
            )}
          </div>
        )}

        {/* -- Result -- */}
        {result && phase === 'done' && (
          <div style={{ marginTop: 12 }}>
            <div style={{ background: '#0d1a14', border: '1px solid rgba(0,200,83,0.20)', borderRadius: 3, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div className="font-syne" style={{ fontWeight: 700, fontSize: '0.98rem', color: '#dde3ec' }}>
                  {editingId ? 'Profile Updated' : 'Analysis Complete'} &mdash; {result.player?.name ?? form.name}
                  {result._analysisCount > 1 && <span style={{ marginLeft: 8, fontSize: '0.72rem', color: '#c9a84c' }}>({result._analysisCount} sessions avg)</span>}
                </div>
                <div style={{ marginTop: 3, fontSize: '0.80rem', color: '#4a5568' }}>
                  Score <strong style={{ color: '#00c853' }}>{result.overallScore}</strong>
                  &nbsp;&middot;&nbsp; Confidence <strong style={{ color: '#00c853' }}>{result.aiMatchConfidence}%</strong>
            {metricClips.length > 0 && <span style={{ marginLeft: 8, color: '#c9a84c' }}>&#10022; {metricClips.length} clips</span>}
                  {shotstackStatus && metricClips[0]?.source !== 'ffmpeg' && <ShotstackBadge status={shotstackStatus} done={shotstackDone} total={shotstackTotal} />}
                  {result._isMock && <span style={{ marginLeft: 8, color: '#c9a84c', fontSize: '0.70rem' }}>demo mode</span>}
                </div>
              </div>
              <SyncBadge status={syncStatus} />
            </div>

            {/* Metric scores */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {Object.entries(result.metrics ?? {}).map(([key, val]) => (
                <div key={key} style={{ padding: '5px 10px', borderRadius: 2, border: '1px solid #1e1e21', background: '#131920', fontSize: '0.78rem', display: 'flex', gap: 7, alignItems: 'center' }}>
                  <span style={{ color: '#4a5568', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <strong style={{ color: val >= 85 ? '#00c853' : val >= 75 ? '#c9a84c' : '#7e8fa3', fontFamily: 'JetBrains Mono, monospace' }}>{val}</strong>
                </div>
              ))}
            </div>

            {/* Metric Clips - inline video players */}
            {metricClips.length > 0 && (
              <div style={{ background: '#131920', border: '1px solid #1e1e21', borderRadius: 3, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Label>Metric Clips &mdash; Auto-cut &amp; Saved to Profile</Label>
                  <span style={{ fontSize: '0.68rem', color: metricClips[0]?.source === 'shotstack' ? '#c9a84c' : '#00c853' }}>
                    {metricClips[0]?.source === 'shotstack' ? '&#9654; Shotstack CDN' : '&#9654; FFmpeg local'} &mdash; {metricClips.length} clips
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                  {metricClips.map((clip, i) => (
                    <div key={i} style={{ border: '1px solid #1e1e21', borderRadius: 3, overflow: 'hidden', background: '#0d0d0f' }}>
                      <div style={{ padding: '8px 10px', borderBottom: '1px solid #1e1e21', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: 2, background: 'rgba(0,200,83,0.08)', border: '1px solid rgba(0,200,83,0.18)', color: '#00c853', textTransform: 'capitalize' }}>{clip.metric}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#7e8fa3' }}>{clip.start} &ndash; {clip.end}</span>
                      </div>
                      <div className="tracker-pulse" style={{ position: 'relative', background: '#000', overflow: 'hidden' }}>
                        <video src={clip.url} controls preload="auto" style={{ width: '100%', display: 'block', background: '#000', maxHeight: 200 }} />
                        {/* scanline */}
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(62,207,112,0.016) 2px, rgba(62,207,112,0.016) 3px)' }} />
                        {/* corners */}
                        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
                          <div key={v+h} style={{ position: 'absolute', width: 10, height: 10, pointerEvents: 'none',
                            [v]: v === 'bottom' ? 26 : 6, [h]: 6,
                            [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]: '1px solid rgba(180,185,200,0.30)',
                            [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]: '1px solid rgba(180,185,200,0.30)',
                          }} />
                        ))}
                        {/* badge */}
                        <div style={{ position: 'absolute', top: 7, left: 18, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(7,8,10,0.72)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, padding: '2px 6px' }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(175,180,195,0.70)', display: 'inline-block', animation: 'termBlink 1.8s step-end infinite' }} />
                          <span style={{ fontSize: '0.50rem', fontWeight: 600, letterSpacing: '0.09em', color: 'rgba(175,180,195,0.70)', fontFamily: 'monospace' }}>ANALYTICS STREAM: ACTIVE</span>
                        </div>
                        {/* telemetry bar */}
                        <PortalTelemetry metric={clip.metric} />
                      </div>
                      {clip.description && <div style={{ padding: '6px 10px', fontSize: '0.76rem', color: '#4a5568', lineHeight: 1.4 }}>{clip.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamp References - hidden from end users, data still used for clip cutting
            {result.highlights?.length > 0 && metricClips.length === 0 && (
              <div style={{ background: '#131920', border: '1px solid #1e1e21', borderRadius: 3, padding: '14px 16px', marginBottom: 14 }}>
                <Label>Timestamp References</Label>
                {result.highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: i < result.highlights.length - 1 ? '1px solid #1e1e21' : 'none' }}>
                    <div style={{ flexShrink: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.76rem' }}>
                      <span style={{ color: '#00c853' }}>{h.timestampStart}</span>
                      <span style={{ color: '#222225', margin: '0 4px' }}>?</span>
                      <span style={{ color: '#c9a84c' }}>{h.timestampEnd}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: 2, background: 'rgba(0,200,83,0.08)', border: '1px solid rgba(0,200,83,0.18)', color: '#00c853', marginRight: 8, textTransform: 'capitalize' }}>{h.metric}</span>
                      <span style={{ fontSize: '0.84rem', color: '#7e8fa3' }}>{h.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            */}

            {/* Scout notes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 14 }}>
              <InfoCard label="Scout Notes" value={result.scoutNotes} />
              <InfoCard label="Potential" value={result.potential} accent />
              <InfoCard label="Valuation" value={result.valuationBracket} />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn-ghost" onClick={addMoreFootage} style={{ flex: 1, minWidth: 160 }}>+ Add More Footage</button>
              <button className="btn-ghost" onClick={clearEdit}      style={{ flex: 1, minWidth: 160 }}>+ New Profile</button>
              <button className="btn-primary" onClick={() => onGoToScout?.()} style={{ flex: 1, minWidth: 160 }}>View in Scout Intelligence</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Label, Field, InfoCard, SyncBadge, ShotstackBadge are imported from ./uploader/
