// geminiService.js
// All Gemini API calls are routed through /api/gemini/* (server.js).
// API keys live only on the server — they are never included in the browser bundle.

import { compressVideoForUpload } from './clipService.js';
import { supabase, isSupabaseEnabled } from './supabaseClient.js';
// API keys live server-side only — see server.js / api/ directory.

// mock data used when the API is down or no key is set
function buildMockResponse(playerDetails) {
  const pos = playerDetails.position ?? 'ST';
  const isAttacker   = ['ST', 'CAM'].includes(pos);
  const isMidfielder = ['CM', 'CDM'].includes(pos);
  const isDefender   = ['CB', 'RB', 'LB'].includes(pos);

  const baseMetrics = isAttacker
    ? { finishing: 87, pace: 83, dribbling: 79, positioning: 81, workrate: 80, heading: 72 }
    : isMidfielder
    ? { passing: 84, pressResistance: 79, positioning: 83, workrate: 86, dribbling: 72, pace: 70 }
    : isDefender
    ? { positioning: 85, aerial: 82, tackling: 80, passing: 72, pace: 69, workrate: 83 }
    : { pace: 84, dribbling: 81, crossing: 76, finishing: 70, positioning: 74, workrate: 79 };

  const overall = Math.round(
    Object.values(baseMetrics).reduce((a, b) => a + b, 0) / Object.keys(baseMetrics).length
  );

  return {
    player: { name: playerDetails.name ?? 'Unknown', age: playerDetails.age ?? '?', position: pos, region: playerDetails.region ?? 'Africa' },
    overallScore:      overall,
    aiMatchConfidence: Math.min(99, overall + 6),
    analysisDate:      new Date().toISOString(),
    metrics:           baseMetrics,
    highlights: [
      { timestampStart: '00:26', timestampEnd: '00:31', metric: Object.keys(baseMetrics)[0], description: 'Good burst of pace, gets in behind the defensive line', clipLabel: 'Clip A - 00:26-00:31' },
      { timestampStart: '01:02', timestampEnd: '01:08', metric: Object.keys(baseMetrics)[1], description: 'Holds up well under pressure, turns and drives', clipLabel: 'Clip B - 01:02-01:08' },
      { timestampStart: '01:50', timestampEnd: '01:57', metric: Object.keys(baseMetrics)[2], description: 'Tight control in a small space with two defenders close', clipLabel: 'Clip C - 01:50-01:57' },
      { timestampStart: '02:35', timestampEnd: '02:43', metric: Object.keys(baseMetrics)[3], description: 'Smart movement off the ball, arrives at the right moment', clipLabel: 'Clip D - 02:35-02:43' },
      { timestampStart: '03:10', timestampEnd: '03:18', metric: Object.keys(baseMetrics)[4], description: 'High energy press, covers ground quickly to close down the defender', clipLabel: 'Clip E - 03:10-03:18' },
      { timestampStart: '03:55', timestampEnd: '04:02', metric: Object.keys(baseMetrics)[5], description: 'Wins the aerial duel cleanly, good timing on the jump', clipLabel: 'Clip F - 03:55-04:02' },
    ],
    scoutNotes:       `Good ${pos} with a strong showing in his ${Object.keys(baseMetrics)[0]}. Worth monitoring over the next few months.`,
    developmentAreas: ['weak foot', 'pressing intensity', 'aerial duels'],
    potential:        overall >= 85 ? 'Elite (A-Grade)' : overall >= 78 ? 'High (B-Grade)' : 'Promising (C-Grade)',
    valuationBracket: overall >= 88 ? '€120,000 - €250,000' : overall >= 80 ? '€50,000 - €120,000' : '€15,000 - €50,000',
    recommendedPath:  'CAF youth pathway, worth a trial at European U23 level',
    comparablePros: [
      { name: 'Thomas Partey',       club: 'Atletico Madrid (Youth Reference)', ageWhen: 18, similarity: 89 },
      { name: 'Wilfried Ndidi',      club: 'Genk Academy Reference',            ageWhen: 19, similarity: 83 },
      { name: 'Emmanuel Adebayor',   club: 'AS Monaco (Youth)',                 ageWhen: 17, similarity: 76 },
    ],
    _isMock: true,
  };
}

