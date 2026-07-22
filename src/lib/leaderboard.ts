import { supabase, isBackendConfigured } from './supabaseClient';
import * as storage from './storage';

export interface LeaderboardEntry {
  nickname: string;
  score: number;
  createdAt: string;
}

export async function submitScore(nickname: string, score: number): Promise<void> {
  if (isBackendConfigured) {
    try {
      await supabase!.from('leaderboard_scores').insert({ nickname, score });
    } catch {
      // network hiccup - never block the run-summary UI on this
    }
  }
  storage.addLocalScore(nickname, score);
}

export async function getTopScores(limit = 10): Promise<LeaderboardEntry[]> {
  if (isBackendConfigured) {
    try {
      const { data, error } = await supabase!
        .from('leaderboard_scores')
        .select('nickname, score, created_at')
        .order('score', { ascending: false })
        .limit(limit);
      if (!error && data) {
        return data.map((row) => ({
          nickname: row.nickname as string,
          score: row.score as number,
          createdAt: row.created_at as string,
        }));
      }
    } catch {
      // fall through to local
    }
  }
  return storage.getLocalScores(limit);
}
