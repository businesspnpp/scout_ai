/**
 * mockPlayers.js — 10 pre-loaded deep-data profiles for Scout AI
 * Position-specific radar axes ensure each role is evaluated correctly.
 */

// ── Position group definitions ────────────────────────────────────────────────
export const POSITION_GROUPS = {
  ATTACKER: {
    keys:   ['finishing', 'pace', 'dribbling', 'positioning', 'workrate', 'heading'],
    labels: ['Finishing', 'Pace', 'Dribbling', 'Positioning', 'Work Rate', 'Heading'],
    colors: ['#f87171', '#34d399', '#60a5fa', '#a78bfa', '#22d3ee', '#fb923c'],
  },
  WINGER: {
    keys:   ['pace', 'dribbling', 'crossing', 'finishing', 'positioning', 'workrate'],
    labels: ['Pace', 'Dribbling', 'Crossing', 'Finishing', 'Positioning', 'Work Rate'],
    colors: ['#34d399', '#60a5fa', '#f59e0b', '#f87171', '#a78bfa', '#22d3ee'],
  },
  MIDFIELDER: {
    keys:   ['passing', 'pressResistance', 'positioning', 'workrate', 'dribbling', 'pace'],
    labels: ['Passing', 'Press Res.', 'Positioning', 'Work Rate', 'Dribbling', 'Pace'],
    colors: ['#fbbf24', '#38bdf8', '#a78bfa', '#22d3ee', '#60a5fa', '#34d399'],
  },
  DEFENSIVE_MID: {
    keys:   ['positioning', 'tackling', 'passing', 'workrate', 'pressResistance', 'pace'],
    labels: ['Positioning', 'Tackling', 'Passing', 'Work Rate', 'Press Res.', 'Pace'],
    colors: ['#a78bfa', '#6ee7b7', '#fbbf24', '#22d3ee', '#38bdf8', '#34d399'],
  },
  DEFENDER: {
    keys:   ['positioning', 'aerial', 'tackling', 'passing', 'pace', 'workrate'],
    labels: ['Positioning', 'Aerial', 'Tackling', 'Passing', 'Pace', 'Work Rate'],
    colors: ['#a78bfa', '#c084fc', '#6ee7b7', '#fbbf24', '#34d399', '#22d3ee'],
  },
  GOALKEEPER: {
    keys:   ['reflexes', 'positioning', 'distribution', 'aerial', 'command', 'sweeping'],
    labels: ['Reflexes', 'Positioning', 'Distribution', 'Aerial', 'Command', 'Sweeping'],
    colors: ['#4ade80', '#a78bfa', '#facc15', '#c084fc', '#818cf8', '#67e8f9'],
  },
};

export const POSITION_GROUP_MAP = {
  ST:  'ATTACKER',
  CAM: 'ATTACKER',
  RW:  'WINGER',
  LW:  'WINGER',
  CM:  'MIDFIELDER',
  CDM: 'DEFENSIVE_MID',
  CB:  'DEFENDER',
  RB:  'DEFENDER',
  LB:  'DEFENDER',
  GK:  'GOALKEEPER',
};

export const POS_COLORS = {
  ST:  '#f87171',
  CAM: '#f59e0b',
  CM:  '#60a5fa',
  CDM: '#a78bfa',
  RW:  '#34d399',
  LW:  '#22d3ee',
  CB:  '#cbd5e1',
  RB:  '#fb7185',
  LB:  '#93c5fd',
  GK:  '#fbbf24',
};