// builds the prompt we send to Gemini
function buildPrompt(playerDetails, clipCount) {
  const { name, age, position, region } = playerDetails;
  return `You are an elite football talent scout AI analyzing African grassroots players.

${clipCount > 0
  ? `You have been provided with ${clipCount > 1 ? `${clipCount} video clips` : 'a video clip'} of the player.${clipCount > 1 ? ' Analyze ALL clips together for a comprehensive assessment.' : ''}`
  : 'No video was provided. Base your analysis on the reference photo and player details only. Note this in scoutNotes.'
}

Player:
- Name: ${name}
- Age: ${age}
- Position: ${position}
- Region: ${region}

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "player": { "name": string, "age": number, "position": string, "region": string },
  "overallScore": number (0-100),
  "aiMatchConfidence": number (0-100),
  "analysisDate": ISO string,
  "metrics": {
    Score ALL attributes relevant to the position. Use camelCase keys. Include as many as needed.
    Common keys by position:
    - Striker/CAM: finishing, pace, dribbling, positioning, workrate, heading, ballControl, shooting
    - Winger: pace, dribbling, crossing, finishing, positioning, workrate, agility, vision
    - Midfielder: passing, pressResistance, positioning, workrate, dribbling, pace, vision, ballControl
    - Defender: positioning, aerial, tackling, passing, pace, workrate, heading, strength
    - GK: reflexes, positioning, distribution, aerial, command, sweeping
  },
  "highlights": [
    Extract one highlight clip per scored metric where visible evidence exists in the footage.
    CRITICAL: each "metric" value MUST be one of the exact camelCase keys you used in the metrics object above.
    {
      "timestampStart": "MM:SS",
      "timestampEnd": "MM:SS",
      "clipIndex": number (1-based),
      "metric": string (MUST exactly match one of the keys in metrics above),
      "description": string,
      "clipLabel": "Clip X - MM:SS-MM:SS"
    }
  ],
  "scoutNotes": string,
  "developmentAreas": string[],
  "potential": "Elite (A-Grade)" | "High (B-Grade)" | "Promising (C-Grade)" | "Developmental",
  "valuationBracket": string (use € symbol, e.g. "€50,000 - €120,000"),
  "recommendedPath": string,
  "comparablePros": [
    {
      "name": string (real professional footballer),
      "club": string (e.g. "Atletico Madrid (Youth Reference)"),
      "ageWhen": number (age of the pro when they were at this level),
      "similarity": number (0-100, based on structural metrics match)
    }
  ]
  IMPORTANT: Include 2-3 real professionals whose playing style genuinely mirrors this player's calculated metrics and position. Only select players whose tactical profile matches the data — do not output generic superstar names unless explicitly justified by the metrics.
}
`;
}

// uploadVideoFile and waitForFileActive have been moved to server.js (proxy).

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function analyzePlayer(
  playerDetails,
  videoFiles  = [],
  videoUrl    = '',
  headshotFile = null,
  onStream    = null,
) {
  try {
    return await runAnalysis(playerDetails, videoFiles, headshotFile, onStream);
  } catch (err) {
    console.error('[gemini] ── PIPELINE FAILED — falling back to mock ──');
    console.error('[gemini] error:', err.message);
    console.error('[gemini] stack:', err.stack);
    return buildMockResponse(playerDetails);
  }
}

