const HIGH_SCORE_KEY = 'gf_game.highScore';
const SOUND_KEY = 'gf_game.soundEnabled';
const COLORBLIND_KEY = 'gf_game.colorblindMode';
const NICKNAME_KEY = 'gf_game.nickname';
const LOCAL_SCORES_KEY = 'gf_game.localScores';
const MAX_LOCAL_SCORES = 20;

export interface LocalScoreEntry {
  nickname: string;
  score: number;
  createdAt: string;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable (e.g. Safari private mode) - fail silently, game still works this session
  }
}

export function getHighScore(): number {
  const raw = safeGet(HIGH_SCORE_KEY);
  return raw ? Number(raw) || 0 : 0;
}

export function setHighScoreIfBeaten(score: number): boolean {
  if (score > getHighScore()) {
    safeSet(HIGH_SCORE_KEY, String(score));
    return true;
  }
  return false;
}

export function resetHighScore(): void {
  safeSet(HIGH_SCORE_KEY, '0');
}

export function getSoundEnabled(): boolean {
  const raw = safeGet(SOUND_KEY);
  return raw === null ? true : raw === '1';
}

export function setSoundEnabled(enabled: boolean): void {
  safeSet(SOUND_KEY, enabled ? '1' : '0');
}

export function getColorblindMode(): boolean {
  return safeGet(COLORBLIND_KEY) === '1';
}

export function setColorblindMode(enabled: boolean): void {
  safeSet(COLORBLIND_KEY, enabled ? '1' : '0');
}

export function getNickname(): string | null {
  return safeGet(NICKNAME_KEY);
}

export function setNickname(name: string): void {
  safeSet(NICKNAME_KEY, name);
}

function getLocalScoresRaw(): LocalScoreEntry[] {
  const raw = safeGet(LOCAL_SCORES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addLocalScore(nickname: string, score: number): void {
  const list = getLocalScoresRaw();
  list.push({ nickname, score, createdAt: new Date().toISOString() });
  list.sort((a, b) => b.score - a.score);
  safeSet(LOCAL_SCORES_KEY, JSON.stringify(list.slice(0, MAX_LOCAL_SCORES)));
}

export function getLocalScores(limit = 10): LocalScoreEntry[] {
  return getLocalScoresRaw().slice(0, limit);
}
