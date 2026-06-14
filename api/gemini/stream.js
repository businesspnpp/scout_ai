// api/gemini/stream.js — Vercel serverless function
// Receives { parts } JSON, calls Gemini generateContentStream server-side,
// and streams tokens back to the browser via Server-Sent Events.
// GEMINI_API_KEY / GEMINI_API_KEY_2 are Vercel Environment Variables — never in the bundle.

import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GEMINI_KEYS = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean);

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  if (!GEMINI_KEYS.length) {
    res.write('data: [MOCK]\n\n');
    return res.end();
  }

  const { parts } = req.body ?? {};
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
        config:   { temperature: 0.3, maxOutputTokens: 16384 },
      });

      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          for await (const chunk of await stream) {
            const token = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            if (token) res.write(`data: ${JSON.stringify({ t: token })}\n\n`);
          }
          break;
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
        continue;
      }
      break;
    }
  }

  console.error('[api/gemini/stream]', lastErr?.message);
  res.write(`data: ${JSON.stringify({ error: lastErr?.message ?? 'Analysis failed' })}\n\n`);
  res.end();
}