// ── Proxy-based analysis pipeline ─────────────────────────────────────────
async function runAnalysis(playerDetails, videoFiles, headshotFile, onStream) {
  console.log('[gemini] ── runAnalysis START ──');
  console.log('[gemini] SharedArrayBuffer available:', typeof SharedArrayBuffer !== 'undefined');
  console.log('[gemini] player:', playerDetails);
  console.log('[gemini] videos:', videoFiles.map(f => `${f.name} (${(f.size/1_048_576).toFixed(2)} MB)`));
  console.log('[gemini] headshot:', headshotFile ? `${headshotFile.name} (${(headshotFile.size/1024).toFixed(1)} KB)` : 'none');

  const parts = [];

  // 1. Reference photo
  if (headshotFile) {
    console.log('[gemini] 1/3 encoding headshot as base64...');
    const b64 = await fileToBase64(headshotFile);
    console.log('[gemini] 1/3 headshot encoded:', (b64.length / 1024).toFixed(1), 'KB base64');
    parts.push({ inlineData: { mimeType: headshotFile.type || 'image/jpeg', data: b64 } });
    parts.push({ text: `This is the reference photo of the player to analyze. Use it to identify and track this specific individual in the footage. Analyze ONLY this player.\n\n${buildPrompt(playerDetails, videoFiles.length)}` });
  } else {
    console.log('[gemini] 1/3 no headshot — skipping');
    parts.push({ text: buildPrompt(playerDetails, videoFiles.length) });
  }

  // 2. Process video files
  const COMPRESS_MB = 1;
  const INLINE_MB   = 2.2;
  const MAX_RAW_MB  = 2000; // Gemini Files API accepts up to 2 GB; Supabase handles the upload
  for (let i = 0; i < videoFiles.length; i++) {
    let file = videoFiles[i];
    const sizeMB = file.size / 1_048_576;
    console.log(`[gemini] 2/3 video ${i+1}: "${file.name}" — ${sizeMB.toFixed(2)} MB`);

    if (sizeMB > MAX_RAW_MB) {
      console.error(`[gemini] video ${i+1} rejected — ${sizeMB.toFixed(0)} MB exceeds 100 MB limit`);
      throw new Error(`Video is ${sizeMB.toFixed(0)} MB — please trim to under 5 minutes before uploading.`);
    }

    if (sizeMB > COMPRESS_MB) {
      console.log(`[gemini] video ${i+1} — needs compression (${sizeMB.toFixed(2)} MB > ${COMPRESS_MB} MB threshold)`);
      console.log('[gemini] starting FFmpeg compression (90s timeout)...');
      console.time('[gemini] compression');
      onStream?.('\nOptimising video...');
      try {
        const compressed = await Promise.race([
          compressVideoForUpload(file, msg => {
            console.log('[ffmpeg]', msg);
            onStream?.(`\n  ${msg}`);
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('COMPRESS_TIMEOUT')), 3 * 60_000) // 3 min — WASM load alone can take 60-90s on slow networks
          ),
        ]);
        console.timeEnd('[gemini] compression');
        console.log(`[gemini] compressed: ${(compressed.size/1_048_576).toFixed(2)} MB (was ${sizeMB.toFixed(2)} MB, ratio ${(compressed.size/file.size*100).toFixed(1)}%)`);
        file = compressed;
        onStream?.('\nOptimisation complete');
      } catch (e) {
        console.timeEnd('[gemini] compression');
        console.warn('[gemini] compression error:', e.message);
        if (e.message === 'COMPRESS_TIMEOUT') {
          console.warn('[gemini] COMPRESSION TIMED OUT after 3 min');
        } else {
          console.warn('[gemini] compression threw:', e.message);
        }
        const fallbackMB = file.size / 1_048_576;
        console.log(`[gemini] fallback file size: ${fallbackMB.toFixed(2)} MB — routing to Supabase upload path`);
        // Compression failed — fall through with original file.
        // If > INLINE_MB the code below will call uploadViaProxy (Supabase → Gemini Files API).
      }
    } else {
      console.log(`[gemini] video ${i+1} small enough — skipping compression`);
    }

    const finalMB = file.size / 1_048_576;
    console.log(`[gemini] video ${i+1} final size: ${finalMB.toFixed(2)} MB — sending ${finalMB <= INLINE_MB ? 'INLINE base64' : 'via Files API proxy'}`);
    parts.push({ text: `--- Video Clip ${i + 1}: ${videoFiles[i].name} ---` });

    if (finalMB <= INLINE_MB) {
      onStream?.('\nScanning footage...');
      console.log('[gemini] encoding video as base64 inline...');
      console.time('[gemini] base64 encode');
      const b64 = await fileToBase64(file);
      console.timeEnd('[gemini] base64 encode');
      console.log(`[gemini] base64 size: ${(b64.length/1_048_576).toFixed(2)} MB (~${(b64.length*4/3/1_048_576).toFixed(2)} MB wire)`);
      parts.push({ inlineData: { mimeType: file.type || 'video/mp4', data: b64 } });
      onStream?.('\nRunning analysis...');
    } else {
      onStream?.('\nUploading video...');
      console.log('[gemini] uploading via Files API proxy...');
      console.time('[gemini] upload');
      const { uri, mimeType } = await uploadViaProxy(file, onStream);
      console.timeEnd('[gemini] upload');
      console.log('[gemini] upload complete — uri:', uri);
      onStream?.('\nRunning analysis...');
      parts.push({ fileData: { fileUri: uri, mimeType } });
    }
  }

  // 3. Stream analysis from server via SSE
  console.log(`[gemini] 3/3 sending to Gemini via SSE — ${parts.length} parts total`);
  console.time('[gemini] stream');
  const result = await streamViaProxy(parts, playerDetails, onStream);
  console.timeEnd('[gemini] stream');
  console.log('[gemini] ── runAnalysis COMPLETE ──', result._isMock ? '⚠ MOCK' : '✓ REAL', 'score:', result.overallScore);
  return result;
}

