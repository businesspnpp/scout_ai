// geminiService.js
// All Gemini API calls are routed through /api/gemini/* (server.js).
// API keys live only on the server — they are never included in the browser bundle.

import { compressVideoForUpload } from './clipService.js';
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
    console.warn('[geminiService] falling back to mock:', err.message);
    return buildMockResponse(playerDetails);
  }
}

// ── Proxy-based analysis pipeline ─────────────────────────────────────────
async function runAnalysis(playerDetails, videoFiles, headshotFile, onStream) {
  const parts = [];

  // 1. Reference photo
  if (headshotFile) {
    const b64 = await fileToBase64(headshotFile);
    parts.push({ inlineData: { mimeType: headshotFile.type || 'image/jpeg', data: b64 } });
    parts.push({ text: `This is the reference photo of the player to analyze. Use it to identify and track this specific individual in the footage. Analyze ONLY this player.\n\n${buildPrompt(playerDetails, videoFiles.length)}` });
  } else {
    parts.push({ text: buildPrompt(playerDetails, videoFiles.length) });
  }

  // 2. Process video files
  const COMPRESS_MB = 3;   // compress anything over 3 MB — keeps inline base64 under Vercel's 4.5 MB limit
  const INLINE_MB   = 15;
  for (let i = 0; i < videoFiles.length; i++) {
    let file = videoFiles[i];
    const sizeMB = file.size / 1_048_576;

    if (sizeMB > COMPRESS_MB) {
      onStream?.('\nOptimising video...');
      try {
        file = await compressVideoForUpload(file, msg => onStream?.(`\n  ${msg}`));
        onStream?.('\nOptimisation complete');
      } catch (e) {
        onStream?.('\nContinuing...');
      }
    }

    const finalMB = file.size / 1_048_576;
    parts.push({ text: `--- Video Clip ${i + 1}: ${videoFiles[i].name} ---` });

    if (finalMB <= INLINE_MB) {
      // Small file: base64 inline (no Files API round-trip needed)
      onStream?.('\nScanning footage...');
      const b64 = await fileToBase64(file);
      parts.push({ inlineData: { mimeType: file.type || 'video/mp4', data: b64 } });
      onStream?.('\nRunning analysis...');
    } else {
      // Large file: upload to Gemini Files API via server proxy
      onStream?.('\nUploading video...');
      const { uri, mimeType } = await uploadViaProxy(file, onStream);
      onStream?.('\nRunning analysis...');
      parts.push({ fileData: { fileUri: uri, mimeType } });
    }
  }

  // 3. Stream analysis from server via SSE
  return await streamViaProxy(parts, playerDetails, onStream);
}

// Upload a large video through the server proxy to Gemini Files API.
async function uploadViaProxy(file, onStream) {
  const formData = new FormData();
  formData.append('video', file);
  const heartbeat = setInterval(() => onStream?.(' .'), 4000);
  try {
    const res = await fetch('/api/gemini/upload', { method: 'POST', body: formData });
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
  const res = await fetch('/api/gemini/stream', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ parts }),
  });
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
        if (error) throw new Error(error);
        if (t) { accumulated += t; onStream?.(t); }
      } catch (e) {
        // Skip malformed SSE lines
      }
    }
  }

  // Parse accumulated JSON response
  const stripped = accumulated.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const start    = stripped.indexOf('{');
  const end      = stripped.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    console.warn('[geminiService] No JSON in response, using mock');
    return buildMockResponse(playerDetails);
  }
  try {
    const parsed = JSON.parse(stripped.slice(start, end + 1));
    return { ...parsed, _isMock: false };
  } catch (e) {
    console.warn('[geminiService] JSON parse error:', e.message);
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