// clipService.js
// handles video clip cutting - instant browser clips + Shotstack cloud renders
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// converts MM:SS or HH:MM:SS to plain seconds
export function parseToSeconds(ts) {
  if (!ts) return 0;
  const parts = String(ts).split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseFloat(ts) || 0;
}

// FFmpeg WASM - loaded from public/ffmpeg/ so it works offline
const LOCAL_BASE = '/ffmpeg';

// Returns a freshly loaded FFmpeg instance.
// A new instance (new Worker) is created every time to avoid stale/crashed worker state.
async function createFFmpeg() {
  const instance = new FFmpeg();
  await instance.load({
    coreURL: `${LOCAL_BASE}/ffmpeg-core.js`,
    wasmURL: `${LOCAL_BASE}/ffmpeg-core.wasm`,
  });
  return instance;
}

// Keep one shared instance for clip cutting (lightweight, rarely fails)
let ffmpeg = null;
let ffmpegLoaded = false;

export async function loadFFmpeg() {
  if (ffmpegLoaded && ffmpeg) return;
  ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: `${LOCAL_BASE}/ffmpeg-core.js`,
    wasmURL: `${LOCAL_BASE}/ffmpeg-core.wasm`,
  });
  ffmpegLoaded = true;
}

export async function cutClipFFmpeg(videoFile, start, end, outputName) {
  await loadFFmpeg();
  await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
  await ffmpeg.exec(['-ss', start, '-to', end, '-i', 'input.mp4', '-c', 'copy', '-avoid_negative_ts', '1', outputName]);
  const data = await ffmpeg.readFile(outputName);
  const blob = new Blob([data], { type: 'video/mp4' });
  await ffmpeg.deleteFile('input.mp4').catch(() => {});
  await ffmpeg.deleteFile(outputName).catch(() => {});
  return blob;
}

/** Run FFmpeg on all highlights - immediate, works with local File objects */
export async function processHighlightsFFmpeg(videoFiles, highlights, onProgress) {
  onProgress?.({ phase: 'loading', message: 'Loading FFmpeg WASM…' });
  await loadFFmpeg();
  const results = [];
  for (let i = 0; i < highlights.length; i++) {
    const h = highlights[i];
    const start = h.timestampStart ?? h.timestamp;
    const end   = h.timestampEnd   ?? h.timestamp;
    if (!start || !end) continue;
    const fileIdx = Math.max(0, (h.clipIndex ?? 1) - 1);
    const file = videoFiles[fileIdx] ?? videoFiles[0];
    if (!file) continue;
    onProgress?.({ phase: 'cutting', current: i + 1, total: highlights.length, metric: h.metric, start, end });
    const safeName = (h.metric ?? `m${i}`).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    try {
      const blob = await cutClipFFmpeg(file, start, end, `cut_${i + 1}_${safeName}.mp4`);
      results.push({ index: i, metric: h.metric, clipIndex: h.clipIndex ?? 1, start, end, description: h.description ?? '', blob, name: `${safeName}_${i + 1}.mp4`, source: 'ffmpeg' });
    } catch (err) {
      console.warn(`[clipService/ffmpeg] clip ${i + 1} failed:`, err.message);
    }
  }
  return results;
}

/**
 * Instant clip extraction using HTML5 media fragments (#t=start,end).
 * No WASM, no encoding - browser seeks natively. Works with local File objects.
 */
export function processHighlightsInstant(videoFiles, highlights) {
  // One blob URL per source file (reused across clips)
  const fileUrls = videoFiles.map(f => URL.createObjectURL(f));
  const results = [];
  for (let i = 0; i < highlights.length; i++) {
    const h = highlights[i];
    const start = h.timestampStart ?? h.timestamp;
    const end   = h.timestampEnd   ?? h.timestamp;
    if (!start || !end) continue;
    const fileIdx = Math.max(0, (h.clipIndex ?? 1) - 1);
    const baseUrl = fileUrls[fileIdx] ?? fileUrls[0];
    if (!baseUrl) continue;
    const startSec = parseToSeconds(start);
    const endSec   = parseToSeconds(end);
    results.push({
      index: i,
      metric: h.metric,
      clipIndex: h.clipIndex ?? 1,
      start,
      end,
      startSec,
      endSec,
      description: h.description ?? '',
      url: `${baseUrl}#t=${startSec},${endSec}`,
      source: 'instant',
    });
  }
  return results;
}

