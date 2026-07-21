import Phaser from 'phaser';
import { BoardScene } from './scenes/BoardScene';

let game: Phaser.Game | null = null;

export function createPhaserGame(parent: HTMLElement): Phaser.Game {
  destroyPhaserGame();
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    transparent: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth,
      height: parent.clientHeight,
    },
    scene: [BoardScene],
  });
  return game;
}

export function destroyPhaserGame(): void {
  game?.destroy(true);
  game = null;
}