// ── 10 African player profiles ─────────────────────────────────────────────────
export const mockPlayers = [
  {
    id: 1,
    slug: 'celestin-kamdem',
    name: 'Celestin Kamdem',
    age: 18,
    pos: 'ST',
    country: 'Cameroon',
    flag: '🇨🇲',
    region: 'Central Africa',
    club: 'Yaoundé Stars',
    height: '182cm',
    foot: 'Right',
    overall: 90,
    aiMatch: 99,
    metrics: {
      finishing: 93, pace: 86, dribbling: 80,
      positioning: 85, workrate: 87, heading: 84,
    },
    bio: 'The standout profile on the entire platform. Raw power, elite pace, and a finishing record that speaks for itself. Three scouts viewed his profile this week. Exceptional ceiling for a player at 18.',
    tags: ['#1-ranked', 'elite-finishing', 'must-watch'],
    reels: {
      highlight: '/reels/celestin-kamdem/highlight.mp4',
      finishing:  '/reels/celestin-kamdem/finishing.mp4',
      pace:       '/reels/celestin-kamdem/pace.mp4',
      dribbling:  '/reels/celestin-kamdem/dribbling.mp4',
    },
    headshot: '/headshots/player1.jpg',
  },

  {
    id: 2,
    slug: 'oumar-coulibaly',
    name: 'Oumar Coulibaly',
    age: 18,
    pos: 'CAM',
    country: 'Mali',
    flag: '🇲🇱',
    region: 'West Africa',
    club: 'Bamako United',
    height: '175cm',
    foot: 'Both',
    overall: 89,
    aiMatch: 98,
    metrics: {
      finishing: 78, pace: 82, dribbling: 91,
      positioning: 84, workrate: 79, heading: 67,
    },
    bio: 'Technically gifted attacking midfielder comfortable with both feet — a rare quality at this level. Consistently the best player on the pitch in every observed match. Unlocks defences with a single touch.',
    tags: ['two-footed', 'elite-tech', 'game-changer'],
    reels: {
      highlight: '/reels/oumar-coulibaly/highlight.mp4',
      dribbling: '/reels/oumar-coulibaly/dribbling.mp4',
      passing:   '/reels/oumar-coulibaly/passing.mp4',
    },
    headshot: '/headshots/player2.jpg',
  },

  {
    id: 3,
    slug: 'kwame-mensah',
    name: 'Kwame Mensah',
    age: 19,
    pos: 'ST',
    country: 'Ghana',
    flag: '🇬🇭',
    region: 'West Africa',
    club: 'Accra Striders',
    height: '178cm',
    foot: 'Right',
    overall: 88,
    aiMatch: 97,
    metrics: {
      finishing: 91, pace: 87, dribbling: 73,
      positioning: 79, workrate: 83, heading: 70,
    },
    bio: 'Electric pace and clinical finishing from Accra. Led his district school league in goals for three consecutive seasons. Already drawing interest from two European academies.',
    tags: ['pace', 'clinical', 'box-threat'],
    reels: {
      highlight:  '/reels/kwame-mensah/highlight.mp4',
      finishing:  '/reels/kwame-mensah/finishing.mp4',
      pace:       '/reels/kwame-mensah/pace.mp4',
    },
    headshot: '/headshots/player3.jpg',
  },

  {
    id: 4,
    slug: 'ezra-mwangi',
    name: 'Ezra Mwangi',
    age: 18,
    pos: 'ST',
    country: 'Kenya',
    flag: '🇰🇪',
    region: 'East Africa',
    club: 'Mombasa Youth',
    height: '175cm',
    foot: 'Right',
    overall: 87,
    aiMatch: 95,
    metrics: {
      finishing: 88, pace: 89, dribbling: 79,
      positioning: 82, workrate: 85, heading: 72,
    },
    bio: 'Highest-rated U18 striker in East Africa this season. Combines raw pace with intelligent movement and consistent finishing. Three hat-tricks in eight observed matches.',
    tags: ['top-rated-u18', 'explosive', 'finisher'],
    reels: {
      highlight:  '/reels/ezra-mwangi/highlight.mp4',
      pace:       '/reels/ezra-mwangi/pace.mp4',
      finishing:  '/reels/ezra-mwangi/finishing.mp4',
    },
    headshot: '/headshots/player4.jpg',
  },

  {
    id: 5,
    slug: 'amara-diallo',
    name: 'Amara Diallo',
    age: 18,
    pos: 'CAM',
    country: 'Senegal',
    flag: '🇸🇳',
    region: 'West Africa',
    club: 'Dakar Rising',
    height: '174cm',
    foot: 'Left',
    overall: 85,
    aiMatch: 94,
    metrics: {
      finishing: 74, pace: 79, dribbling: 88,
      positioning: 83, workrate: 81, heading: 63,
    },
    bio: 'Sensational creative midfielder from Dakar. Vision and technical quality that belies his age. Dictates tempo and unlocks defences with elite passing range and dribbling that bewilders defenders.',
    tags: ['vision', 'creative', 'versatile'],
    reels: {
      highlight:  '/reels/amara-diallo/highlight.mp4',
      dribbling:  '/reels/amara-diallo/dribbling.mp4',
      passing:    '/reels/amara-diallo/passing.mp4',
    },
    headshot: '/headshots/player5.jpg',
  },

  {
    id: 6,
    slug: 'samuel-bekele',
    name: 'Samuel Bekele',
    age: 17,
    pos: 'LW',
    country: 'Ethiopia',
    flag: '🇪🇹',
    region: 'East Africa',
    club: 'Unattached',
    height: '170cm',
    foot: 'Left',
    overall: 83,
    aiMatch: 96,
    metrics: {
      pace: 88, dribbling: 85, crossing: 72,
      finishing: 71, positioning: 68, workrate: 82,
    },
    bio: 'The youngest player on the platform with perhaps the highest ceiling. Left-footed winger with natural flair and devastating 1v1 ability. Needs structure and coaching to reach full potential.',
    tags: ['raw-talent', 'flair', 'youngest'],
    reels: {
      highlight:  '/reels/samuel-bekele/highlight.mp4',
      pace:       '/reels/samuel-bekele/pace.mp4',
      dribbling:  '/reels/samuel-bekele/dribbling.mp4',
    },
    headshot: '/headshots/player6.jpg',
  },

  {
    id: 7,
    slug: 'lebo-molefe',
    name: 'Lebo Molefe',
    age: 19,
    pos: 'CM',
    country: 'South Africa',
    flag: '🇿🇦',
    region: 'Southern Africa',
    club: 'Soweto SC',
    height: '177cm',
    foot: 'Right',
    overall: 81,
    aiMatch: 88,
    metrics: {
      passing: 89, pressResistance: 84, positioning: 85,
      workrate: 88, dribbling: 75, pace: 72,
    },
    bio: 'Complete midfielder with exceptional reading of the game. Runs the midfield with discipline and quality. Outstanding work rate and press resistance — hallmarks of a modern Premier League profile.',
    tags: ['engine', 'passing', 'press-resistant'],
    reels: {
      highlight:  '/reels/lebo-molefe/highlight.mp4',
      passing:    '/reels/lebo-molefe/passing.mp4',
      workrate:   '/reels/lebo-molefe/workrate.mp4',
    },
    headshot: '/headshots/player7.jpg',
  },

  {
    id: 8,
    slug: 'yusuf-hassan',
    name: 'Yusuf Hassan',
    age: 21,
    pos: 'RW',
    country: 'Kenya',
    flag: '🇰🇪',
    region: 'East Africa',
    club: 'Nairobi Stars',
    height: '172cm',
    foot: 'Right',
    overall: 79,
    aiMatch: 85,
    metrics: {
      pace: 91, dribbling: 77, crossing: 75,
      finishing: 68, positioning: 75, workrate: 84,
    },
    bio: 'Blistering pace on the right flank. One of the fastest players on the platform — consistently hitting top sprints over 35 km/h. Devastating in behind and improving his final product significantly.',
    tags: ['explosive', 'direct', 'pace'],
    reels: {
      highlight:  '/reels/yusuf-hassan/highlight.mp4',
      pace:       '/reels/yusuf-hassan/pace.mp4',
      dribbling:  '/reels/yusuf-hassan/dribbling.mp4',
    },
    headshot: '/headshots/player8.jpg',
  },

  {
    id: 9,
    slug: 'kofi-asante',
    name: 'Kofi Asante',
    age: 22,
    pos: 'CDM',
    country: 'Ghana',
    flag: '🇬🇭',
    region: 'West Africa',
    club: 'Hearts Academy',
    height: '185cm',
    foot: 'Right',
    overall: 78,
    aiMatch: 82,
    metrics: {
      positioning: 88, tackling: 84, passing: 81,
      workrate: 91, pressResistance: 86, pace: 68,
    },
    bio: 'Commanding defensive midfielder who protects the back four brilliantly. His positioning and press-resistance stats rank in the top 5% of all CDMs on the platform. The team\'s first line of defence.',
    tags: ['defensive', 'positional', 'shield'],
    reels: {
      highlight:    '/reels/kofi-asante/highlight.mp4',
      positioning:  '/reels/kofi-asante/positioning.mp4',
      tackling:     '/reels/kofi-asante/tackling.mp4',
    },
    headshot: '/headshots/player9.jpg',
  },

  {
    id: 10,
    slug: 'emeka-obi',
    name: 'Emeka Obi',
    age: 20,
    pos: 'CB',
    country: 'Nigeria',
    flag: '🇳🇬',
    region: 'West Africa',
    club: 'Kano Academy',
    height: '190cm',
    foot: 'Right',
    overall: 77,
    aiMatch: 80,
    metrics: {
      positioning: 87, aerial: 88, tackling: 83,
      passing: 74, pace: 71, workrate: 85,
    },
    bio: 'Commanding centre-back with excellent aerial ability. Reads the game superbly and is composed in possession. Built for a high-pressing system. A future captain of his national team.',
    tags: ['aerial', 'composed', 'leader'],
    reels: {
      highlight:    '/reels/emeka-obi/highlight.mp4',
      aerial:       '/reels/emeka-obi/aerial.mp4',
      positioning:  '/reels/emeka-obi/positioning.mp4',
    },
    headshot: '/headshots/player10.jpg',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
export function getPositionGroup(pos) {
  return POSITION_GROUPS[POSITION_GROUP_MAP[pos]] ?? POSITION_GROUPS.ATTACKER;
}

export function getOverallColor(score) {
  if (score >= 88) return '#4f7cff';
  if (score >= 80) return '#f59e0b';
  if (score >= 72) return '#60a5fa';
  return 'rgba(231,237,247,0.70)';
}

export function getScoreTone(score) {
  if (score >= 85) return '#2ecc71';
  if (score >= 75) return '#f59e0b';
  if (score >= 65) return '#60a5fa';
  return '#ef4444';
}

export function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}
