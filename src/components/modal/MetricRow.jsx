// MetricRow.jsx — expandable metric row with inline clip players
import { useState } from 'react';
import { THEME, getScoreColor } from './theme.js';
import VideoHUD from './VideoHUD.jsx';

export default function MetricRow({ label, value, reel, clips = [], onPlay }) {
  const [open, setOpen] = useState(false);
  const col        = getScoreColor(value);
  const hasContent = clips.length > 0 || reel;

  return (
    <div style={{
      background:   THEME.colors.surfaceCard,
      border:       `1px solid ${THEME.colors.borderDim}`,
      borderRadius: THEME.radius.element,
      overflow:     'hidden',
    }}>
      {/* Header row — click to expand */}
      <div
        onClick={() => hasContent && setOpen(x => !x)}
        style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
          cursor: hasContent ? 'pointer' : 'default', transition: 'background 0.12s',
        }}
        onMouseEnter={e => { if (hasContent) e.currentTarget.style.background = THEME.colors.surfaceHover; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ flex: 1 }}>
          <div style={{
            fontWeight: 700, color: THEME.colors.textMain, fontSize: '0.88rem',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {label}
            {clips.length > 0 && (
              <span style={{
                fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.06em',
                color: THEME.colors.accentHigh,
                background: 'rgba(62,207,112,0.07)',
                border: `1px solid rgba(62,207,112,0.25)`,
                borderRadius: 3, padding: '1px 5px', textTransform: 'uppercase',
              }}>
                {clips.length} clip{clips.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ marginTop: 8, height: 4, background: THEME.colors.surfaceAlt, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${value}%`, height: '100%', background: col,
              borderRadius: 2, transition: 'width 0.4s cubic-bezier(0.1, 1, 0.1, 1)',
            }} />
          </div>
        </div>

        <div className="font-syne" style={{
          fontWeight: 800, fontSize: '1.5rem', color: col,
          letterSpacing: '-0.02em', flexShrink: 0,
        }}>
          {value}
        </div>

        {hasContent && (
          <span style={{
            color: THEME.colors.textDark, fontSize: '0.75rem',
            transition: 'transform 0.16s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0,
          }}>▼</span>
        )}
      </div>

      {/* Expanded content */}
      {open && (
        <div style={{
          borderTop: `1px solid ${THEME.colors.borderDim}`,
          padding: '14px 18px', background: THEME.colors.surfaceAlt,
        }}>
          {clips.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {clips.map((clip, i) => (
                <div key={i} style={{
                  border: `1px solid ${THEME.colors.borderDim}`,
                  borderRadius: THEME.radius.element, overflow: 'hidden',
                  background: THEME.colors.surfaceCard,
                }}>
                  <div style={{
                    padding: '6px 10px', borderBottom: `1px solid ${THEME.colors.borderDim}`,
                    background: THEME.colors.bgCanvas,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{
                      fontSize: '0.60rem', fontWeight: 700, letterSpacing: '0.06em',
                      color: THEME.colors.accentHigh, textTransform: 'uppercase',
                    }}>{clip.metric}</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: THEME.colors.textDark }}>
                      {clip.start} – {clip.end}
                    </span>
                  </div>
                  <VideoHUD metric={clip.metric}>
                    <video src={clip.url} controls preload="auto"
                      style={{ width: '100%', display: 'block', background: '#000', maxHeight: 200 }} />
                  </VideoHUD>
                  {clip.description && (
                    <div style={{ padding: '8px 10px', fontSize: '0.76rem', color: THEME.colors.textMuted, lineHeight: 1.45 }}>
                      {clip.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : reel ? (
            <button
              onClick={onPlay}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: THEME.colors.surfaceCard,
                border: `1px solid ${THEME.colors.borderMid}`,
                borderRadius: 4, padding: '6px 12px',
                cursor: 'pointer', color: THEME.colors.textMain,
                fontSize: '0.78rem', fontWeight: 600,
              }}
            >
              <span style={{ color: THEME.colors.accentHigh }}>▶</span> View Evidence
            </button>
          ) : (
            <span style={{ fontSize: '0.78rem', color: THEME.colors.textDark }}>
              No evidence clip for this metric.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
