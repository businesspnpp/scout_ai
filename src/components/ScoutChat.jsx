/**
 * ScoutChat.jsx — Global "Scout AI Executive Core" chat panel
 * Floating side-panel. Judges can ask anything about any player, compare,
 * filter, or get tactical assessments. Streams Gemini tokens live.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { mockPlayers } from '../data/mockPlayers.js';

// ── Build a lean roster snapshot for the system prompt ───────────────────────
function buildRoster(localProfiles, blobUrls) {
  const locals = localProfiles.map(m => ({
    name:             m.name,
    age:              m.age,
    position:         m.position,
    region:           m.region,
    overall:          m.analysis?.overallScore ?? 0,
    aiMatchConf:      m.analysis?.aiMatchConfidence ?? 0,
    metrics:          m.analysis?.metrics ?? {},
    potential:        m.analysis?.potential ?? '',
    scoutNotes:       m.analysis?.scoutNotes ?? '',
    valuationBracket: m.analysis?.valuationBracket ?? '',
    developmentAreas: m.analysis?.developmentAreas ?? [],
    _source: 'uploaded',
  }));

  const base = mockPlayers.map(p => ({
    name:       p.name,
    age:        p.age,
    position:   p.pos,
    region:     p.region ?? p.country,
    overall:    p.overall,
    metrics:    p.metrics,
    potential:  p.potential ?? '',
    scoutNotes: p.bio ?? '',
    _source: 'database',
  }));

  return [...locals, ...base];
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(focusPlayer, roster) {
  return `You are 'Scout AI Executive Core' — an advanced generative AI football sporting director, chief tactical analyst, and global talent acquisition engine natively integrated into Scout AI, a high-performance talent discovery ecosystem for African grassroots football prospects.

CONTEXTUAL DATA MATRIX:
${focusPlayer
  ? `ACTIVE PLAYER (currently open): ${JSON.stringify(focusPlayer)}`
  : 'No specific player in focus — queries span the full roster.'
}

FULL SCOUTING DATABASE (${roster.length} profiles):
${JSON.stringify(roster)}

OPERATIONAL RULES:
- TONE: Sharp, analytical, authoritative. Like a UEFA Pro License holder or European Sporting Director evaluating a multi-million-dollar talent pipeline.
- Use tactical vocabulary: half-spaces, progressive passes, low-block transitions, pressing triggers, structural anchoring, positional superiority, PPDA, xG involvement, etc.
- CAPABILITY 1 — TACTICAL QUERY: Reference exact metric scores to justify tactical conclusions about any player.
- CAPABILITY 2 — DATABASE FILTRATION: When asked to find players matching criteria, search the roster and return candidates with key stats and brief justification.
- CAPABILITY 3 — HEAD-TO-HEAD: Build a structured Markdown comparison table (with | col | col | format) when comparing two players. Conclude with a definitive statement on who fits a specific tactical setup better.
- BENCHMARKS: Compare prospects to real professionals at equivalent developmental stages — Thomas Partey, Wilfried Zaha, Michael Essien, Sadio Mané, Victor Osimhen, etc.
- If a player is not in the database: "Target not found in registry. Verify name or sync database."
- FORMAT: Use **bold** for key stats/player names, ## for section headers, and Markdown tables for comparisons. Keep answers punchy — no generic walls of prose.
- Never break character. You are the Scout AI Executive Core, not a generic assistant.`.trim();
}

// ── Lightweight Markdown renderer ─────────────────────────────────────────────
function RenderMd({ text }) {
  return (
    <div>
      {text.split('\n').map((line, i) => {
        if (/^## /.test(line)) {
          return <div key={i} style={{ fontWeight: 700, color: '#f0f1f3', fontSize: '0.82rem', marginTop: 10, marginBottom: 2 }}>{line.slice(3)}</div>;
        }
        if (/^\s*\|/.test(line)) {
          const isDiv = /^[\s|:-]+$/.test(line.replace(/\|/g, ''));
          if (isDiv) return null;
          const cells = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1);
          return (
            <div key={i} style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1e2735', padding: '3px 0' }}>
              {cells.map((cell, ci) => (
                <div key={ci} style={{ flex: 1, fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace', color: '#8c909f', padding: '1px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cell.trim()}
                </div>
              ))}
            </div>
          );
        }
        const parts = line.split(/\*\*(.+?)\*\*/g);
        return (
          <div key={i} style={{ lineHeight: 1.65, marginBottom: line === '' ? 5 : 0, fontSize: '0.80rem' }}>
            {parts.map((p, j) =>
              j % 2 === 1
                ? <strong key={j} style={{ color: '#3ecf70', fontWeight: 600 }}>{p}</strong>
                : <span key={j} style={{ color: '#b8beca' }}>{p}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SUGGESTED PROMPTS ─────────────────────────────────────────────────────────
const DEFAULT_PROMPTS = [
  'Who are the top 3 players in the database?',
  'Find me a fast winger under 20',
  'Compare the two best midfielders head-to-head',
  'Who has the highest development ceiling?',
];

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function ScoutChat({ focusPlayer = null, localProfiles = [], blobUrls = {} }) {
  const [open,      setOpen]      = useState(false);
  const [messages,  setMessages]  = useState([{
    role: 'ai',
    text: 'Scout AI Executive Core **online**.\n\nFull database access confirmed. I can run tactical assessments, cross-database player filters, head-to-head comparisons, and recruitment evaluations.\n\nWhat does the scout need?',
    id: 0,
  }]);
  const [input,     setInput]     = useState('');
  const [streaming, setStreaming] = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const msgListRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;
    setInput('');

    const userMsg = { role: 'user', text,         id: Date.now() };
    const aiMsg   = { role: 'ai',   text: '',      id: Date.now() + 1, streaming: true };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    setStreaming(true);

    try {
      const roster = buildRoster(localProfiles, blobUrls);
      const sysPrompt = buildSystemPrompt(focusPlayer, roster);

      // Include up to the last 8 messages as conversation context
      const historyLines = messages.slice(-8)
        .map(m => `${m.role === 'user' ? 'Scout' : 'AI Core'}: ${m.text}`)
        .join('\n\n');

      const fullPrompt = `${sysPrompt}\n\n---\nCONVERSATION HISTORY:\n${historyLines}\n\nScout: ${text}\n\nAI Core:`;

      const res = await fetch('/api/gemini/stream', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ parts: [{ text: fullPrompt }] }),
      });

      if (!res.ok) throw new Error(`${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]' || payload === '[MOCK]') break;
          if (!payload) continue;
          try {
            const { t, error } = JSON.parse(payload);
            if (error) throw new Error(error);
            if (t) setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, text: m.text + t } : m));
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === aiMsg.id ? { ...m, text: `Connection error (${err.message}). Ensure the server is running.` } : m
      ));
    } finally {
      setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, streaming: false } : m));
      setStreaming(false);
    }
  }, [input, streaming, messages, focusPlayer, localProfiles, blobUrls]);

  const focusName = focusPlayer
    ? (focusPlayer.name ?? focusPlayer.player?.name ?? 'Player')
    : null;

  const suggestedPrompts = focusName
    ? [
        `Is ${focusName} ready for CAF U20?`,
        `What's ${focusName}'s biggest tactical weakness?`,
        `Which European clubs would suit ${focusName}?`,
        `Compare ${focusName} to the rest of the database`,
      ]
    : DEFAULT_PROMPTS;

  return (
    <>
      {/* ── Toggle button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close Scout AI' : 'Scout AI Executive Core'}
        style={{
          position: 'fixed', bottom: 20,
          right: open ? 404 : 20,
          zIndex: 400,
          width: 46, height: 46, borderRadius: '50%',
          background: open ? '#111520' : '#0d1a14',
          border: `1px solid ${open ? '#3a3f54' : 'rgba(62,207,112,0.55)'}`,
          color: open ? '#50535f' : '#3ecf70',
          fontSize: '1.1rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? 'none' : '0 0 18px rgba(62,207,112,0.18)',
          transition: 'right 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s',
        }}
      >
        {open ? '✕' : '◈'}
      </button>

      {/* ── Side panel ── */}
      <div style={{
        position: 'fixed', top: 56, right: 0, bottom: 0,
        width: 390,
        background: '#08090e',
        borderLeft: '1px solid #1a1d27',
        display: 'flex', flexDirection: 'column',
        zIndex: 299,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Header */}
        <div style={{ padding: '13px 16px 10px', borderBottom: '1px solid #1a1d27', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3ecf70', display: 'inline-block', animation: 'termBlink 1.4s step-end infinite' }} />
            <span style={{ fontSize: '0.60rem', letterSpacing: '0.17em', textTransform: 'uppercase', color: '#3ecf70', fontWeight: 600 }}>Scout AI · Executive Core</span>
          </div>
          <div style={{ fontSize: '0.70rem', color: '#4a5568' }}>
            {focusName
              ? <>Active context: <span style={{ color: '#8c909f' }}>{focusName}</span></>
              : <>{buildRoster(localProfiles, blobUrls).length} profiles in registry · Full database access</>
            }
          </div>
        </div>

        {/* Message list */}
        <div
          ref={msgListRef}
          style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 4px', display: 'flex', flexDirection: 'column', gap: 14, scrollbarWidth: 'none' }}
        >
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3a3f54', marginBottom: 4 }}>
                {msg.role === 'user' ? 'Scout' : 'AI Core'}
              </div>
              <div style={{
                maxWidth: '92%',
                padding: '9px 12px',
                borderRadius: msg.role === 'user' ? '8px 8px 2px 8px' : '2px 8px 8px 8px',
                background: msg.role === 'user' ? 'rgba(62,207,112,0.05)' : '#0f1219',
                border: `1px solid ${msg.role === 'user' ? 'rgba(62,207,112,0.15)' : '#1a1d27'}`,
              }}>
                {msg.role === 'ai'
                  ? <RenderMd text={msg.text || (msg.streaming ? '' : '…')} />
                  : <span style={{ fontSize: '0.80rem', color: '#c8cdd8', lineHeight: 1.6 }}>{msg.text}</span>
                }
                {msg.streaming && (
                  <span style={{ display: 'inline-block', width: 7, height: '0.85em', background: '#3ecf70', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'termBlink 0.9s step-end infinite' }} />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>

        {/* Suggested prompts — shown until first user message */}
        {messages.filter(m => m.role === 'user').length === 0 && (
          <div style={{ padding: '8px 14px', display: 'flex', flexWrap: 'wrap', gap: 5, borderTop: '1px solid #1a1d27' }}>
            <div style={{ width: '100%', fontSize: '0.58rem', letterSpacing: '0.10em', textTransform: 'uppercase', color: '#3a3f54', marginBottom: 4 }}>Suggested queries</div>
            {suggestedPrompts.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                style={{
                  fontSize: '0.70rem', padding: '5px 9px', borderRadius: 4,
                  border: '1px solid #1a1d27', background: '#0f1219',
                  color: '#6b7280', cursor: 'pointer', lineHeight: 1.4, textAlign: 'left',
                  transition: 'border-color 0.1s, color 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(62,207,112,0.28)'; e.currentTarget.style.color = '#a0a8b4'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1d27'; e.currentTarget.style.color = '#6b7280'; }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div style={{ padding: '10px 12px 12px', borderTop: '1px solid #1a1d27', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder={streaming ? 'AI is responding…' : 'Ask the scout…'}
              disabled={streaming}
              style={{
                flex: 1, resize: 'none', overflow: 'hidden',
                background: '#0c0e14', border: '1px solid #1a1d27', borderRadius: 7,
                padding: '8px 11px', fontSize: '0.82rem', color: '#f0f1f3',
                outline: 'none', lineHeight: 1.5, fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e  => e.target.style.borderColor = 'rgba(62,207,112,0.35)'}
              onBlur={e   => e.target.style.borderColor = '#1a1d27'}
            />
            <button
              onClick={() => sendMessage()}
              disabled={streaming || !input.trim()}
              style={{
                flexShrink: 0, width: 36, height: 36,
                borderRadius: 7, border: '1px solid rgba(62,207,112,0.25)',
                background: streaming || !input.trim() ? 'transparent' : 'rgba(62,207,112,0.07)',
                color: '#3ecf70', fontSize: '1rem', cursor: streaming ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: (!input.trim() || streaming) ? 0.3 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              →
            </button>
          </div>
          <div style={{ fontSize: '0.60rem', color: '#2e3040', marginTop: 5, textAlign: 'right' }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </>
  );
}
