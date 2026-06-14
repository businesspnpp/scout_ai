// api/gemini/ingest-coordinates.js
// Receives tracking points from the frontend after a successful Gemini analysis,
// and bulk-inserts them into player_coordinates using the Supabase SERVICE key.
// The service key bypasses RLS — it never touches the browser bundle.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL         = process.env.SUPABASE_URL         || process.env.VITE_PROJECT_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    // Graceful no-op: coordinates are a nice-to-have, never block the main flow
    console.warn('[ingest-coordinates] Supabase service key not configured — skipping');
    return res.status(200).json({ skipped: true });
  }

  const { playerId, videoId, matchName, points } = req.body ?? {};

  if (!playerId || !Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ error: 'playerId and points[] are required' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Map to table columns — clamp to valid range
  const rows = points.map(p => ({
    player_id:       playerId,
    video_id:        videoId  ?? 'unknown',
    match_name:      matchName ?? 'Scouting Video',
    x_pos:           Math.min(100, Math.max(0, parseFloat(p.x)  || 0)),
    y_pos:           Math.min(100, Math.max(0, parseFloat(p.y)  || 0)),
    event_type:      ['movement','shot','pass','tackle','dribble'].includes(p.eventType)
                       ? p.eventType : 'movement',
    video_timestamp: parseFloat(p.t) || null,
  }));

  // Chunk into batches of 500 to stay well under Supabase's per-request limits
  const CHUNK = 500;
  let totalInserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase
      .from('player_coordinates')
      .insert(rows.slice(i, i + CHUNK));
    if (error) {
      console.error('[ingest-coordinates] insert error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    totalInserted += Math.min(CHUNK, rows.length - i);
  }

  console.log(`[ingest-coordinates] inserted ${totalInserted} points for player ${playerId}`);
  return res.status(200).json({ inserted: totalInserted });
}