// Upload video to Supabase Storage first (direct from browser, no Vercel size limit),
// then pass the public URL to the server so it can stream to Gemini Files API.
async function uploadViaProxy(file, onStream) {
  const heartbeat = setInterval(() => onStream?.(' .'), 4000);
  try {
    // Step 1: upload directly to Supabase Storage from the browser
    if (!isSupabaseEnabled || !supabase) {
      throw new Error('Supabase not configured — cannot upload large video');
    }
    const ext = file.name.split('.').pop() || 'mp4';
    const path = `videos/tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    console.log('[gemini] uploading video to Supabase Storage...');
    console.time('[gemini] supabase upload');
    const { error: uploadErr } = await supabase.storage
      .from('profiles')
      .upload(path, file, { contentType: file.type || 'video/mp4', upsert: false });
    console.timeEnd('[gemini] supabase upload');
    if (uploadErr) throw new Error(`Supabase upload failed: ${uploadErr.message}`);

    // Step 2: get a public URL
    const { data: urlData } = supabase.storage.from('profiles').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    console.log('[gemini] Supabase public URL:', publicUrl);

    // Step 3: tell the server to fetch that URL and forward to Gemini Files API
    const res = await fetch('/api/gemini/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: publicUrl, mimeType: file.type || 'video/mp4', path }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => String(res.status));
      throw new Error(`Gemini upload failed (${res.status}): ${msg}`);
    }
    return await res.json(); // { uri, mimeType }
  } finally {
    clearInterval(heartbeat);
  }
}

// Open an SSE connection to the server and stream Gemini tokens back to the UI.
async function streamViaProxy(parts, playerDetails, onStream) {
  const bodyJson = JSON.stringify({ parts });
  console.log(`[gemini] POST /api/gemini/stream — body: ${(bodyJson.length/1_048_576).toFixed(2)} MB`);
  const res = await fetch('/api/gemini/stream', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    bodyJson,
  });
  console.log(`[gemini] /api/gemini/stream response: ${res.status} ${res.statusText}`);
  if (!res.ok) throw new Error(`Gemini stream request failed: ${res.status}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer      = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep any incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();

      if (payload === '[DONE]') break;
      if (payload === '[MOCK]') return buildMockResponse(playerDetails);
      if (!payload)            continue;

      try {
        const { t, error } = JSON.parse(payload);
        if (error) { console.error('[gemini] SSE error token:', error); throw new Error(error); }
        if (t) { accumulated += t; onStream?.(t); }
      } catch (e) {
        console.warn('[gemini] malformed SSE line:', line.slice(0, 80));
      }
    }
  }

  // Parse accumulated JSON response
  console.log(`[gemini] SSE stream ended — accumulated ${accumulated.length} chars`);
  const stripped = accumulated.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const start    = stripped.indexOf('{');
  const end      = stripped.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    console.warn('[gemini] No JSON found in response — raw (first 500 chars):', stripped.slice(0, 500));
    console.warn('[gemini] Falling back to mock');
    return buildMockResponse(playerDetails);
  }
  try {
    const parsed = JSON.parse(stripped.slice(start, end + 1));
    console.log('[gemini] JSON parsed OK — overallScore:', parsed.overallScore, 'metrics:', Object.keys(parsed.metrics ?? {}));
    return { ...parsed, _isMock: false };
  } catch (e) {
    console.warn('[gemini] JSON parse error:', e.message);
    console.warn('[gemini] Raw response (first 500 chars):', stripped.slice(0, 500));
    return buildMockResponse(playerDetails);
  }
}

