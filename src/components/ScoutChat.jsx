/**
 * ScoutChat.jsx — Global "Scout AI Executive Core" chat panel
 * Floating side-panel. Judges can ask anything about any player, compare,
 * filter, or get tactical assessments. Streams Gemini tokens live.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { mockPlayers } from '../data/mockPlayers.js';
import useBreakpoint from '../hooks/useBreakpoint.js';

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
          return <div key={i} style={{ fontWeight: 600, color: '#d4d8e0', fontSize: '0.79rem', marginTop: 10, marginBottom: 3 }}>{line.slice(3)}</div>;
        }
        if (/^\s*\|/.test(line)) {
          const isDiv = /^[\s|:-]+$/.test(line.replace(/\|/g, ''));
          if (isDiv) return null;
          const cells = line.split('|').filter((_, ci) => ci > 0 && ci < line.split('|').length - 1);
          return (
            <div key={i} style={{ display: 'flex', gap: 0, borderBottom: '1px solid #232529', padding: '3px 0' }}>
              {cells.map((cell, ci) => (
                <div key={ci} style={{ flex: 1, fontSize: '0.69rem', color: '#6b7280', padding: '1px 5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                ? <strong key={j} style={{ color: '#c4cdd8', fontWeight: 600 }}>{p}</strong>
                : <span key={j} style={{ color: '#9ba3af' }}>{p}</span>
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
export default function ScoutChat({ focusPlayer = null, localProfiles = [], blobUrls = {}, activeView = 'scouter' }) {
  const { isMobile } = useBreakpoint();
  const [open,      setOpen]      = useState(false);
  const [messages,  setMessages]  = useState([{
    role: 'ai',
    text: 'Scout AI Executive Core **online**.\n\nFull database access confirmed. I can run tactical assessments, cross-database player filters, head-to-head comparisons, and recruitment evaluations.\n\nWhat does the scout need?',
    id: 0,
  }]);
  const [input,     setInput]     = useState('');
  const [streaming, setStreaming] = useState(false);

  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const msgListRef = useRef(null);

  // Close panel when leaving scout view
  useEffect(() => {
    if (activeView !== 'scouter') setOpen(false);
  }, [activeView]);

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

  // Hide entirely when not on scout view (all hooks already called above)
  if (activeView !== 'scouter') return null;

  return (
    <>
      {/* ── Toggle button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close Scout AI' : 'Scout AI — Ask anything about the roster'}
        style={{
          position: 'fixed',
          bottom: isMobile ? 16 : 28,
          right: open ? (isMobile ? 16 : 406) : (isMobile ? 16 : 28),
          zIndex: 400,
          width: 48, height: 48,
          borderRadius: 10,
          background: open ? '#161820' : '#161c22',
          border: `1px solid ${open ? '#2e3038' : '#2e4038'}`,
          color: open ? '#4a5161' : '#7a9e8a',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
          transition: 'right 0.24s cubic-bezier(0.4,0,0.2,1), border-color 0.15s, color 0.15s, background 0.15s',
          boxShadow: open ? 'none' : '0 2px 8px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.borderColor = '#3d6050'; e.currentTarget.style.color = '#a0c8b0'; e.currentTarget.style.background = '#1a2220'; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.borderColor = '#2e4038'; e.currentTarget.style.color = '#7a9e8a'; e.currentTarget.style.background = '#161c22'; } }}
      >
        {open ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        ) : (
          <img
            src="/assets/ScoutAI-icon.png"
            alt="Scout AI"
            style={{ width: 28, height: 28, objectFit: 'contain', opacity: 0.9 }}
          />
        )}
      </button>

      {/* ── Side panel ── */}
      <div style={{
        position: 'fixed',
        top: 50, right: 0, bottom: 0,
        width: isMobile ? '100vw' : 380,
        background: '#111316',
        borderLeft: isMobile ? 'none' : '1px solid #232529',
        borderTop: isMobile ? '1px solid #232529' : 'none',
        display: 'flex', flexDirection: 'column',
        zIndex: 299,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.24s cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Header */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #1c1e24', flexShrink: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#d4d8e0', marginBottom: 3 }}>Scout AI</div>
          <div style={{ fontSize: '0.72rem', color: '#4a5161' }}>
            {focusName
              ? <>{focusName} &mdash; active context</>
              : <>{buildRoster(localProfiles, blobUrls).length} profiles &middot; full database access</>
            }
          </div>
        </div>

        {/* Message list */}
        <div
          ref={msgListRef}
          style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 6px', display: 'flex', flexDirection: 'column', gap: 16, scrollbarWidth: 'none' }}
        >
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: '0.66rem', color: '#3d4148', marginBottom: 4, fontWeight: 500 }}>
                {msg.role === 'user' ? 'You' : 'Scout AI'}
              </div>
              <div style={{
                maxWidth: '90%',
                padding: '9px 12px',
                borderRadius: msg.role === 'user' ? '6px 6px 2px 6px' : '2px 6px 6px 6px',
                background: msg.role === 'user' ? '#1c1e25' : '#17191f',
                border: '1px solid #232529',
              }}>
                {msg.role === 'ai'
                  ? <RenderMd text={msg.text || (msg.streaming ? '' : '…')} />
                  : <span style={{ fontSize: '0.80rem', color: '#c4cdd8', lineHeight: 1.65 }}>{msg.text}</span>
                }
                {msg.streaming && (
                  <span style={{ display: 'inline-block', width: 1, height: '0.85em', background: '#6b7280', marginLeft: 3, verticalAlign: 'text-bottom', animation: 'termBlink 0.8s step-end infinite' }} />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>

        {/* Suggested prompts */}
        {messages.filter(m => m.role === 'user').length === 0 && (
          <div style={{ padding: '8px 14px 10px', borderTop: '1px solid #1c1e24' }}>
            <div style={{ fontSize: '0.65rem', color: '#3d4148', marginBottom: 6, fontWeight: 500 }}>Suggestions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {suggestedPrompts.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  style={{
                    fontSize: '0.76rem', padding: '5px 8px', borderRadius: 3, textAlign: 'left',
                    border: 'none', background: 'transparent',
                    color: '#5c6370', cursor: 'pointer', lineHeight: 1.4,
                    transition: 'color 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#9ba3af'}
                  onMouseLeave={e => e.currentTarget.style.color = '#5c6370'}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '10px 12px 14px', borderTop: '1px solid #1c1e24', flexShrink: 0 }}>
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
              placeholder={streaming ? 'Responding…' : 'Ask anything about the roster…'}
              disabled={streaming}
              style={{
                flex: 1, resize: 'none', overflow: 'hidden',
                background: '#0d0d0f', border: '1px solid #232325', borderRadius: 5,
                padding: '8px 11px', fontSize: '0.82rem', color: '#d4d8e0',
                outline: 'none', lineHeight: 1.5, fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e  => e.target.style.borderColor = '#3d4148'}
              onBlur={e   => e.target.style.borderColor = '#232529'}
            />
            <button
              onClick={() => sendMessage()}
              disabled={streaming || !input.trim()}
              style={{
                flexShrink: 0, width: 34, height: 34,
                borderRadius: 5, border: '1px solid #232529',
                background: input.trim() && !streaming ? '#1c1e25' : 'transparent',
                color: input.trim() && !streaming ? '#9ba3af' : '#3d4148',
                cursor: streaming ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', transition: 'all 0.15s',
              }}
            >
              &uarr;
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
