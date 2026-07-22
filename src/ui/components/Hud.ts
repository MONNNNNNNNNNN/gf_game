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

  const timerTrack = document.createElement('div');
  timerTrack.className = 'w-40 h-2 rounded-full bg-black/30 overflow-hidden mt-1';
  const timerFill = document.createElement('div');
  timerFill.className = 'h-full bg-emerald-400 transition-[width] duration-200';
  timerFill.style.width = '100%';
  timerTrack.appendChild(timerFill);

  const xpTrack = document.createElement('div');
  xpTrack.className = 'w-40 h-1.5 rounded-full bg-black/30 overflow-hidden mt-1';
  const xpFill = document.createElement('div');
  xpFill.className = 'h-full bg-sky-400 transition-[width] duration-200';
  xpFill.style.width = '0%';
  xpTrack.appendChild(xpFill);

  left.append(scoreEl, comboEl, timerTrack, xpTrack);

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

  const offTime = eventBus.on('run:timeUpdate', ({ remaining, max }) => {
    const pct = max > 0 ? Math.max(0, Math.min(100, (remaining / max) * 100)) : 0;
    timerFill.style.width = `${pct}%`;
    timerFill.classList.toggle('bg-emerald-400', pct > 50);
    timerFill.classList.toggle('bg-yellow-400', pct <= 50 && pct > 20);
    timerFill.classList.toggle('bg-red-500', pct <= 20);
  });

  const offXp = eventBus.on('run:xpUpdate', ({ xp, xpToNext }) => {
    const pct = xpToNext > 0 ? Math.max(0, Math.min(100, (xp / xpToNext) * 100)) : 0;
    xpFill.style.width = `${pct}%`;
  });

  return () => {
    offScore();
    offCombo();
    offTime();
    offXp();
    if (comboFadeTimer) clearTimeout(comboFadeTimer);
    hud.remove();
  };
}
