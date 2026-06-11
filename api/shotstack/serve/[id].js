// api/shotstack/serve/[id].js — Vercel serverless function (dynamic route)
// Fetches permanent CDN asset URL from Shotstack Serve API. Key is server-side only.

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey  = process.env.SHOTSTACK_API_KEY;
  const ssServe = (process.env.SHOTSTACK_URL || 'https://api.shotstack.io/edit/stage/render')
    .replace('/edit/', '/serve/')
    .replace('/render', '');
  if (!apiKey) return res.status(503).json({ error: 'Shotstack key not configured on server' });

  const { id } = req.query;
  try {
    const upstream = await fetch(`${ssServe}/assets/render/${id}`, {
      headers: { 'x-api-key': apiKey },
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[api/shotstack/serve]', err.message);
    res.status(502).json({ error: err.message });
  }
}
