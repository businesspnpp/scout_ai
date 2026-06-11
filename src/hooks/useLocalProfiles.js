import { useState, useEffect, useCallback, useRef } from 'react';
import { isSupabaseEnabled }    from '../services/supabaseClient.js';
import {
  saveFullProfile,
  fetchProfiles,
  deleteProfile as supabaseDelete,
  rowToLocalMeta,
} from '../services/supabaseService.js';
import { storeBlob, getBlob, deleteBlob } from '../services/dbService.js';

const LS_KEY = 'scout-ai-profiles-v1';

// converts MM:SS to seconds - needed to store clip timestamps
function toSec(ts) {
  if (!ts) return 0;
  const parts = String(ts).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseFloat(ts) || 0;
}

function loadMeta()         { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function saveMeta(profiles) { try { localStorage.setItem(LS_KEY, JSON.stringify(profiles)); } catch {} }

function compressImageToBlob(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload  = evt => {
      const img = new Image();
      img.onerror = reject;
      img.onload  = () => {
        const MAX = 300;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
          else       { w = Math.round((w * MAX) / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.85);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function useLocalProfiles() {
  const [profiles, setProfilesRaw] = useState([]);
  const [blobUrls, setBlobUrls]    = useState({});
  const [loading,  setLoading]     = useState(true);
  const urlsRef = useRef({});

  const setProfiles = useCallback(updater => {
    setProfilesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveMeta(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      setLoading(true);

      if (isSupabaseEnabled) {
        const rows = await fetchProfiles();
        if (!cancelled && rows.length > 0) {
          // Keep clip metadata from localStorage so it doesn't get wiped by Supabase hydration
          const localMetas = loadMeta();
          const localById  = Object.fromEntries(localMetas.map(m => [m.id, m]));

          const metas = rows.map(row => ({
            ...rowToLocalMeta(row),
            metricClips: localById[row.id]?.metricClips ?? [],
          }));

          const urls = {};
          rows.forEach(row => {
            const entry = {};
            if (row.headshot_url) entry.headshotUrl = row.headshot_url;
            if (row.video_url)    entry.videoUrl    = row.video_url;
            // Rebuild instant clip URLs using the Supabase video URL
            const savedClips = localById[row.id]?.metricClips ?? [];
            if (row.video_url && savedClips.length > 0) {
              entry.clipUrls = savedClips.map(c => {
                if (c.source === 'instant') {
                  return { ...c, url: `${row.video_url}#t=${c.startSec ?? 0},${c.endSec ?? 0}` };
                }
                return c; // Shotstack CDN or blob key - handled elsewhere
              }).filter(c => c.url);
            }
            if (Object.keys(entry).length) urls[row.id] = entry;
          });

          urlsRef.current = urls;
          setProfilesRaw(metas);
          saveMeta(metas);
          setBlobUrls(urls);
          setLoading(false);
          return;
        }
      }

      const metas = loadMeta();
      const urls  = {};
      for (const meta of metas) {
        const entry = {};
        if (meta.hasHeadshot && !meta._fromSupabase) {
          const blob = await getBlob(`${meta.id}-headshot`).catch(() => null);
          if (blob && !cancelled) entry.headshotUrl = URL.createObjectURL(blob);
        }
        if (meta.hasVideo && !meta._fromSupabase) {
          const blob = await getBlob(`${meta.id}-video`).catch(() => null);
          if (blob && !cancelled) entry.videoUrl = URL.createObjectURL(blob);
        } else if (meta.videoUrl) {
          entry.videoUrl = meta.videoUrl;
        }
        // Load metric clips
        if (meta.metricClips?.length > 0) {
          const clipUrls = [];
          for (const clipMeta of meta.metricClips) {
            if (clipMeta.url && !clipMeta.url.startsWith('blob:')) {
              // Shotstack CDN or external URL - use as-is
              clipUrls.push(clipMeta);
            } else if (clipMeta.source === 'instant') {
              // Rebuild fragment URL from the video we just loaded above
              const base = entry.videoUrl;
              if (base) clipUrls.push({ ...clipMeta, url: `${base}#t=${clipMeta.startSec ?? 0},${clipMeta.endSec ?? 0}` });
            } else if (clipMeta.blobKey) {
              const blob = await getBlob(clipMeta.blobKey).catch(() => null);
              if (blob && !cancelled) clipUrls.push({ ...clipMeta, url: URL.createObjectURL(blob) });
            }
          }
          if (clipUrls.length > 0) entry.clipUrls = clipUrls;
        }
        if (Object.keys(entry).length) urls[meta.id] = entry;
      }
      if (!cancelled) {
        urlsRef.current = urls;
        setProfilesRaw(metas);
        setBlobUrls(urls);
        setLoading(false);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
      Object.values(urlsRef.current).forEach(e => {
        if (e?.headshotUrl?.startsWith('blob:')) URL.revokeObjectURL(e.headshotUrl);
        if (e?.videoUrl?.startsWith('blob:'))    URL.revokeObjectURL(e.videoUrl);
        e?.clipUrls?.forEach(c => { if (c.url?.startsWith('blob:')) URL.revokeObjectURL(c.url); });
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addProfile = useCallback(async ({
    formData, headshotFile, existingHeadshotUrl = null, videoFile, videoUrl, analysis,
    metricClips = [],
    onSyncProgress,
  }) => {
    const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let hasHeadshot = false, hasVideo = false;
    const idbEntry = {};

    if (headshotFile) {
      try {
        const blob = await compressImageToBlob(headshotFile);
        await storeBlob(`${id}-headshot`, blob);
        hasHeadshot = true;
        idbEntry.headshotUrl = URL.createObjectURL(blob);
      } catch (e) { console.warn('IDB headshot store failed:', e.message); }
    } else if (existingHeadshotUrl) {
      try {
        if (existingHeadshotUrl.startsWith('blob:')) {
          // Copy local IDB blob to new profile key
          const resp = await fetch(existingHeadshotUrl);
          const blob = await resp.blob();
          await storeBlob(`${id}-headshot`, blob);
          hasHeadshot = true;
          idbEntry.headshotUrl = URL.createObjectURL(blob);
        } else {
          // CDN / Supabase URL — use directly, no IDB needed
          idbEntry.headshotUrl = existingHeadshotUrl;
        }
      } catch (e) { console.warn('IDB headshot copy failed:', e.message); }
    }
    if (videoFile) {
      try {
        await storeBlob(`${id}-video`, videoFile);
        hasVideo = true;
        idbEntry.videoUrl = URL.createObjectURL(videoFile);
      } catch (e) { console.warn('IDB video store failed:', e.message); }
    } else if (videoUrl) {
      idbEntry.videoUrl = videoUrl;
    }

    // Store metric clips
    const clipMetas = [];
    const clipUrlList = [];
    for (let i = 0; i < metricClips.length; i++) {
      const clip = metricClips[i];
      if (clip.blob) {
        // FFmpeg blob path (kept for future use)
        const blobKey = `${id}-clip-${i}`;
        try {
          await storeBlob(blobKey, clip.blob);
          const m = { blobKey, metric: clip.metric, clipIndex: clip.clipIndex ?? 1, start: clip.start, end: clip.end, description: clip.description ?? '', name: clip.name ?? '' };
          clipMetas.push(m);
          clipUrlList.push({ ...m, url: URL.createObjectURL(clip.blob) });
        } catch (e) { console.warn('IDB clip store failed:', e.message); }
      } else if (clip.url) {
        // Instant media-fragment clip - store timestamps, rebuild URL on load
        const startSec = clip.startSec ?? toSec(clip.start);
        const endSec   = clip.endSec   ?? toSec(clip.end);
        const m = { metric: clip.metric, clipIndex: clip.clipIndex ?? 1, start: clip.start, end: clip.end, startSec, endSec, description: clip.description ?? '', source: 'instant' };
        clipMetas.push(m);
        clipUrlList.push({ ...m, url: clip.url }); // valid for this session
      }
    }
    if (clipUrlList.length > 0) idbEntry.clipUrls = clipUrlList;

    const meta = {
      id,
      createdAt:     new Date().toISOString(),
      name:          formData.name?.trim()   || 'Unknown Player',
      age:           formData.age            || '',
      position:      formData.position       || 'ST',
      region:        formData.region?.trim() || '',
      hasHeadshot,
      hasVideo,
      videoUrl:      (!videoFile && videoUrl) ? videoUrl : null,
      videoFileName: videoFile?.name  ?? null,
      videoFileSize: videoFile?.size  ?? null,
      analysis,
      metricClips:   clipMetas,
      _fromSupabase: false,
    };

    setProfiles(prev => [meta, ...prev]);
    urlsRef.current[id] = idbEntry;
    setBlobUrls(prev => ({ ...prev, [id]: idbEntry }));

    if (isSupabaseEnabled) {
      (async () => {
        try {
          onSyncProgress?.('uploading');
          const { headshotPublicUrl, videoPublicUrl } = await saveFullProfile({
            profileId: id, formData, headshotFile, videoFile, videoUrl, analysis,
          });
          // Preserve all local URLs, then overlay Supabase public URLs on top
          const supaEntry = { ...idbEntry };
          if (headshotPublicUrl) supaEntry.headshotUrl = headshotPublicUrl;
          if (videoPublicUrl)    supaEntry.videoUrl    = videoPublicUrl;
          urlsRef.current[id] = supaEntry;
          setBlobUrls(prev => ({ ...prev, [id]: supaEntry }));
          setProfiles(prev => prev.map(p => p.id === id ? { ...p, _fromSupabase: true } : p));
          onSyncProgress?.({ status: 'done', videoPublicUrl: videoPublicUrl ?? null });
        } catch (err) {
          console.error('[useLocalProfiles] Supabase sync failed:', err.message);
          onSyncProgress?.({ status: 'error' });
        }
      })();
    }

    return meta;
  }, [setProfiles]);

  /**
   * Replace/merge clipUrls for a profile (called when Shotstack CDN clips are ready).
   * Shotstack clips override FFmpeg clips for the same metric.
   */
  const updateProfileClips = useCallback((id, shotstackClips) => {
    // Merge: Shotstack replaces FFmpeg clips for matching metrics
    const ssMetrics = new Set(shotstackClips.map(c => c.metric));
    setBlobUrls(prev => {
      const existing = prev[id] ?? {};
      const oldClips = (existing.clipUrls ?? []).filter(c => !ssMetrics.has(c.metric));
      const merged   = [...shotstackClips, ...oldClips];
      urlsRef.current[id] = { ...existing, clipUrls: merged };
      return { ...prev, [id]: { ...existing, clipUrls: merged } };
    });
    // Also persist Shotstack URLs into localStorage meta
    setProfiles(prev => prev.map(p => {
      if (p.id !== id) return p;
      const oldMeta = (p.metricClips ?? []).filter(c => !ssMetrics.has(c.metric));
      const newMeta = [...shotstackClips.map(c => ({ metric: c.metric, start: c.start, end: c.end, url: c.url, description: c.description, source: 'shotstack', name: c.name })), ...oldMeta];
      return { ...p, metricClips: newMeta };
    }));
  }, [setProfiles]);

  const removeProfile = useCallback(async id => {
    const meta  = profiles.find(p => p.id === id);
    const entry = urlsRef.current[id];
    if (entry?.headshotUrl?.startsWith('blob:')) URL.revokeObjectURL(entry.headshotUrl);
    if (entry?.videoUrl?.startsWith('blob:'))    URL.revokeObjectURL(entry.videoUrl);
    entry?.clipUrls?.forEach(c => { if (c.url?.startsWith('blob:')) URL.revokeObjectURL(c.url); });
    delete urlsRef.current[id];
    setBlobUrls(prev => { const n = { ...prev }; delete n[id]; return n; });
    const clipKeys = (meta?.metricClips ?? []).map(c => c.blobKey);
    await Promise.allSettled([
      deleteBlob(`${id}-headshot`),
      deleteBlob(`${id}-video`),
      ...clipKeys.map(k => deleteBlob(k)),
    ]);
    if (isSupabaseEnabled) {
      await supabaseDelete(id, meta?._headshotPath ?? null, meta?._videoPath ?? null);
    }
    setProfiles(prev => prev.filter(p => p.id !== id));
  }, [profiles, setProfiles]);

  const clearAll = useCallback(async () => {
    Object.values(urlsRef.current).forEach(e => {
      if (e?.headshotUrl?.startsWith('blob:')) URL.revokeObjectURL(e.headshotUrl);
      if (e?.videoUrl?.startsWith('blob:'))    URL.revokeObjectURL(e.videoUrl);
      e?.clipUrls?.forEach(c => { if (c.url?.startsWith('blob:')) URL.revokeObjectURL(c.url); });
    });
    urlsRef.current = {};
    setBlobUrls({});
    setProfiles([]);
  }, [setProfiles]);

  return { profiles, blobUrls, loading, addProfile, removeProfile, updateProfileClips, clearAll };
}