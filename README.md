# Scout AI
Live URL: https://scout-ai-eta.vercel.app/
Demo Video URL: https://youtu.be/leuBvyUu7wE


Scout AI is a football talent discovery platform built for Africa. It gives grassroots players a way to get seen, and gives scouts a smarter way to find them.

There are two sides to the app. Players and coaches upload match footage through the portal. Scouts browse the other side - a grid of analyzed profiles, each with scores, radar charts, and video evidence for every metric.

---

## The problem we're solving

African football is full of talent that never gets discovered. Not because the players aren't good enough - but because scouts aren't there, and there's no infrastructure to bridge that gap. A 17-year-old playing in Johannesburg or Accra has almost no way to get a profile in front of a European academy. Scout AI changes that.

---

## How it works

A coach or player opens the upload portal, fills in the player's details, uploads a headshot, and drops in their match footage. The moment they hit Analyze, the following happens:

**1. Gemini 2.5 Flash reads the footage**
The video is sent to Google's Gemini 2.5 Flash model as raw multimodal input - not just extracted frames, but the actual video stream. If a headshot was uploaded, Gemini uses it as a reference photo to identify and track that specific player throughout the clip, even in a full team match. It then scores the player across 6 position-specific metrics (a striker gets finishing, pace, dribbling; a CB gets tackling, aerial, positioning - and so on).

**2. AI scores become a structured profile**
Gemini returns a JSON object with scores, scout notes, development areas, a potential rating, and a valuation bracket in EUR. The app parses this and builds the player's profile. If the API is overloaded, it retries automatically up to 4 times before falling back to realistic generated data so the flow never breaks.

**3. Clips are cut instantly**
Using the timestamps Gemini identifies in the footage, the app creates evidence clips for each metric using the browser's native video seek - no server, no encoding, just the exact moments that prove the score. A 79 dribbling score isn't just a number - there's a clip showing why.

**4. The profile appears on the scout side**
Once saved, the player appears in the Scout Intelligence grid. Scouts can filter by position, region, age, and score. Clicking a player opens their full profile: overview, radar chart, metric breakdowns with their evidence clips, and a clips tab with every highlight timestamped and labeled.

**5. Cloud rendering via Shotstack**
When a video gets uploaded to Supabase storage and has a public URL, Shotstack automatically renders permanent CDN-hosted clips in the background. These replace the local browser clips with polished, shareable versions - without the scout or player having to do anything.

---

## AI capabilities used

- **Gemini 2.5 Flash (Google)** - multimodal video analysis, player identification via reference photo, position-aware metric scoring, natural language scout notes
- **Shotstack** - automated cloud video rendering from AI-identified timestamps
- **IndexedDB + Supabase** - local-first profile storage with cloud sync, so profiles survive page refreshes and work offline

---

## Stack

- React 18 + Vite 6
- Tailwind CSS v4
- @google/genai SDK (Gemini 2.5 Flash)
- Supabase (storage + database)
- Shotstack (cloud clip rendering)
- @ffmpeg/ffmpeg (video compression for large files before upload)

---

## Running locally

```bash
npm install
npm run dev
```

Create a `.env.local` file with your keys:

```
GEMINI_API_KEY=your_key
GEMINI_API_KEY_2=your_backup_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SHOTSTACK_API_KEY=your_shotstack_key
SHOTSTACK_URL=https://api.shotstack.io/edit/stage/render
```

The app runs in demo mode with mock data if no Gemini key is set.


> **BeOrchid Africa 2026** · AI-powered dual-sided football scouting platform
> Built with React 18 + Vite 6 + Tailwind CSS v4 + Gemini 2.5 Flash

---

## Overview

Scout AI is a dual-sided talent discovery platform connecting grassroots African football players with elite scouts worldwide. Coaches upload match footage; scouts discover talent through an AI-analyzed profile grid with interactive radar charts, metric evidence clips, AI-generated scouting pitches, comparable professional players, and a live AI chat assistant.

```
Uploader Portal  →  Gemini 2.5 Flash analysis  →  Scout Intelligence Grid
```

---

## Architecture & Directory Structure

