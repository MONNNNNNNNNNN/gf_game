import { eventBus, type ItemChoice } from '../../app/eventBus';
import { createModal } from './Modal';
import { createButton } from './Button';

export function mountLevelUpModal(): () => void {
  const content = document.createElement('div');
  content.className = 'flex flex-col gap-4';

  const title = document.createElement('h2');
  title.className = 'text-xl font-bold text-center';

  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'flex flex-col gap-3';

  const rerollBtn = createButton({
    label: 'Reroll choices',
    variant: 'ghost',
    className: 'text-sm text-white/70 underline underline-offset-4 self-center hidden',
    onClick: () => eventBus.emit('run:rerollRequested', undefined),
  });

  content.append(title, cardsContainer, rerollBtn);

  const modal = createModal({ content });

  function renderChoices(choices: ItemChoice[]): void {
    cardsContainer.innerHTML = '';
    for (const choice of choices) {
      const card = createButton({
        label: '',
        variant: 'secondary',
        className: '!flex !flex-col !items-start !gap-1 !text-left !py-3',
        onClick: () => eventBus.emit('run:choiceMade', { itemId: choice.itemId }),
      });
      const nameEl = document.createElement('div');
      nameEl.className = 'font-bold';
      nameEl.textContent = choice.isUpgrade ? `${choice.name} → Lv.${choice.nextLevel}` : choice.name;
      const descEl = document.createElement('div');
      descEl.className = 'text-sm font-normal opacity-80';
      descEl.textContent = choice.description;
      card.append(nameEl, descEl);
      cardsContainer.appendChild(card);
    }
  }

  const offLevelUp = eventBus.on('run:levelUp', ({ level, choices, rerollAvailable }) => {
    title.textContent = `Level ${level}! Choose one:`;
    renderChoices(choices);
    rerollBtn.classList.toggle('hidden', !rerollAvailable);
    modal.open();
  });

  const offResumed = eventBus.on('run:resumed', () => modal.close());

  return () => {
    offLevelUp();
    offResumed();
    modal.destroy();
  };
}
