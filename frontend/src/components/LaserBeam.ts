import Phaser from 'phaser';
import { SCALE } from '../display';

const DEPTH = 5.6;
const GLOW_WIDTH = 2.5 * SCALE;
const CORE_WIDTH = 0.75 * SCALE;
const TIP_RADIUS = 1.5 * SCALE;

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
      .lineStyle(GLOW_WIDTH, this.color, 0.25)
      .lineBetween(from.x, from.y, to.x, to.y)
      .lineStyle(CORE_WIDTH, this.color, 0.95)
      .lineBetween(from.x, from.y, to.x, to.y)
      .fillStyle(this.color, 1)
      .fillCircle(to.x, to.y, TIP_RADIUS);
  }

  off(): void {
    this.gfx.clear();
  }
}
