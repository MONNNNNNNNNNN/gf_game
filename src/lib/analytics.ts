import { supabase, isBackendConfigured } from './supabaseClient';

export interface RunAnalyticsEvent {
  nickname: string;
  finalScore: number;
  level: number;
  durationSec: number;
  itemsPicked: string[];
}

export async function logRunEnded(event: RunAnalyticsEvent): Promise<void> {
  if (!isBackendConfigured) return;
  try {
    await supabase!.from('run_analytics').insert({
      nickname: event.nickname,
      final_score: event.finalScore,
      level: event.level,
      duration_sec: event.durationSec,
      items_picked: event.itemsPicked,
    });
  } catch {
    // best-effort only, never blocks the run-summary UI
  }
}
