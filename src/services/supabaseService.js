// supabaseService.js
// all the database and storage calls for profiles, headshots, videos

import { supabase, BUCKET, TABLE, isSupabaseEnabled } from './supabaseClient.js';

// upload a file to Supabase storage and return the public URL
async function uploadToStorage(storagePath, fileOrBlob, contentType) {
  if (!isSupabaseEnabled || !fileOrBlob) return null;
  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileOrBlob, { contentType, upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return { path: storagePath, publicUrl: data.publicUrl };
  } catch (err) {
    console.error('[supabaseService] storage upload failed:', err.message);
    return null;
  }
}

/** Compress a headshot File → JPEG Blob → upload */
async function compressToJpeg(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = evt => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 400;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
          else       { w = Math.round((w * MAX) / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.88);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadHeadshot(profileId, file) {
  try {
    const compressed = await compressToJpeg(file);
    return uploadToStorage(`${profileId}/headshot.jpg`, compressed, 'image/jpeg');
  } catch (err) {
    console.error('[supabaseService] headshot compression failed:', err.message);
    return uploadToStorage(`${profileId}/headshot.jpg`, file, file.type || 'image/jpeg');
  }
}

export async function uploadVideo(profileId, file) {
  const ext  = file.name.split('.').pop()?.toLowerCase() || 'mp4';
  const mime = file.type || 'video/mp4';
  return uploadToStorage(`${profileId}/video.${ext}`, file, mime);
}

// ── Database helpers ──────────────────────────────────────────────────────────

/** Insert or upsert a single profile row */
export async function saveProfileRow(row) {
  if (!isSupabaseEnabled) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .upsert([row], { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[supabaseService] DB insert error:', err.message);
    return null;
  }
}

/** Patch specific columns on an existing row (e.g. add URLs after upload) */
export async function updateProfileRow(id, patch) {
  if (!isSupabaseEnabled) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[supabaseService] DB update error:', err.message);
    return null;
  }
}

/** Fetch all profiles, newest first */
export async function fetchProfiles() {
  if (!isSupabaseEnabled) return [];
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error('[supabaseService] fetch error:', err.message);
    return [];
  }
}

/** Delete a DB row and its Storage files */
export async function deleteProfile(id, headshotPath, videoPath) {
  if (!isSupabaseEnabled) return;
  try {
    await supabase.from(TABLE).delete().eq('id', id);
    const paths = [headshotPath, videoPath].filter(Boolean);
    if (paths.length) {
      await supabase.storage.from(BUCKET).remove(paths);
    }
  } catch (err) {
    console.error('[supabaseService] delete error:', err.message);
  }
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

/**
 * saveFullProfile
 * 1. Insert a skeleton row immediately (so the ID is reserved in DB)
 * 2. Upload headshot → get public URL → patch row
 * 3. Upload video   → get public URL → patch row
 *
 * This means the video URL is saved back to the profile once uploaded,
 * linking the media file in Storage directly to the player record in DB.
 *
 * @returns {{ headshotPublicUrl, videoPublicUrl, dbRow }}
 */
export async function saveFullProfile({
  profileId,
  formData,
  headshotFile,
  existingHeadshotUrl = null,  // carry over existing CDN URL when editing without a new file
  videoFile,
  videoUrl,   // external URL (YouTube/TikTok) when no file
  analysis,
  metricClips = [],  // timestamps + metrics — persisted in analysis_json._clips
}) {
  if (!isSupabaseEnabled) {
    return { headshotPublicUrl: null, videoPublicUrl: videoUrl || null, dbRow: null };
  }

  // ── Step 1: Insert skeleton row ──────────────────────────────────────────
  const skeleton = {
    id:                   profileId,
    name:                 formData.name?.trim() || 'Unknown',
    age:                  parseInt(formData.age) || null,
    position:             formData.position || null,
    region:               formData.region?.trim() || null,
    overall_score:        analysis?.overallScore         ?? null,
    ai_match_confidence:  analysis?.aiMatchConfidence    ?? null,
    analysis_json:        analysis ? { ...analysis, _clips: metricClips } : (metricClips.length ? { _clips: metricClips } : null),
    headshot_url:         null,
    headshot_path:        null,
    video_url:            (!videoFile && videoUrl) ? videoUrl : null,
    video_path:           null,
    video_file_name:      videoFile?.name  ?? null,
    video_file_size:      videoFile?.size  ?? null,
    is_video_external:    !videoFile && !!videoUrl,
  };

  await saveProfileRow(skeleton);

  // ── Step 2: Upload headshot → patch URL ──────────────────────────────────
  let headshotPublicUrl = null;
  if (headshotFile) {
    const hs = await uploadHeadshot(profileId, headshotFile);
    if (hs) {
      headshotPublicUrl = hs.publicUrl;
      await updateProfileRow(profileId, {
        headshot_url:  hs.publicUrl,
        headshot_path: hs.path,
      });
    }
  } else if (existingHeadshotUrl && !existingHeadshotUrl.startsWith('blob:')) {
    // Editing with an existing CDN URL - carry it over to the new row
    headshotPublicUrl = existingHeadshotUrl;
    await updateProfileRow(profileId, { headshot_url: existingHeadshotUrl });
  }

  // ── Step 3: Upload video → patch URL (links video back to profile) ───────
  let videoPublicUrl = (!videoFile && videoUrl) ? videoUrl : null;
  if (videoFile) {
    const vid = await uploadVideo(profileId, videoFile);
    if (vid) {
      videoPublicUrl = vid.publicUrl;
      await updateProfileRow(profileId, {
        video_url:  vid.publicUrl,
        video_path: vid.path,
      });
    }
  }

  return { headshotPublicUrl, videoPublicUrl, dbRow: skeleton };
}

// ── Row → local meta converter ────────────────────────────────────────────────
/** Converts a Supabase DB row into the shape used by useLocalProfiles */
export function rowToLocalMeta(row) {
  const analysisJson = row.analysis_json ?? null;
  // Strip internal _clips key so analysis object stays clean
  let analysis = null;
  if (analysisJson) {
    const { _clips: _ignored, ...rest } = analysisJson;
    analysis = Object.keys(rest).length ? rest : null;
  }
  return {
    id:           row.id,
    createdAt:    row.created_at,
    name:         row.name,
    age:          row.age,
    position:     row.position,
    region:       row.region,
    hasHeadshot:  !!row.headshot_url,
    hasVideo:     !!(row.video_url || row.video_path),
    videoFileName: row.video_file_name,
    videoFileSize: row.video_file_size,
    videoUrl:      row.video_url,
    analysis,
    metricClips:   row.analysis_json?._clips ?? [],
    // Storage paths for deletion
    _headshotPath: row.headshot_path,
    _videoPath:    row.video_path,
    _fromSupabase: true,
  };
}

/**
 * Persist updated metric clips back to Supabase by merging into analysis_json._clips.
 * Called after Shotstack CDN clips arrive or any clip update.
 */
export async function patchProfileClips(profileId, allClips, existingAnalysis) {
  if (!isSupabaseEnabled) return;
  try {
    await updateProfileRow(profileId, {
      analysis_json: { ...(existingAnalysis ?? {}), _clips: allClips },
    });
  } catch (err) {
    console.warn('[supabaseService] patchProfileClips failed:', err.message);
  }
}
