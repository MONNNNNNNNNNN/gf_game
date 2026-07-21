const HIGH_SCORE_KEY = 'gf_game.highScore';
const SOUND_KEY = 'gf_game.soundEnabled';

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
