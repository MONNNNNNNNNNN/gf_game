import { eventBus } from '../../app/eventBus';
import { router } from '../../app/router';
import { createButton } from './Button';

export function mountHud(container: HTMLElement): () => void {
  const hud = document.createElement('div');
  hud.className =
    'absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]';

  const left = document.createElement('div');
  left.className = 'flex flex-col gap-1';

  const scoreEl = document.createElement('div');
  scoreEl.className = 'text-white font-bold text-2xl drop-shadow';
  scoreEl.textContent = 'Score: 0';

  const comboEl = document.createElement('div');
  comboEl.className =
    'text-yellow-300 font-bold text-lg opacity-0 scale-90 transition-all duration-200 drop-shadow';

  left.append(scoreEl, comboEl);

  const controls = document.createElement('div');
  controls.className = 'flex gap-2';

  const restartBtn = createButton({
    label: '↻',
    variant: 'ghost',
    className: 'w-11 h-11 !px-0 !py-0 text-xl rounded-full bg-black/30',
    onClick: () => eventBus.emit('game:restart', undefined),
  });

  const menuBtn = createButton({
    label: '⌂',
    variant: 'ghost',
    className: 'w-11 h-11 !px-0 !py-0 text-xl rounded-full bg-black/30',
    onClick: () => router.go('home'),
  });

  controls.append(restartBtn, menuBtn);
  hud.append(left, controls);
  container.appendChild(hud);

  const offScore = eventBus.on('score:update', ({ score }) => {
    scoreEl.textContent = `Score: ${score}`;
  });

  let comboFadeTimer: ReturnType<typeof setTimeout> | null = null;
  const offCombo = eventBus.on('combo:update', ({ combo }) => {
    if (combo <= 1) {
      comboEl.classList.add('opacity-0', 'scale-90');
      return;
    }
    comboEl.textContent = `Combo x${combo}`;
    comboEl.classList.remove('opacity-0', 'scale-90');
    if (comboFadeTimer) clearTimeout(comboFadeTimer);
    comboFadeTimer = setTimeout(() => comboEl.classList.add('opacity-0', 'scale-90'), 1200);
  });

  return () => {
    offScore();
    offCombo();
    if (comboFadeTimer) clearTimeout(comboFadeTimer);
    hud.remove();
  };
}
