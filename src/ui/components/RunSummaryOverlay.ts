import { eventBus } from '../../app/eventBus';
import { router } from '../../app/router';
import { createButton } from './Button';
import * as storage from '../../lib/storage';

export function mountRunSummaryOverlay(container: HTMLElement): () => void {
  const overlay = document.createElement('div');
  overlay.className =
    'absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/70 text-white text-center px-6 opacity-0 pointer-events-none transition-opacity duration-300';

  const title = document.createElement('h2');
  title.className = 'text-3xl font-extrabold';
  title.textContent = 'Run complete!';

  const statsEl = document.createElement('p');
  statsEl.className = 'text-lg';

  const buttonsRow = document.createElement('div');
  buttonsRow.className = 'flex flex-col gap-3 mt-4 w-56';

  function hide(): void {
    overlay.classList.add('opacity-0', 'pointer-events-none');
  }

  const playAgainBtn = createButton({
    label: 'Play Again',
    variant: 'secondary',
    className: 'w-full',
    onClick: () => {
      hide();
      eventBus.emit('game:restart', undefined);
    },
  });
  const leaderboardBtn = createButton({
    label: 'Leaderboard',
    variant: 'ghost',
    className: 'w-full !text-white',
    onClick: () => router.go('leaderboard'),
  });
  const homeBtn = createButton({
    label: 'Home',
    variant: 'ghost',
    className: 'w-full !text-white',
    onClick: () => router.go('home'),
  });

  buttonsRow.append(playAgainBtn, leaderboardBtn, homeBtn);
  overlay.append(title, statsEl, buttonsRow);
  container.appendChild(overlay);

  const offEnded = eventBus.on('run:ended', ({ finalScore, level, durationSec }) => {
    const nickname = storage.getNickname() ?? 'Player';
    statsEl.textContent = `${nickname} — Score ${finalScore} — Level ${level} — ${Math.round(durationSec)}s survived`;
    overlay.classList.remove('opacity-0', 'pointer-events-none');
  });

  return () => {
    offEnded();
    overlay.remove();
  };
}
