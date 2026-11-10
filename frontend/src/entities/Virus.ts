import Phaser from 'phaser';
import { TILE, tileCenter } from '../world/TileGrid';
import type { Tile } from '../save';

// Placeholder look until it gets real art
const BODY_COLOR = 0xffffff;
const OUTLINE_COLOR = 0x1c172e;
const HEALTH_COLOR = 0xff3344;
const HEALTH_BAR_HEIGHT = 2;
const SPEED_PX_PER_S = 60;
const MAX_HEALTH = 10;
const DEPTH = 5;

export default class Virus {
  readonly attack = 5;
  private health = MAX_HEALTH;
  private body: Phaser.GameObjects.Rectangle;
  private healthBar: Phaser.GameObjects.Rectangle;
  private tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, column: number) {
    const startY = -TILE / 2;
    const endY = scene.scale.height + TILE / 2;

    this.body = scene.add
      .rectangle(tileCenter(column), startY, TILE, TILE, BODY_COLOR)
      .setStrokeStyle(1, OUTLINE_COLOR)
      .setDepth(DEPTH);

    this.healthBar = scene.add
      .rectangle(column * TILE, startY - TILE / 2 - HEALTH_BAR_HEIGHT, TILE, HEALTH_BAR_HEIGHT, HEALTH_COLOR)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH)
      .setVisible(false);

    this.tween = scene.tweens.add({
      targets: [this.body, this.healthBar],
      y: `+=${endY - startY}`,
      duration: ((endY - startY) / SPEED_PX_PER_S) * 1000,
      onComplete: () => this.remove(),
    });
  }

  get alive(): boolean {
    return this.body.active;
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  get tile(): Tile {
    return { x: Math.floor(this.body.x / TILE), y: Math.floor(this.body.y / TILE) };
  }

  damage(amount: number): void {
    if (!this.alive) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.remove();
      return;
    }
    this.healthBar.setVisible(true).setScale(this.health / MAX_HEALTH, 1);
  }

  remove(): void {
    this.tween.remove();
    this.body.destroy();
    this.healthBar.destroy();
  }
}
