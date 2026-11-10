import Phaser from 'phaser';
import { TILE, tileCenter } from '../world/TileGrid';

// Placeholder look until it gets real art
const BODY_COLOR = 0xffffff;
const OUTLINE_COLOR = 0x1c172e;
const SPEED_PX_PER_S = 60;
const DEPTH = 5;

export default class Virus {
  private body: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, column: number) {
    const startY = -TILE / 2;
    const endY = scene.scale.height + TILE / 2;

    this.body = scene.add
      .rectangle(tileCenter(column), startY, TILE, TILE, BODY_COLOR)
      .setStrokeStyle(1, OUTLINE_COLOR)
      .setDepth(DEPTH);

    scene.tweens.add({
      targets: this.body,
      y: endY,
      duration: ((endY - startY) / SPEED_PX_PER_S) * 1000,
      onComplete: () => this.body.destroy(),
    });
  }
}
