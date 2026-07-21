import { eventBus } from '../../app/eventBus';
import { mountHud } from '../components/Hud';
import { createToast } from '../components/Toast';

export function mountGameScreen(container: HTMLElement): () => void {
  const root = document.createElement('div');
  root.className =
    'relative h-full w-full flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-700 overflow-hidden';

  const gameContainer = document.createElement('div');
  gameContainer.id = 'game-container';
  gameContainer.className = 'w-[92vw] max-w-[480px] aspect-square touch-none';

  root.appendChild(gameContainer);
  container.appendChild(root);

  let destroyPhaserGame: (() => void) | null = null;
  let cancelled = false;
  import('../../game/PhaserApp').then(({ createPhaserGame, destroyPhaserGame: destroy }) => {
    if (cancelled) return;
    createPhaserGame(gameContainer);
    destroyPhaserGame = destroy;
  });

  const unmountHud = mountHud(root);
  const toast = createToast(root);

  const offStuck = eventBus.on('board:stuck', () => {
    toast.show('No more moves — reshuffling…');
  });
  const offReshuffled = eventBus.on('board:reshuffled', () => toast.hide());

  return () => {
    cancelled = true;
    offStuck();
    offReshuffled();
    unmountHud();
    toast.destroy();
    destroyPhaserGame?.();
    root.remove();
  };
}
