import { eventBus } from '../../app/eventBus';
import { mountHud } from '../components/Hud';
import { createToast, type ToastHandle } from '../components/Toast';

const PLACEHOLDER_COLORS = [
  'bg-red-400',
  'bg-blue-400',
  'bg-green-400',
  'bg-yellow-400',
  'bg-purple-400',
  'bg-orange-400',
];

function renderPlaceholderGrid(): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-8 gap-1 w-full h-full p-2 bg-black/20 rounded-2xl';
  for (let i = 0; i < 64; i++) {
    const tile = document.createElement('div');
    const color = PLACEHOLDER_COLORS[Math.floor(Math.random() * PLACEHOLDER_COLORS.length)];
    tile.className = `${color} rounded-md aspect-square`;
    grid.appendChild(tile);
  }
  return grid;
}

interface DevActions {
  addScore: (delta: number) => void;
  bumpCombo: () => void;
  showStuckToast: () => void;
}

function mountDevPanel(container: HTMLElement, actions: DevActions): () => void {
  const panel = document.createElement('div');
  panel.className = 'absolute bottom-4 left-4 z-30 flex flex-col gap-1 opacity-70';

  const addScoreBtn = document.createElement('button');
  addScoreBtn.textContent = 'dev: +score';
  addScoreBtn.className = 'text-xs bg-black/50 text-white px-2 py-1 rounded';
  addScoreBtn.addEventListener('click', () => actions.addScore(120));

  const comboBtn = document.createElement('button');
  comboBtn.textContent = 'dev: combo';
  comboBtn.className = 'text-xs bg-black/50 text-white px-2 py-1 rounded';
  comboBtn.addEventListener('click', () => actions.bumpCombo());

  const stuckBtn = document.createElement('button');
  stuckBtn.textContent = 'dev: stuck toast';
  stuckBtn.className = 'text-xs bg-black/50 text-white px-2 py-1 rounded';
  stuckBtn.addEventListener('click', () => actions.showStuckToast());

  panel.append(addScoreBtn, comboBtn, stuckBtn);
  container.appendChild(panel);

  return () => panel.remove();
}

export function mountGameScreen(container: HTMLElement): () => void {
  const root = document.createElement('div');
  root.className =
    'relative h-full w-full flex items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-700 overflow-hidden';

  const gameContainer = document.createElement('div');
  gameContainer.id = 'game-container';
  gameContainer.className = 'w-[92vw] max-w-[480px] aspect-square';
  gameContainer.appendChild(renderPlaceholderGrid());

  root.appendChild(gameContainer);
  container.appendChild(root);

  const unmountHud = mountHud(root);
  const toast: ToastHandle = createToast(root);

  let score = 0;
  let combo = 1;

  function addScore(delta: number): void {
    score += delta;
    eventBus.emit('score:update', { score });
  }

  function bumpCombo(): void {
    combo += 1;
    eventBus.emit('combo:update', { combo });
  }

  const offRestart = eventBus.on('game:restart', () => {
    score = 0;
    combo = 1;
    eventBus.emit('score:update', { score });
    eventBus.emit('combo:update', { combo: 0 });
  });

  let devPanelCleanup: (() => void) | null = null;
  if (import.meta.env.DEV) {
    devPanelCleanup = mountDevPanel(root, {
      addScore,
      bumpCombo,
      showStuckToast: () => toast.show('No more moves — reshuffling…'),
    });
  }

  return () => {
    unmountHud();
    toast.destroy();
    devPanelCleanup?.();
    offRestart();
    root.remove();
  };
}