/** Compress a video file to 720p/CRF28 before uploading to Gemini.
 *  Turns a 70MB clip into ~8–15 MB with no meaningful quality loss for AI analysis.
 *  @param {File} file
 *  @param {(msg:string)=>void} onProgress
 *  @returns {Promise<File>} compressed File
 */
export async function compressVideoForUpload(file, onProgress) {
  // Use the shared singleton — loading 30MB of WASM on every call takes 1-3 minutes.
  // If the singleton is in a bad state we reset it and reload once.
  await loadFFmpeg();
  const inName  = 'cmp_in.mp4';
  const outName = 'cmp_out.mp4';

  // Clean up any leftover files from a previous crashed run
  await ffmpeg.deleteFile(inName).catch(() => {});
  await ffmpeg.deleteFile(outName).catch(() => {});

  onProgress?.('Writing to memory...');
  await ffmpeg.writeFile(inName, await fetchFile(file));

  // Stream live FFmpeg log lines so the UI shows activity
  const onLog = ({ message }) => {
    if (!message) return;
    const frameMatch = message.match(/frame=\s*(\d+).*fps=\s*([\d.]+)/);
    if (frameMatch) {
      onProgress?.(`Encoding... frame ${frameMatch[1]} @ ${frameMatch[2]} fps`);
    } else if (message.startsWith('frame') || message.includes('time=') || message.includes('speed=')) {
      onProgress?.(message.trim().slice(0, 60));
    }
  };
  ffmpeg.on('log', onLog);

  // 4-minute hard timeout — if FFmpeg hangs, terminate the worker and reset
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    try { ffmpeg.terminate(); } catch { /* ignore */ }
    ffmpegLoaded = false;
    ffmpeg = null;
  }, 4 * 60 * 1000);

  let execError = null;
  try {
    await ffmpeg.exec([
      '-i', inName,
      '-t', '90',                // cap at 90 s — Gemini needs no more for analysis
      '-vf', 'scale=-2:240',     // 240p: fine for AI visual analysis; keeps size well under 2.2 MB
      '-c:v', 'libx264',
      '-crf', '42',              // aggressive but sufficient for Gemini vision analysis
      '-preset', 'ultrafast',
      '-an',                     // no audio — not needed for football analysis
      '-movflags', '+faststart',
      outName,
    ]);
  } catch (err) {
    execError = err;
  } finally {
    clearTimeout(timeoutId);
    if (ffmpeg) ffmpeg.off('log', onLog);
  }

  if (timedOut) {
    throw new Error('Compression timed out. Try a shorter clip.');
  }

  // Always try to read the output — exec may have written a valid file even on non-zero exit
  let data = null;
  try { if (ffmpeg) data = await ffmpeg.readFile(outName); } catch { /* no output written */ }

  if (ffmpeg) {
    await ffmpeg.deleteFile(inName).catch(() => {});
    if (data) await ffmpeg.deleteFile(outName).catch(() => {});
  }

  if (!data || data.byteLength < 1024) {
    // Reset singleton so next call gets a clean instance
    ffmpegLoaded = false;
    ffmpeg = null;
    throw execError ?? new Error('FFmpeg produced no output');
  }

  const blob = new Blob([data.buffer], { type: 'video/mp4' });
  const compressedName = file.name.replace(/(\.[^.]+)?$/, '_compressed.mp4');
  return new File([blob], compressedName, { type: 'video/mp4' });
}

// -- Shotstack cloud API — routed through /api/shotstack/* (server.js) --------
// API key lives server-side only; never exposed to the browser bundle.
const SS_API = '/api/shotstack';

/**
 * Submit a single render job to Shotstack.
 * @param {string} videoPublicUrl - Publicly accessible video URL
 * @param {string} start          - "MM:SS" timestamp
 * @param {string} end            - "MM:SS" timestamp
 * @returns {string} renderId
 */
export async function submitShotstackRender(videoPublicUrl, start, end) {
  const startSec = parseToSeconds(start);
  const length   = Math.max(0.5, parseToSeconds(end) - startSec);

  const res = await fetch(`${SS_API}/render`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeline: {
        tracks: [{
          clips: [{
            asset: { type: 'video', src: videoPublicUrl, trim: startSec },
            start:  0,
            length,
          }],
        }],
      },
      output: { format: 'mp4', resolution: 'hd' },
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => String(res.status));
    throw new Error(`Shotstack submit failed (${res.status}): ${msg}`);
  }
  const text = await res.text();
  if (text.trimStart().startsWith('<')) throw new Error('Shotstack API not configured (received HTML — add SHOTSTACK_API_KEY to Vercel env vars)');
  const data = JSON.parse(text);
  const renderId = data.response?.id;
  if (!renderId) throw new Error('Shotstack: no render ID returned');
  return renderId;
}

