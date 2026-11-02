export interface Level {
  level: number;
  title: string;
  emoji: string;
  minXP: number;
  maxXP: number;
  color: string;
}

export const LEVELS: Level[] = [
  { level: 1, title: 'Débutant',     emoji: '🌱', minXP: 0,    maxXP: 100,  color: '#94A3B8' },
  { level: 2, title: 'Apprenti',     emoji: '🌿', minXP: 100,  maxXP: 300,  color: '#4ADE80' },
  { level: 3, title: 'Citoyen',      emoji: '♻️', minXP: 300,  maxXP: 600,  color: '#1B6B3A' },
  { level: 4, title: 'Actif',        emoji: '⭐', minXP: 600,  maxXP: 1000, color: '#F59E0B' },
  { level: 5, title: 'Expert',       emoji: '🏆', minXP: 1000, maxXP: 1500, color: '#8B5CF6' },
  { level: 6, title: 'Ambassadeur',  emoji: '🦁', minXP: 1500, maxXP: 2500, color: '#EF4444' },
  { level: 7, title: 'Légende',      emoji: '👑', minXP: 2500, maxXP: 9999, color: '#D97706' },
];

export function getLevel(xp: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getNextLevel(xp: number): Level | null {
  const cur = getLevel(xp);
  return LEVELS.find(l => l.level === cur.level + 1) ?? null;
}

export function getLevelProgress(xp: number): number {
  const cur = getLevel(xp);
  const range = cur.maxXP - cur.minXP;
  return Math.min((xp - cur.minXP) / range, 1);
}

export function xpFromReports(validated: number, pending: number): number {
  return validated * 25 + pending * 5;
}
