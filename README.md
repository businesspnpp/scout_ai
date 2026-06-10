# Scout AI — African Talent Discovery Platform

> **BeOrchid Africa 2026** · AI-powered dual-sided football scouting platform  
> Built with React 18 + Vite 6 + Tailwind CSS v4 + Gemini 1.5 Pro

---

## Overview

Scout AI is a dual-sided talent discovery platform connecting grassroots African football players with elite scouts worldwide. Coaches upload match footage; scouts discover talent through an AI-analyzed profile grid with interactive radar charts and metric evidence clips.

```
Uploader Portal  →  Gemini 1.5 Pro analysis  →  Scout Intelligence Grid
```

---

## Architecture & Directory Structure

```
scout-ai/
├── public/
│   ├── headshots/
│   │   ├── player1.jpg              # Celestin Kamdem
│   │   ├── player2.jpg              # Oumar Coulibaly
│   │   └── ...  (player3–10.jpg)
│   └── reels/
│       ├── celestin-kamdem/
│       │   ├── highlight.mp4        # Full 60–90s reel
│       │   ├── finishing.mp4        # Metric evidence clip
│       │   └── pace.mp4
│       ├── oumar-coulibaly/
│       │   ├── highlight.mp4
│       │   ├── dribbling.mp4
│       │   └── passing.mp4
│       └── ... (8 more player folders)
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Navigation.jsx           # Dual-role top nav with toggle pill
│   │   ├── UploaderPortal.jsx       # Ingestion form + cinematic AI terminal
│   │   ├── ScoutDashboard.jsx       # Filter sidebar + 10-player discovery grid
│   │   ├── PlayerCard.jsx           # Profile card with SVG radar chart
│   │   └── VideoLightbox.jsx        # Full-screen video popup for metric clips
│   ├── data/
│   │   └── mockPlayers.js           # 10 pre-loaded deep-data African profiles
│   ├── services/
│   │   └── geminiService.js         # Gemini 1.5 Pro API connection + mock fallback
│   ├── App.jsx                      # Root state: view, lightbox, shortlist
│   ├── main.jsx
│   └── index.css                    # Tailwind v4 + custom design tokens
├── .env.local                       # VITE_GEMINI_API_KEY=your_key_here
├── package.json
└── README.md
```

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Add your Gemini API key (optional — app works without it via mock data)
echo "VITE_GEMINI_API_KEY=your_free_key_here" > .env.local

# 3. Start development server
npm run dev

# 4. Build for production
npm run build
```

---

## Feature Breakdown

### Uploader Portal (`/uploader`)
- Input: Player name, age, region, position
- Anchor headshot / ID photo upload (used for facial reference tracking)
- Video input: native `.mp4` file upload **or** YouTube/TikTok URL
- **Cinematic 4-step AI loading sequence:**
  1. Ingesting video frames + facial anchor alignment
  2. Gemini 1.5 Pro multimodal inference
  3. Positional metric scoring across 6 axes
  4. FFmpeg highlight slicing & timestamp extraction
- Live JSON response display with syntax highlighting
- Auto-injects analyzed player into the Scout grid

### Scout Intelligence (`/scouter`)
- **Filter sidebar:** Position (grouped), Region, Age max, Overall score threshold, Saved only
- **Sort:** Overall ↓, AI Match ↓, Youngest, Name A–Z
- **Player cards** include:
  - Position-specific radar chart (6 dynamic axes per role group)
  - Clickable metric score bars → opens video lightbox with evidence clip
  - Highlight reel play button
  - Star shortlist toggle
- Stats strip: active profiles, countries, avg score, positions represented

### Position-Specific Radar Axes

| Role Group      | Positions        | Radar Axes |
|-----------------|------------------|------------|
| Attacker        | ST, CAM          | Finishing · Pace · Dribbling · Positioning · Work Rate · Heading |
| Winger          | RW, LW           | Pace · Dribbling · Crossing · Finishing · Positioning · Work Rate |
| Midfielder      | CM               | Passing · Press Res. · Positioning · Work Rate · Dribbling · Pace |
| Defensive Mid   | CDM              | Positioning · Tackling · Passing · Work Rate · Press Res. · Pace |
| Defender        | CB, RB, LB       | Positioning · Aerial · Tackling · Passing · Pace · Work Rate |
| Goalkeeper      | GK               | Reflexes · Positioning · Distribution · Aerial · Command · Sweeping |

---

## Gemini 1.5 Pro Integration

`src/services/geminiService.js` uses the `@google/genai` SDK:

```js
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const response = await genai.models.generateContent({
  model: 'gemini-1.5-pro',
  contents: [{ role: 'user', parts: [{ text: structuredPrompt }, { fileData: { fileUri, mimeType } }] }],
  config: { temperature: 0.3, maxOutputTokens: 1024 },
});
```

**Fallback behavior:** When `VITE_GEMINI_API_KEY` is absent or the API call fails, the service automatically returns position-accurate mock data so the UI always demonstrates correctly.

---

## Adding Real Video Files

Place `.mp4` files in `public/reels/{player-slug}/`:

```
public/reels/celestin-kamdem/highlight.mp4
public/reels/celestin-kamdem/finishing.mp4
public/reels/celestin-kamdem/pace.mp4
```

Cards gracefully show a placeholder when a file is missing — no broken states.

---

## Design System

| Token             | Value         | Usage |
|-------------------|---------------|-------|
| `--color-bg`      | `#0b0f16`     | Page background |
| `--color-surface` | `#0f1623`     | Panel surfaces |
| `--color-card`    | `#121b2a`     | Card backgrounds |
| `--color-accent`  | `#4f7cff`     | Primary CTA, highlights |
| `--color-success` | `#2ecc71`     | High scores, complete states |
| `--color-warn`    | `#f59e0b`     | Mid-tier scores |
| `--color-danger`  | `#ef4444`     | Low scores |

Fonts: **Syne** (headings/scores) · **Inter** (body) · **JetBrains Mono** (terminal/JSON)

---

## Tech Stack

| Layer        | Library |
|--------------|---------|
| Framework    | React 18 |
| Build tool   | Vite 6 |
| Styling      | Tailwind CSS v4 (`@tailwindcss/vite`) |
| AI           | Google Gemini 1.5 Pro (`@google/genai` v1.9) |
| Fonts        | Google Fonts (Syne, Inter, JetBrains Mono) |

---

## License

MIT · BeOrchid Africa 2026
