// geminiService.js
// handles all the Gemini API calls, streaming, and fallback mock data

import { GoogleGenAI } from '@google/genai';
import { compressVideoForUpload } from './clipService.js';

// try both keys in case one hits quota
const API_KEYS = [
  import.meta.env.VITE_GEMINI_API_KEY,
  import.meta.env.VITE_GEMINI_API_KEY2,
].filter(Boolean);

const API_KEY = API_KEYS[0]; // kept for mock-detection check below

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
    ],
    scoutNotes:       `Good ${pos} with a strong showing in his ${Object.keys(baseMetrics)[0]}. Worth monitoring over the next few months.`,
    developmentAreas: ['weak foot', 'pressing intensity', 'aerial duels'],
    potential:        overall >= 85 ? 'Elite (A-Grade)' : overall >= 78 ? 'High (B-Grade)' : 'Promising (C-Grade)',
    valuationBracket: overall >= 88 ? 'EUR 120,000 - EUR 250,000' : overall >= 80 ? 'EUR 50,000 - EUR 120,000' : 'EUR 15,000 - EUR 50,000',
    recommendedPath:  'CAF youth pathway, worth a trial at European U23 level',
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
    "finishing|pace|dribbling|positioning|workrate|heading": number,
    "passing|pressResistance|crossing|aerial|tackling": number
    /* Include exactly 6 keys appropriate for the position */
  },
  "highlights": [
    {
      "timestampStart": "MM:SS",
      "timestampEnd": "MM:SS",
      "clipIndex": number (1-based, which video clip this moment is from),
      "metric": string,
      "description": string,
      "clipLabel": "Clip X � MM:SS�MM:SS"
    }
  ],
  "scoutNotes": string,
  "developmentAreas": string[],
  "potential": "Elite (A-Grade)" | "High (B-Grade)" | "Promising (C-Grade)" | "Developmental",
  "valuationBracket": string,
  "recommendedPath": string
}`.trim();
}

// file upload helpers
async function uploadVideoFile(genai, file, onStream) {
  // Tick a dot every 4s so the UI doesn't look frozen during large uploads
  const heartbeat = setInterval(() => onStream?.(' .'), 4000);
  try {
    const uploaded = await genai.files.upload({
      file,
      config: { mimeType: file.type || 'video/mp4' },
    });
    return uploaded;
  } finally {
    clearInterval(heartbeat);
  }
}

async function waitForFileActive(genai, fileUri, onStream, maxWaitMs = 300_000) {
  const pollInterval = 3000;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const name = fileUri.split('/').pop();
    const info = await genai.files.get({ name });
    if (info.state === 'ACTIVE') return;
    if (info.state === 'FAILED') throw new Error('Gemini file processing failed');
    onStream?.(' .');
    await new Promise(r => setTimeout(r, pollInterval));
  }
  throw new Error('Timed out waiting for file to become active');
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// -- Main � streaming analysis -------------------------------------------------
/**
 * main export - runs the full analysis pipeline
 */
export async function analyzePlayer(
  playerDetails,
  videoFiles  = [],
  videoUrl    = '',
  headshotFile = null,
  onStream    = null,
) {
  if (!API_KEY) {
    // Simulate streaming with mock
    return new Promise(resolve => {
      const mock = buildMockResponse(playerDetails);
      const txt  = JSON.stringify(mock, null, 2);
      let i = 0;
      const tick = () => {
        if (i < txt.length) {
          onStream?.(txt.slice(i, i + 8));
          i += 8;
          setTimeout(tick, 18);
        } else {
          resolve(mock);
        }
      };
      tick();
    });
  }

  // Try each available API key - useful when keys are from different accounts
  let lastErr;
  for (let keyIdx = 0; keyIdx < API_KEYS.length; keyIdx++) {
    const key = API_KEYS[keyIdx];
    if (keyIdx > 0) onStream?.(`\n[Switching to backup API key...]`);
    try {
      return await runAnalysis(key, playerDetails, videoFiles, headshotFile, onStream);
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
      const is503 = err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE');
      if ((is429 || is503) && keyIdx < API_KEYS.length - 1) {
        onStream?.(`\n[Key ${keyIdx + 1} quota exhausted - trying next key...]`);
        lastErr = err;
        continue;
      }
      lastErr = err;
      break;
    }
  }
  console.warn('[geminiService] error:', lastErr?.message);
  return buildMockResponse(playerDetails);
}

async function runAnalysis(apiKey, playerDetails, videoFiles, headshotFile, onStream) {
    const genai = new GoogleGenAI({ apiKey });
    const parts = [];

    // 1. Reference photo - sent first so Gemini knows who to track
    if (headshotFile) {
      const b64 = await fileToBase64(headshotFile);
      parts.push({ inlineData: { mimeType: headshotFile.type || 'image/jpeg', data: b64 } });
      parts.push({ text: `This is the reference photo of the player to analyze. Use it to identify and track this specific individual in the footage. Analyze ONLY this player.\n\n${buildPrompt(playerDetails, videoFiles.length)}` });
    } else {
      parts.push({ text: buildPrompt(playerDetails, videoFiles.length) });
    }

    // 2. Compress large files then upload
    const COMPRESS_MB = 60;
    const INLINE_MB   = 15; // files ≤ 15 MB go inline (no Files API, no upload endpoint)
    for (let i = 0; i < videoFiles.length; i++) {
      let file = videoFiles[i];
      const sizeMB = file.size / 1_048_576;

      if (sizeMB > COMPRESS_MB) {
        onStream?.(`
