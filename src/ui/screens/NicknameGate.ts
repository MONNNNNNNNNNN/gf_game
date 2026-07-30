import { createButton } from '../components/Button';
import * as storage from '../../lib/storage';

export function mountNicknameGate(container: HTMLElement, onDone: () => void): void {
  const root = document.createElement('div');
  root.className =
    'h-full w-full flex flex-col items-center justify-center gap-6 screen-warm px-6 text-center';

  const title = document.createElement('h1');
  title.className = 'text-3xl font-extrabold text-white drop-shadow-lg';
  title.textContent = 'What’s your name?';

  const subtitle = document.createElement('p');
  subtitle.className = 'text-white/90 text-base -mt-3';
  subtitle.textContent = 'Shows up on the leaderboard — you’ll only set this once.';

  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 20;
  input.placeholder = 'Nickname';
  input.className =
    'w-64 text-center text-lg px-4 py-3 rounded-full bg-white/95 text-purple-900 placeholder-purple-300 outline-none';

  const submitBtn = createButton({
    label: 'Let’s go',
    variant: 'secondary',
    className: '!text-xl !px-10 !py-3 opacity-50 pointer-events-none',
    onClick: () => {
      const name = input.value.trim();
      if (!name) return;
      storage.setNickname(name);
      root.remove();
      onDone();
    },
  });

  function updateSubmitState(): void {
    const valid = input.value.trim().length > 0;
    submitBtn.classList.toggle('opacity-50', !valid);
    submitBtn.classList.toggle('pointer-events-none', !valid);
  }
  input.addEventListener('input', updateSubmitState);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitBtn.click();
  });

  root.append(title, subtitle, input, submitBtn);
  container.appendChild(root);
  input.focus();
}
