import { eventBus } from '../../app/eventBus';
import { createModal } from './Modal';
import { createButton } from './Button';
import * as storage from '../../lib/storage';

export function mountSettingsModal(): void {
  const content = document.createElement('div');
  content.className = 'flex flex-col gap-5';

  const title = document.createElement('h2');
  title.className = 'text-xl font-bold';
  title.textContent = 'Settings';

  const soundRow = document.createElement('div');
  soundRow.className = 'flex items-center justify-between';
  const soundLabel = document.createElement('span');
  soundLabel.textContent = 'Sound';
  const soundToggle = document.createElement('button');
  soundToggle.type = 'button';

  function renderSoundToggle(): void {
    const enabled = storage.getSoundEnabled();
    soundToggle.textContent = enabled ? 'On' : 'Off';
    soundToggle.className = `px-4 py-1.5 rounded-full font-semibold ${
      enabled ? 'bg-pink-500 text-white' : 'bg-neutral-700 text-neutral-300'
    }`;
  }
  renderSoundToggle();

  soundToggle.addEventListener('click', () => {
    const next = !storage.getSoundEnabled();
    storage.setSoundEnabled(next);
    renderSoundToggle();
    eventBus.emit('settings:sound', { enabled: next });
  });
  soundRow.append(soundLabel, soundToggle);

  const colorblindRow = document.createElement('div');
  colorblindRow.className = 'flex items-center justify-between';
  const colorblindLabel = document.createElement('span');
  colorblindLabel.textContent = 'Colorblind symbols';
  const colorblindToggle = document.createElement('button');
  colorblindToggle.type = 'button';

  function renderColorblindToggle(): void {
    const enabled = storage.getColorblindMode();
    colorblindToggle.textContent = enabled ? 'On' : 'Off';
    colorblindToggle.className = `px-4 py-1.5 rounded-full font-semibold ${
      enabled ? 'bg-pink-500 text-white' : 'bg-neutral-700 text-neutral-300'
    }`;
  }
  renderColorblindToggle();

  colorblindToggle.addEventListener('click', () => {
    const next = !storage.getColorblindMode();
    storage.setColorblindMode(next);
    renderColorblindToggle();
    eventBus.emit('settings:colorblind', { enabled: next });
  });
  colorblindRow.append(colorblindLabel, colorblindToggle);

  const resetRow = document.createElement('div');
  resetRow.className = 'flex items-center justify-between';
  const resetLabel = document.createElement('span');
  resetLabel.textContent = 'High score';
  const resetBtn = createButton({ label: 'Reset', variant: 'secondary', className: '!px-4 !py-1.5 !text-base' });

  let armed = false;
  let armTimer: ReturnType<typeof setTimeout> | null = null;
  resetBtn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      resetBtn.textContent = 'Confirm?';
      armTimer = setTimeout(() => {
        armed = false;
        resetBtn.textContent = 'Reset';
      }, 2500);
      return;
    }
    storage.resetHighScore();
    armed = false;
    resetBtn.textContent = 'Reset';
    if (armTimer) clearTimeout(armTimer);
  });
  resetRow.append(resetLabel, resetBtn);

  const closeBtn = createButton({ label: 'Close', variant: 'primary', className: 'w-full' });

  content.append(title, soundRow, colorblindRow, resetRow, closeBtn);

  const modal = createModal({ content });
  closeBtn.addEventListener('click', () => modal.close());

  eventBus.on('settings:open', () => {
    renderSoundToggle();
    renderColorblindToggle();
    modal.open();
  });
}
