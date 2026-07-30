import { router } from '../../app/router';
import { createButton } from '../components/Button';
import { getTopScores } from '../../lib/leaderboard';

export function mountLeaderboardScreen(container: HTMLElement): () => void {
  const root = document.createElement('div');
  root.className =
    'h-full w-full flex flex-col items-center gap-6 screen-cool px-6 pt-[max(2rem,env(safe-area-inset-top))] pb-8 text-white overflow-y-auto';

  const title = document.createElement('h1');
  title.className = 'text-3xl font-extrabold';
  title.textContent = 'Leaderboard';

  const statusEl = document.createElement('p');
  statusEl.className = 'text-white/70';
  statusEl.textContent = 'Loading…';

  const list = document.createElement('ol');
  list.className = 'w-full max-w-sm flex flex-col gap-2';

  const backBtn = createButton({
    label: 'Back',
    variant: 'secondary',
    className: 'mt-2',
    onClick: () => router.go('home'),
  });

  root.append(title, statusEl, list, backBtn);
  container.appendChild(root);

  let cancelled = false;
  getTopScores(10).then((entries) => {
    if (cancelled) return;
    if (entries.length === 0) {
      statusEl.textContent = 'No scores yet — be the first!';
      return;
    }
    statusEl.remove();
    entries.forEach((entry, i) => {
      const item = document.createElement('li');
      item.className = 'flex items-center justify-between bg-white/10 rounded-xl px-4 py-2';

      const rank = document.createElement('span');
      rank.className = 'font-bold w-8';
      rank.textContent = `#${i + 1}`;

      const name = document.createElement('span');
      name.className = 'flex-1 text-left truncate px-2';
      name.textContent = entry.nickname;

      const score = document.createElement('span');
      score.className = 'font-bold';
      score.textContent = String(entry.score);

      item.append(rank, name, score);
      list.appendChild(item);
    });
  });

  return () => {
    cancelled = true;
    root.remove();
  };
}
