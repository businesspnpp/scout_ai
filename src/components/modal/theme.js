// theme.js — shared design tokens for the PlayerModal system

export const THEME = {
  colors: {
    bgOverlay:    'rgba(7, 8, 10, 0.88)',
    bgCanvas:     '#0b0c10',
    surfaceCard:  '#111217',
    surfaceHover: '#17181f',
    surfaceAlt:   '#07080a',
    borderDim:    '#1f2026',
    borderMid:    '#2e303d',
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