/**
 * Poll a Shotstack render until done or failed.
 * @returns {string} CDN URL of the rendered clip
 */
export async function pollShotstackRender(renderId, onStatus) {
  const MAX = 50; // 50 × 4s = 200s max

  for (let i = 0; i < MAX; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const res = await fetch(`${SS_API}/poll/${renderId}`);
    if (!res.ok) throw new Error(`Shotstack poll failed: ${res.status}`);
    const text = await res.text();
    // Detect HTML response = Shotstack API key not configured
    if (text.trimStart().startsWith('<')) throw new Error('Shotstack API not configured (received HTML)');
    const data   = JSON.parse(text);
    const status = data.response?.status;
    onStatus?.(status);
    if (status === 'done') {
      // Try Serve API for permanent CDN URL
      try {
        const serveRes = await fetch(`${SS_API}/serve/${renderId}`);
        if (serveRes.ok) {
          const serveData = await serveRes.json();
          const asset = serveData.data?.find(a => a.attributes?.status === 'ready');
          if (asset?.attributes?.url) return asset.attributes.url;
        }
      } catch {/* fall through to temp URL */}
      return data.response.url;
    }
    if (status === 'failed') throw new Error('Shotstack render failed');
  }
  throw new Error('Shotstack render timed out after 200s');
}

/**
 * Process all highlights via Shotstack cloud rendering.
 * Requires publicly accessible video URLs (e.g. Supabase Storage public URLs).
 * @param {string[]} videoPublicUrls - One URL per uploaded clip (index matches h.clipIndex - 1)
 * @param {object[]} highlights
 * @param {function} onProgress
 * @returns {Array<{metric, start, end, url, source:'shotstack', ...}>}
 */
export async function processHighlightsShotstack(videoPublicUrls, highlights, onProgress) {
  // 1. Submit all render jobs concurrently
  onProgress?.({ phase: 'submitting', total: highlights.length });
  const jobs = [];
  for (let i = 0; i < highlights.length; i++) {
    const h = highlights[i];
    const start = h.timestampStart ?? h.timestamp;
    const end   = h.timestampEnd   ?? h.timestamp;
    if (!start || !end) continue;
    const urlIdx = Math.max(0, (h.clipIndex ?? 1) - 1);
    const src    = videoPublicUrls[urlIdx] ?? videoPublicUrls[0];
    if (!src) continue;
    try {
      onProgress?.({ phase: 'submitting', current: i + 1, total: highlights.length, metric: h.metric });
      const renderId = await submitShotstackRender(src, start, end);
      jobs.push({ renderId, highlight: h, index: i });
    } catch (err) {
      console.warn(`[clipService/shotstack] submit failed for ${h.metric}:`, err.message);
    }
  }

  // 2. Poll each render job
  const results = [];
  for (const job of jobs) {
    const { renderId, highlight, index } = job;
    try {
      onProgress?.({ phase: 'rendering', metric: highlight.metric, renderId, done: results.length, total: jobs.length });
      const url = await pollShotstackRender(renderId, status => {
        onProgress?.({ phase: 'polling', status, metric: highlight.metric });
      });
      results.push({
        index,
        metric:      highlight.metric,
        clipIndex:   highlight.clipIndex ?? 1,
        start:       highlight.timestampStart ?? highlight.timestamp,
        end:         highlight.timestampEnd   ?? highlight.timestamp,
        description: highlight.description ?? '',
        url,
        source:      'shotstack',
        name:        `${(highlight.metric ?? 'clip').replace(/\s+/g, '_')}_${index + 1}.mp4`,
      });
    } catch (err) {
      console.warn(`[clipService/shotstack] render failed for ${highlight.metric}:`, err.message);
    }
  }
  return results;
}

// -- Combined � FFmpeg now, Shotstack later ------------------------------------
/** Alias kept for backward compatibility � runs FFmpeg only */
export const processHighlights = processHighlightsFFmpeg;