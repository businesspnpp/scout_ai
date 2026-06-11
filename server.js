// server.js — API proxy server
// Keeps all third-party keys (Gemini, Shotstack) out of the browser bundle.
// Run with: node server.js   (started automatically via `npm run dev`)

import express  from 'express';
import cors     from 'cors';
import multer   from 'multer';
import { GoogleGenAI } from '@google/genai';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json({ limit: '150mb' }));

// multer handles large video uploads (in-memory, max 500 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 500 * 1024 * 1024 },
});

// ── Keys (never exposed to the browser) ────────────────────────────────────
const GEMINI_KEYS   = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean);
const SHOTSTACK_KEY = process.env.SHOTSTACK_API_KEY;
const SHOTSTACK_URL = process.env.SHOTSTACK_URL || 'https://api.shotstack.io/edit/stage/render';

const SS_POLL  = SHOTSTACK_URL.replace(/\/render$/, '');
const SS_SERVE = SHOTSTACK_URL.replace('/edit/', '/serve/').replace('/render', '');

// ── Gemini: upload large video to Files API ─────────────────────────────────
// POST /api/gemini/upload  (multipart/form-data, field name "video")
// Returns { uri: string, mimeType: string }
app.post('/api/gemini/upload', upload.single('video'), async (req, res) => {
  if (!GEMINI_KEYS.length) return res.status(503).json({ error: 'No Gemini key configured on server' });
  if (!req.file)           return res.status(400).json({ error: 'No file received' });

  try {
    const genai  = new GoogleGenAI({ apiKey: GEMINI_KEYS[0] });
    const blob   = new Blob([req.file.buffer], { type: req.file.mimetype });
    const file   = new File([blob], req.file.originalname || 'video.mp4', { type: req.file.mimetype });

    const uploaded = await genai.files.upload({
      file,
      config: { mimeType: req.file.mimetype },
    });

    // Poll until ACTIVE (Gemini transcodes the video before it can be used)
    const deadline = Date.now() + 300_000;
    while (Date.now() < deadline) {
      const name = uploaded.uri.split('/').pop();
      const info = await genai.files.get({ name });
      if (info.state === 'ACTIVE') return res.json({ uri: uploaded.uri, mimeType: req.file.mimetype });
      if (info.state === 'FAILED') return res.status(500).json({ error: 'Gemini file processing failed' });
      await new Promise(r => setTimeout(r, 3000));
    }
    res.status(504).json({ error: 'Timeout waiting for Gemini file activation' });
  } catch (err) {
    console.error('[/api/gemini/upload]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Gemini: streaming analysis via SSE ─────────────────────────────────────
// POST /api/gemini/stream  { parts: [...] }
// Streams back:  data: {"t":"token"}\n\n  |  data: [DONE]\n\n  |  data: [MOCK]\n\n
app.post('/api/gemini/stream', async (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if present
  res.flushHeaders();

  if (!GEMINI_KEYS.length) {
    // No API key — stream a mock response word by word
    const mockReply = "Scout AI is running in demo mode (no Gemini API key configured on the server). To enable live AI responses, add GEMINI_API_KEY to your .env file and restart the server. In the meantime, the scouting database, player profiles, video analysis, and all other features are fully functional.";
    const words = mockReply.split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ t: word + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 18));
    }
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  const { parts } = req.body;
  if (!Array.isArray(parts) || parts.length === 0) {
    res.write(`data: ${JSON.stringify({ error: 'No parts provided' })}\n\n`);
    return res.end();
  }

  let lastErr;
  for (const key of GEMINI_KEYS) {
    try {
      const genai  = new GoogleGenAI({ apiKey: key });
      const stream = genai.models.generateContentStream({
        model:    'gemini-2.5-flash',
        contents: [{ role: 'user', parts }],
        config:   { temperature: 0.3, maxOutputTokens: 8192 },
      });

      // Retry loop for 503 overloads (same strategy as original client code)
      let accumulated = '';
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          for await (const chunk of await stream) {
            const token = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            if (token) {
              accumulated += token;
              res.write(`data: ${JSON.stringify({ t: token })}\n\n`);
            }
          }
          break; // success
        } catch (e) {
          const retryable = e?.status === 503 || String(e?.message).includes('UNAVAILABLE');
          if (retryable && attempt < 4) {
            const wait = attempt * 8000;
            res.write(`data: ${JSON.stringify({ t: `\nHigh demand — retrying in ${wait / 1000}s...` })}\n\n`);
            await new Promise(r => setTimeout(r, wait));
          } else { throw e; }
        }
      }

      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (err) {
      lastErr = err;
      const isQuota = err?.status === 429 || String(err?.message).includes('RESOURCE_EXHAUSTED');
      if (isQuota) {
        res.write(`data: ${JSON.stringify({ t: '\n[Switching to backup key...]\n' })}\n\n`);
        continue; // try next key
      }
      break;
    }
  }

  // All keys failed
  console.error('[/api/gemini/stream]', lastErr?.message);
  res.write(`data: ${JSON.stringify({ error: lastErr?.message ?? 'Analysis failed' })}\n\n`);
  res.end();
});

// ── Shotstack: submit render job ────────────────────────────────────────────
// POST /api/shotstack/render  (body forwarded as-is to Shotstack)
app.post('/api/shotstack/render', async (req, res) => {
  if (!SHOTSTACK_KEY) return res.status(503).json({ error: 'Shotstack key not configured on server' });
  try {
    const upstream = await fetch(SHOTSTACK_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': SHOTSTACK_KEY },
      body:    JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[/api/shotstack/render]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── Shotstack: poll render status ───────────────────────────────────────────
// GET /api/shotstack/poll/:id
app.get('/api/shotstack/poll/:id', async (req, res) => {
  if (!SHOTSTACK_KEY) return res.status(503).json({ error: 'Shotstack key not configured on server' });
  try {
    const upstream = await fetch(`${SS_POLL}/render/${req.params.id}`, {
      headers: { 'x-api-key': SHOTSTACK_KEY },
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[/api/shotstack/poll]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── Shotstack: serve (permanent CDN asset lookup) ───────────────────────────
// GET /api/shotstack/serve/:id
app.get('/api/shotstack/serve/:id', async (req, res) => {
  if (!SHOTSTACK_KEY) return res.status(503).json({ error: 'Shotstack key not configured on server' });
  try {
    const upstream = await fetch(`${SS_SERVE}/assets/render/${req.params.id}`, {
      headers: { 'x-api-key': SHOTSTACK_KEY },
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[/api/shotstack/serve]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const hasGemini    = GEMINI_KEYS.length > 0;
  const hasShotstack = !!SHOTSTACK_KEY;
  console.log(`[API proxy] http://localhost:${PORT}`);
  console.log(`  Gemini:    ${hasGemini    ? `${GEMINI_KEYS.length} key(s) loaded` : 'NO KEY — mock mode'}`);
  console.log(`  Shotstack: ${hasShotstack ? 'key loaded'                          : 'NO KEY — disabled'}`);
});
