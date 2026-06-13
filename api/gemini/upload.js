// api/gemini/upload.js — Vercel serverless function
// Receives a Supabase public URL (JSON body), fetches the video server-side,
// uploads to Gemini Files API, returns the file URI.
// This avoids Vercel's 4.5MB request body limit — the video never passes through here.
// API key lives in Vercel Environment Variables (no VITE_ prefix — never in browser bundle).

import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'No Gemini key configured on server' });

  const { url, mimeType, path } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'No video URL provided' });

  try {
    // Fetch the video from Supabase Storage (outbound fetch — no Vercel body limit)
    console.log('[api/gemini/upload] fetching from:', url);
    const videoRes = await fetch(url);
    if (!videoRes.ok) throw new Error(`Failed to fetch video from storage (${videoRes.status})`);
    const buffer   = Buffer.from(await videoRes.arrayBuffer());
    const mime     = mimeType || videoRes.headers.get('content-type') || 'video/mp4';
    const fileName = (path || 'video').split('/').pop();

    // Upload to Gemini Files API
    const genai  = new GoogleGenAI({ apiKey });
    const blob   = new Blob([buffer], { type: mime });
    const file   = new File([blob], fileName, { type: mime });
    const result = await genai.files.upload({ file, config: { mimeType: mime } });
    console.log('[api/gemini/upload] uploaded to Gemini, uri:', result.uri);

    // Poll until ACTIVE
    const deadline = Date.now() + 300_000;
    while (Date.now() < deadline) {
      const name = result.uri.split('/').pop();
      const info = await genai.files.get({ name });
      if (info.state === 'ACTIVE') {
        // Clean up the temp Supabase file asynchronously (fire and forget)
        if (path && process.env.VITE_PROJECT_URL && process.env.VITE_PUBLISHABLE_KEY) {
          const sb = createClient(process.env.VITE_PROJECT_URL, process.env.VITE_PUBLISHABLE_KEY);
          sb.storage.from('profiles').remove([path]).catch(e => console.warn('[api/gemini/upload] cleanup failed:', e.message));
        }
        return res.json({ uri: result.uri, mimeType: mime });
      }
      if (info.state === 'FAILED') return res.status(500).json({ error: 'Gemini file processing failed' });
      await new Promise(r => setTimeout(r, 3000));
    }
    res.status(504).json({ error: 'Timeout waiting for Gemini file activation' });
  } catch (err) {
    console.error('[api/gemini/upload]', err.message);
    res.status(500).json({ error: err.message });
  }
}
