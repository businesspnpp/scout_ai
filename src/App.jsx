// App.jsx - root component, holds the main state
import { useState, useCallback } from 'react';
import Navigation      from './components/Navigation.jsx';
import UploaderPortal  from './components/UploaderPortal.jsx';
import ScoutDashboard  from './components/ScoutDashboard.jsx';
import VideoLightbox   from './components/VideoLightbox.jsx';
import ScoutChat       from './components/ScoutChat.jsx';
import { useLocalProfiles } from './hooks/useLocalProfiles.js';

export default function App() {
  const [view,         setView]         = useState('scouter');
  const [lightbox,     setLightbox]     = useState({ open: false, src: '', label: '' });
  const [savedIds,     setSavedIds]     = useState([]);
  const [newProfile,   setNewProfile]   = useState(null);
  const [toast,        setToast]        = useState({ visible: false, msg: '' });
  const [focusPlayer,  setFocusPlayer]  = useState(null);

  // local profile storage
  const { profiles: localProfiles, blobUrls, addProfile, appendVideoToProfile, removeProfile, updateProfileClips } = useLocalProfiles();

  // lightbox for video playback
  const openLightbox = useCallback((src, label) => {
    setLightbox({ open: true, src, label });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox({ open: false, src: '', label: '' });
  }, []);

  // shortlist toggle
  const handleSaveToggle = useCallback(id => {
    setSavedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      showToast(prev.includes(id) ? 'Removed from shortlist' : 'Added to shortlist ★');
      return next;
    });
  }, []);

  // toast notifications
  function showToast(msg) {
    setToast({ visible: true, msg });
    setTimeout(() => setToast({ visible: false, msg: '' }), 2200);
  }

  // called when Gemini finishes the analysis
  const handleAnalysisComplete = useCallback((result, clips = []) => {
    setNewProfile({ ...result, _clips: clips });
    showToast('Analysis complete ✓');
  }, []);

  // append new video to an existing player profile
  const handleAppendVideo = useCallback(async (payload) => {
    return appendVideoToProfile(payload);
  }, [appendVideoToProfile]);

  // save profile locally and sync to Supabase
  const handleSaveProfile = useCallback(async (payload) => {
    const meta = await addProfile({
      ...payload,
      onSyncProgress: prog => {
        const status = typeof prog === 'string' ? prog : prog?.status;
        if (status === 'uploading') showToast('Syncing to Supabase…');
        if (status === 'done')      showToast('Saved to cloud ✓');
        if (status === 'error')     showToast('Cloud sync failed, saved locally');
        // Forward the full progress object so UploaderPortal can start Shotstack
        payload.onSyncProgress?.(prog);
      },
    });
    showToast('Profile cached locally ✓');
    return meta;
  }, [addProfile]);

  return (
    <>
      <Navigation
        view={view}
        setView={setView}
        savedCount={savedIds.length}
        cachedCount={localProfiles.length}
      />

      {/* ── Views ── */}
      {view === 'uploader' && (
        <UploaderPortal
          onAnalysisComplete={handleAnalysisComplete}
          onSaveProfile={handleSaveProfile}
          onAppendVideo={handleAppendVideo}
          onGoToScout={() => setView('scouter')}
          localProfiles={localProfiles}
          blobUrls={blobUrls}
          onRemoveProfile={removeProfile}
          onUpdateProfileClips={updateProfileClips}
        />
      )}

      {view === 'scouter' && (
        <ScoutDashboard
          onOpenLightbox={openLightbox}
          savedIds={savedIds}
          onSaveToggle={handleSaveToggle}
          newProfile={newProfile}
          localProfiles={localProfiles}
          blobUrls={blobUrls}
          onPlayerFocus={setFocusPlayer}
        />
      )}

      {/* ── Video lightbox ── */}
      {lightbox.open && (
        <VideoLightbox
          src={lightbox.src}
          label={lightbox.label}
          onClose={closeLightbox}
        />
      )}

      {/* ── Scout AI Global Chat ── */}
      <ScoutChat
        focusPlayer={focusPlayer}
        localProfiles={localProfiles}
        blobUrls={blobUrls}
        activeView={view}
      />

      {/* Toast */}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 999,
        background: '#23252f', border: '1px solid #3a3f54',
        borderRadius: 8, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
        transform: toast.visible ? 'translateY(0)' : 'translateY(12px)',
        opacity: toast.visible ? 1 : 0,
        pointerEvents: 'none',
        transition: 'transform 0.14s ease, opacity 0.14s ease',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3ecf70', flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: '0.84rem', color: '#f0f1f3' }}>{toast.msg}</span>
      </div>
    </>
  );
}
