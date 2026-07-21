export interface ToastHandle {
  show: (message: string, duration?: number) => void;
  hide: () => void;
  destroy: () => void;
}

export function createToast(container: HTMLElement): ToastHandle {
  const toast = document.createElement('div');
  toast.className =
    'fixed left-1/2 top-[max(1.5rem,env(safe-area-inset-top))] -translate-x-1/2 z-30 px-5 py-2.5 rounded-full bg-black/80 text-white text-sm font-medium opacity-0 -translate-y-3 pointer-events-none transition-all duration-300 whitespace-nowrap';
  container.appendChild(toast);

  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function show(message: string, duration = 1500): void {
    if (hideTimer) clearTimeout(hideTimer);
    toast.textContent = message;
    toast.classList.remove('opacity-0', '-translate-y-3');
    hideTimer = setTimeout(hide, duration);
  }

  function hide(): void {
    toast.classList.add('opacity-0', '-translate-y-3');
  }

  function destroy(): void {
    if (hideTimer) clearTimeout(hideTimer);
    toast.remove();
  }

  return { show, hide, destroy };
}
