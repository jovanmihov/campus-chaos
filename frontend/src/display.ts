import Phaser from 'phaser';

export const SCALE = 4;

export function keepPixelated(scene: Phaser.Scene, key: string): void {
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
}