// ── Transfer Pitch Generator ───────────────────────────────────────────────────
/**
 * Stream a professional scouting memo for the given player.
 * Calls the same /api/gemini/stream proxy as the analysis pipeline.
 */
export async function generateTransferPitch(player, onStream) {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const topMetric = Object.entries(player.metrics ?? {}).sort((a, b) => b[1] - a[1])[0];
  const topMetricStr = topMetric ? `${topMetric[0].replace(/([A-Z])/g, ' $1').trim()}: ${topMetric[1]}/100` : '';

  const prompt = `You are a master international football agent and chief corporate sports director specializing in elite player placements inside European leagues (EPL, La Liga, Bundesliga, Ligue 1).

Synthesize the following player data profile into an elite, compelling 2-paragraph executive recruitment memo.

PLAYER NAME: ${player.name}
POSITIONAL INTERFACE: ${player.pos}
AGE: ${player.age}
REGION: ${player.country}
OVERALL RATING: ${player.overall}/100
AI MATCH CONFIDENCE: ${player.aiMatch}%
TOP VERIFIED METRIC: ${topMetricStr}
FULL METRICS PORTFOLIO: ${JSON.stringify(player.metrics ?? {})}
VALUATION BRACKET: ${player.analysis?.valuationBracket ?? 'Available on request'}
POTENTIAL GRADE: ${player.analysis?.potential ?? 'High'}

FORMATTING RULES:
- Begin with exactly: "TRANSMISSION: FORMAL SCOUTING BRIEF \u2014 ${today}"
- Next line: "RE: ${player.name} | ${player.pos} | Age ${player.age} | ${player.country}"
- Blank line, then Paragraph 1: Address the "Director of Emerging Talent Recruitment" directly. Present the player with formal authority. Lead with their highest verified metric as a rare tactical asset.
- Blank line, then Paragraph 2: Tactical and financial justification. Explain how their data matrix positions them as an immediate acquisition target. Reference how AI-verified video analysis eliminates recruitment bias and confirms readiness for a high-intensity reserve or first-team system.
- Tone: Urgent, commercially persuasive, clinical, authoritative. No filler. No generic opening phrases.`;

  const mockPitch = (name, pos, age, country, overall, topM, today) => {
    const lines = [
      `TRANSMISSION: FORMAL SCOUTING BRIEF \u2014 ${today}`,
      `RE: ${name} | ${pos} | Age ${age} | ${country}`,
      '',
      `Director of Emerging Talent Recruitment,`,
      '',
      `The data enclosed demands immediate executive attention. ${name} presents a ${topM} verified at the 95th percentile for players operating at this developmental tier. At ${age}, the window for acquisition is narrow \u2014 the metrics indicate a profile that will not remain uncontracted beyond the next two transfer cycles.`,
      '',
      `Our AI-validated assessment (${overall}/100 overall, bias-eliminated video analysis) confirms structural readiness for integration into a high-intensity reserve system or direct first-team rotation. Financial exposure is minimal relative to projected resale valuation. We recommend initiating contact within 14 days. Full dossier available on request.`,
    ];
    return lines.join('\n');
  };

  const res = await fetch('/api/gemini/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parts: [{ text: prompt }] }),
  });
  if (!res.ok) throw new Error(`Pitch stream failed: ${res.status}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;
      if (payload === '[MOCK]') {
        // No API key — stream a local mock pitch word-by-word
        const text = mockPitch(player.name, player.pos, player.age, player.country, player.overall, topMetricStr, today);
        for (const word of text.split('')) {
          onStream?.(word);
          await new Promise(r => setTimeout(r, 8));
        }
        return;
      }
      if (!payload) continue;
      try {
        const { t, error } = JSON.parse(payload);
        if (error) throw new Error(error);
        if (t) onStream?.(t);
      } catch (e) { /* skip malformed */ }
    }
  }
}