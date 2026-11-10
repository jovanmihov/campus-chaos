import Phaser from 'phaser';

const DEPTH = 5.6;

export default class LaserBeam {
  private gfx: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private color: number
  ) {
    this.gfx = scene.add.graphics().setDepth(DEPTH);
  }

  aim(from: { x: number; y: number }, to: { x: number; y: number }): void {
    this.gfx
      .clear()
      .lineStyle(1, this.color, 0.9)
      .lineBetween(from.x, from.y, to.x, to.y)
      .fillStyle(this.color, 1)
      .fillCircle(to.x, to.y, 1.5);
  }

  off(): void {
    this.gfx.clear();
  }
}
