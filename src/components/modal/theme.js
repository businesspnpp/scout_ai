// theme.js — shared design tokens for the PlayerModal system

export const THEME = {
  colors: {
    bgOverlay:    'rgba(7,13,8,0.92)',
    bgCanvas:     '#070D08',
    surfaceCard:  '#0F1A10',
    surfaceHover: '#162118',
    surfaceAlt:   '#0A1209',
    borderDim:    '#253328',
    borderMid:    '#3D5C41',
    borderActive: '#B8874A',
    accentHigh:   '#B8874A',
    accentMid:    '#B8874A',
    accentLow:    '#8B3A3A',
    textMain:     '#E8E4DC',
    textMuted:    '#7A8E7D',
    textDark:     '#4A5E4D',
  },
  radius: {
    card:    '2px',
    element: '2px',
    pill:    '2px',
  },
};

export function getScoreColor(val) {
  if (val >= 85) return THEME.colors.textMain;
  if (val >= 72) return THEME.colors.textMain;
  return THEME.colors.textMuted;
}