Optimising video...`);
        try {
          file = await compressVideoForUpload(file, msg => onStream?.(`\n  ${msg}`));
          onStream?.(`
Optimisation complete`);
        } catch (e) {
          onStream?.(`
Continuing...`);
        }
      }

      const finalMB = file.size / 1_048_576;
      if (finalMB <= INLINE_MB) {
        onStream?.(`
Scanning footage...`);
        const b64 = await fileToBase64(file);
        parts.push({ text: `--- Video Clip ${i + 1}: ${videoFiles[i].name} ---` });
        parts.push({ inlineData: { mimeType: file.type || 'video/mp4', data: b64 } });
        onStream?.(`
Running analysis...`);
      } else {
        onStream?.(`
Uploading video...`);
        const uploaded = await uploadVideoFile(genai, file, onStream);
        onStream?.(`
Running analysis...`);
        await waitForFileActive(genai, uploaded.uri, onStream);
        onStream?.(`
Running analysis...`);
        parts.push({ text: `--- Video Clip ${i + 1}: ${videoFiles[i].name} ---` });
        parts.push({ fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType } });
      }
    }

    // 3. Stream the response - retry up to 4x on 503 overload
    // NOTE: 503s fire during stream consumption, so the whole call+consume must be inside the retry loop
    let accumulated = '';
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        accumulated = '';
        const stream = genai.models.generateContentStream({
          model:    'gemini-2.5-flash',
          contents: [{ role: 'user', parts }],
          config:   { temperature: 0.3, maxOutputTokens: 8192 },
        });
        for await (const chunk of await stream) {
          const token = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (token) {
            accumulated += token;
            onStream?.(token);
          }
        }
        break; // success - exit retry loop
      } catch (e) {
        const retryable = e?.status === 503 || String(e?.message).includes('503') || String(e?.message).includes('UNAVAILABLE');
        if (retryable && attempt < 4) {
          const wait = attempt * 8000;
          onStream?.(`\nHigh demand - retrying in ${wait / 1000}s...`);
          await new Promise(r => setTimeout(r, wait));
        } else { throw e; }
      }
    }

    // Strip markdown fences, then extract the first complete JSON object
    const stripped = accumulated.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const start = stripped.indexOf('{');
    const end   = stripped.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      console.warn('[geminiService] No JSON object found in response');
      return buildMockResponse(playerDetails);
    }
    let parsed;
    try {
      parsed = JSON.parse(stripped.slice(start, end + 1));
    } catch (e) {
      console.warn('[geminiService] JSON parse error:', e.message);
      return buildMockResponse(playerDetails);
    }
    return { ...parsed, _isMock: false };
}