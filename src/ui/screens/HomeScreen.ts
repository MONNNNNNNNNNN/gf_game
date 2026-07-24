import { router } from '../../app/router';
import { eventBus } from '../../app/eventBus';
import { createButton } from '../components/Button';
import * as storage from '../../lib/storage';

export function mountHomeScreen(container: HTMLElement): () => void {
  const root = document.createElement('div');
  root.className =
    'h-full w-full flex flex-col items-center justify-center gap-8 bg-gradient-to-b from-pink-400 via-fuchsia-400 to-purple-500 px-6 text-center';

  const title = document.createElement('h1');
  title.className = 'text-5xl font-extrabold text-white drop-shadow-lg tracking-tight';
  title.textContent = 'Candy Loop';

  const subtitle = document.createElement('p');
  subtitle.className = 'text-white/90 text-lg -mt-4';
  subtitle.textContent = 'Match, relax, no rush';

  const highScoreEl = document.createElement('div');
  highScoreEl.className = 'text-white/95 font-semibold text-xl bg-black/20 rounded-full px-6 py-2';
  highScoreEl.textContent = `High score: ${storage.getHighScore()}`;

  const playBtn = createButton({
    label: 'Play',
    variant: 'secondary',
    className: '!text-2xl !px-12 !py-4',
    onClick: () => router.go('game'),
  });

  const leaderboardBtn = createButton({
    label: 'Leaderboard',
    variant: 'ghost',
    className: 'text-white/80 underline underline-offset-4',
    onClick: () => router.go('leaderboard'),
  });

  const settingsBtn = createButton({
    label: 'Settings',
    variant: 'ghost',
    className: 'text-white/80 underline underline-offset-4',
    onClick: () => eventBus.emit('settings:open', undefined),
  });

  root.append(title, subtitle, highScoreEl, playBtn, leaderboardBtn, settingsBtn);
  container.appendChild(root);

  const offReset = eventBus.on('highscore:reset', () => {
    highScoreEl.textContent = `High score: ${storage.getHighScore()}`;
  });

  return () => {
    offReset();
    root.remove();
  };
}
