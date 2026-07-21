import type { ScreenName } from '../lib/types';
import { mountHomeScreen } from '../ui/screens/HomeScreen';
import { mountGameScreen } from '../ui/screens/GameScreen';

type UnmountFn = () => void;
type MountFn = (container: HTMLElement) => UnmountFn | void;

const screens: Record<ScreenName, MountFn> = {
  home: mountHomeScreen,
  game: mountGameScreen,
};

class Router {
  private container: HTMLElement | null = null;
  private unmountCurrent: UnmountFn | null = null;
  private current: ScreenName = 'home';

  init(container: HTMLElement): void {
    this.container = container;
  }

  go(screen: ScreenName): void {
    if (!this.container) throw new Error('Router not initialized');
    this.unmountCurrent?.();
    this.container.innerHTML = '';
    this.current = screen;
    const cleanup = screens[screen](this.container);
    this.unmountCurrent = cleanup ?? null;
  }

  get currentScreen(): ScreenName {
    return this.current;
  }
}

export const router = new Router();
