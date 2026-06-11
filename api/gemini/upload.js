// api/gemini/upload.js — Vercel serverless function
// Receives a video file (multipart), uploads to Gemini Files API, returns the file URI.
// API key lives in Vercel Environment Variables (no VITE_ prefix — never in browser bundle).

import { GoogleGenAI } from '@google/genai';
import { IncomingForm } from 'formidable';
import { readFileSync } from 'node:fs';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'No Gemini key configured on server' });

  // Parse multipart form
  const form = new IncomingForm({ maxFileSize: 500 * 1024 * 1024 });
  const [, files] = await form.parse(req);
  const uploaded = files.video?.[0];
  if (!uploaded) return res.status(400).json({ error: 'No file received' });

  try {
    const genai    = new GoogleGenAI({ apiKey });
    const buffer   = readFileSync(uploaded.filepath);
    const blob     = new Blob([buffer], { type: uploaded.mimetype });
    const file     = new File([blob], uploaded.originalFilename || 'video.mp4', { type: uploaded.mimetype });
    const result   = await genai.files.upload({ file, config: { mimeType: uploaded.mimetype } });

    // Poll until ACTIVE
    const deadline = Date.now() + 300_000;
    while (Date.now() < deadline) {
      const name = result.uri.split('/').pop();
      const info = await genai.files.get({ name });
      if (info.state === 'ACTIVE') return res.json({ uri: result.uri, mimeType: uploaded.mimetype });
      if (info.state === 'FAILED') return res.status(500).json({ error: 'Gemini file processing failed' });
      await new Promise(r => setTimeout(r, 3000));
    }
    res.status(504).json({ error: 'Timeout waiting for Gemini file activation' });
  } catch (err) {
    console.error('[api/gemini/upload]', err.message);
    res.status(500).json({ error: err.message });
  }
}
