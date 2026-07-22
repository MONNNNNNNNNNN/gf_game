-- Run this once in your Supabase project's SQL editor, then copy the
-- project URL and anon key into .env (see .env.example) to make the
-- leaderboard shared/global instead of local-only.

create table leaderboard_scores (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(nickname) between 1 and 20),
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);
alter table leaderboard_scores enable row level security;
create policy "anyone can read leaderboard" on leaderboard_scores for select using (true);
create policy "anyone can submit a score" on leaderboard_scores for insert with check (true);

create table run_analytics (
  id bigint generated always as identity primary key,
  nickname text,
  final_score integer,
  level integer,
  duration_sec numeric,
  items_picked text[],
  created_at timestamptz not null default now()
);
alter table run_analytics enable row level security;
create policy "anyone can log analytics" on run_analytics for insert with check (true);
-- intentionally no select policy - read this from the Supabase dashboard
-- directly when you want to look at balance data, not from the client.
