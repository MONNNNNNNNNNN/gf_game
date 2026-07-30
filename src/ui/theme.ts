import * as storage from '../lib/storage';

/** Single place that knows how dark mode is expressed in the DOM. Screens use the
 * `screen-warm` / `screen-cool` classes (see ui/styles/index.css); flipping this class on
 * <html> re-themes every mounted screen at once without re-mounting anything. */
export function applyDarkMode(enabled: boolean): void {
  document.documentElement.classList.toggle('dark', enabled);
}

export function initTheme(): void {
  applyDarkMode(storage.getDarkMode());
}
