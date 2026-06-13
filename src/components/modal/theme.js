// theme.js — shared design tokens for the PlayerModal system

export const THEME = {
  colors: {
    bgOverlay:    'rgba(7, 7, 8, 0.88)',
    bgCanvas:     '#0d0d0f',
    surfaceCard:  '#141416',
    surfaceHover: '#1a1a1d',
    surfaceAlt:   '#0a0a0c',
    borderDim:    '#1e1e21',
    borderMid:    '#2a2a2d',
    borderActive: '#3ecf70',
    accentHigh:   '#3ecf70',
    accentMid:    '#d4a850',
    accentLow:    '#e05353',
    textMain:     '#f0f1f3',
    textMuted:    '#8c909f',
    textDark:     '#4e515f',
  },
  radius: {
    card:    '10px',
    element: '4px',
    pill:    '2px',
  },
};

export function getScoreColor(val) {
  if (val >= 85) return THEME.colors.accentHigh;
  if (val >= 72) return THEME.colors.accentMid;
  return THEME.colors.textMuted;
}
