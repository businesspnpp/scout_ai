// api/shotstack/poll/[id].js — Vercel serverless function (dynamic route)
// Polls a Shotstack render job status. Key is server-side only.

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.SHOTSTACK_API_KEY;
  const ssBase = (process.env.SHOTSTACK_URL || 'https://api.shotstack.io/edit/v1/render').replace(/\/render$/, '');
  if (!apiKey) return res.status(503).json({ error: 'Shotstack key not configured on server' });

  const { id } = req.query;
  try {
    const upstream = await fetch(`${ssBase}/render/${id}`, {
      headers: { 'x-api-key': apiKey },
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[api/shotstack/poll]', err.message);
    res.status(502).json({ error: err.message });
  }
}