```
scout-ai/
├── public/
│   ├── headshots/                   # Player headshot images
│   └── reels/
│       └── {player-slug}/           # Per-player video clips (highlight.mp4, metric clips)
├── src/
│   ├── components/
│   │   ├── Navigation.jsx           # Dual-role top nav with Scout / Coach toggle
│   │   ├── ScoutDashboard.jsx       # Left nav sidebar + all scout views (grid, compare, reports, notes)
│   │   ├── PlayerCard.jsx           # Compact profile card with radar chart + watchlist toggle
│   │   ├── PlayerModal.jsx          # Full player detail modal (overview, metrics, highlights, clips, notes)
│   │   ├── ScoutChat.jsx            # Floating AI chat panel (Gemini 2.5 Flash conversational assistant)
│   │   ├── UploaderPortal.jsx       # Coach upload form with live Gemini terminal
│   │   └── VideoLightbox.jsx        # Full-screen metric evidence clip viewer
│   │   └── uploader/
│   │       └── AnalysisStatusCard.jsx  # Progress ring + live Gemini output terminal
│   ├── data/
│   │   └── mockPlayers.js           # 10 pre-loaded deep-data African player profiles
│   ├── hooks/
│   │   └── useLocalProfiles.js      # IndexedDB hook for local-first profile persistence
│   ├── services/
│   │   ├── geminiService.js         # Gemini 2.5 Flash multimodal analysis + streaming + mock fallback
│   │   ├── supabaseService.js       # Supabase DB read/write + storage upload
│   │   ├── supabaseClient.js        # Supabase client singleton
│   │   ├── dbService.js             # IndexedDB helpers
│   │   └── clipService.js           # Browser-side video clip extraction from timestamps
│   ├── App.jsx                      # Root state: role, modal, toast, watchlist, notes, reports
│   ├── main.jsx
│   └── index.css                    # Tailwind v4 + custom design tokens
├── server.js                        # Express proxy (keeps API keys server-side, handles Gemini SSE)
├── .env                             # Server-side env vars (see below)
├── package.json
└── README.md
```

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Add your keys to a .env file (optional - app works without them via mock data)
# See environment variables section below

# 3. Start development server (runs Express proxy + Vite concurrently)
npm run dev

# 4. Build for production
npm run build
```

---

## Feature Breakdown

### Uploader Portal (Coach side)
- Player details: name, age, region, position, height, preferred foot, current club/academy
- Anchor headshot upload — Gemini uses this as a facial reference to track the specific player in team footage
- Video input: native `.mp4` file upload or YouTube/TikTok URL
- Large files are uploaded to the Gemini Files API via the Express proxy; small files are inlined as base64
- FFmpeg compresses oversized files in-browser before upload
- Live Gemini token stream displayed in a terminal panel as analysis runs
- Auto-injects analyzed player into the Scout grid; syncs to Supabase if keys are set

### Scout Intelligence (Scout side)
- **Filter sidebar:** Position (grouped), Region, Age max, Overall score threshold
- **Persistent scout data (localStorage):** Watchlist, shortlist, per-player notes, generated reports, recently viewed, comparison slot
- **Player cards:** Radar chart, metric score bars, watchlist eye toggle, view count
- **Discover / Trending / Recently Added** sections on the dashboard home

### AI Scouting Pitch
Inside a player's profile modal, scouts can generate an AI scouting pitch with one click. Gemini 2.5 Flash writes a professional-grade written pitch for that player based on their scores, metrics, position, and scout notes. The pitch is saved locally and accessible from the **My Reports** section of the sidebar.

### Comparable Professional Player
The player profile overview surfaces an AI-identified comparable professional — a real-world footballer whose play style and attributes most closely match the analyzed player. This gives scouts an immediate frame of reference when evaluating grassroots talent.

### AI Scout Chat (ScoutChat)
A floating chat panel available to scouts at all times. Powered by Gemini 2.5 Flash, it lets scouts ask questions about players, request tactical breakdowns, get position advice, or explore the platform — all in a conversational interface. Messages stream in real time via SSE through the Express proxy. Runs in demo mode with a readable mock response if no API key is configured.

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

## Gemini 2.5 Flash Integration

`src/services/geminiService.js` sends requests through `server.js` (Express proxy) via SSE:

- **Video analysis** — multimodal input (video + optional headshot reference photo), position-aware scoring prompt, returns structured JSON with scores, scout notes, timestamps, comparable pro, and valuation
- **AI Pitch generation** — called from `PlayerModal.jsx`, streams a written scouting pitch to the reports store
- **ScoutChat** — open-ended conversational endpoint streamed via `/api/gemini/stream`
- **Fallback** — if no API key is set, analysis returns position-accurate mock data; chat streams a readable demo message

---

## Tech Stack

| Layer        | Library |
|--------------|---------|
| Framework    | React 18 |
| Build tool   | Vite 6 |
| Styling      | Tailwind CSS v4 (`@tailwindcss/vite`) |
| AI           | Google Gemini 2.5 Flash (`@google/genai`) |
| Database     | Supabase (PostgreSQL + Storage) |
| Video render | Shotstack (cloud CDN clips) |
| Video encode | @ffmpeg/ffmpeg (in-browser compression) |
| Server       | Express (API proxy, SSE streaming) |
| Fonts        | Google Fonts (Syne, Inter, JetBrains Mono) |

---

## Supabase Setup

The app saves player profiles to a `player_profiles` table and headshot/video files to a `profiles` storage bucket.

Run these migrations in the Supabase SQL editor if you haven't already:

```sql
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS height text;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS foot   text;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS club   text;
```

---

## License

MIT · BeOrchid Africa 2026
