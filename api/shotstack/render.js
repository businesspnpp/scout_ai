// api/shotstack/render.js — Vercel serverless function
// Proxies render job submissions to Shotstack. SHOTSTACK_API_KEY is a Vercel
// Environment Variable — it is never embedded in the browser bundle.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey  = process.env.SHOTSTACK_API_KEY;
  const ssUrl   = 'https://api.shotstack.io/edit/v1/render';
  if (!apiKey) return res.status(503).json({ error: 'Shotstack key not configured on server' });

  try {
    const upstream = await fetch(ssUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body:    JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[api/shotstack/render]', err.message);
    res.status(502).json({ error: err.message });
  }
}
