interface ModalOptions {
  content: HTMLElement;
  onClose?: () => void;
}

export interface ModalHandle {
  element: HTMLElement;
  panel: HTMLElement;
  open: () => void;
  close: () => void;
  destroy: () => void;
}

export function createModal({ content, onClose }: ModalOptions): ModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className =
    'fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-200';

  const panel = document.createElement('div');
  panel.className =
    'bg-neutral-900 text-white rounded-2xl p-6 w-[90%] max-w-sm shadow-2xl scale-95 transition-transform duration-200';
  panel.appendChild(content);
  backdrop.appendChild(panel);

  function close(): void {
    backdrop.classList.add('opacity-0', 'pointer-events-none');
    panel.classList.add('scale-95');
    onClose?.();
  }

  function open(): void {
    backdrop.classList.remove('opacity-0', 'pointer-events-none');
    panel.classList.remove('scale-95');
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  document.body.appendChild(backdrop);

  return { element: backdrop, panel, open, close, destroy: () => backdrop.remove() };
}
