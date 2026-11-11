import Phaser from 'phaser';
import { TILE, tileCenter } from '../world/TileGrid';
import type { Tile } from '../save';

export const STEP_MS = 250;
export const VIRUS_MAX_HEALTH = 10;
export const VIRUS_DEAD_AT = 1e-6;

// Placeholder look until it gets real art
const BODY_COLOR = 0xffffff;
const OUTLINE_COLOR = 0x1c172e;
const HEALTH_COLOR = 0xff3344;
const HEALTH_BAR_HEIGHT = 2;
const DEPTH = 5;

export default class Virus {
  readonly attack = 5;
  private health = VIRUS_MAX_HEALTH;
  private body: Phaser.GameObjects.Rectangle;
  private healthBar: Phaser.GameObjects.Rectangle;

  private elapsedMs = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly path: readonly Tile[],
    /** Spawn order within the wave, 0 for the first */
    readonly order: number,
    private readonly spawnMs: number,
    waveMs: number
  ) {
    this.body = scene.add.rectangle(0, 0, TILE, TILE, BODY_COLOR).setStrokeStyle(1, OUTLINE_COLOR).setDepth(DEPTH);

    this.healthBar = scene.add
      .rectangle(0, 0, TILE, HEALTH_BAR_HEIGHT, HEALTH_COLOR)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH)
      .setVisible(false);

    this.setClock(waveMs);
  }

  get healthLeft(): number {
    return this.health;
  }

  get alive(): boolean {
    return this.body.active;
  }

  get onBoard(): boolean {
    return this.alive && this.tile.y >= 0;
  }

  get x(): number {
    return this.body.x;
  }

  get y(): number {
    return this.body.y;
  }

  get tile(): Tile {
    return this.point(Math.floor(this.progress + 0.5));
  }

  setClock(waveMs: number): void {
    if (!this.alive) return;
    this.elapsedMs = waveMs - this.spawnMs;
    this.place();
  }

  damage(amount: number): void {
    if (!this.alive) return;
    this.health -= amount;
    if (this.health <= VIRUS_DEAD_AT) {
      this.remove();
      return;
    }
    this.healthBar.setVisible(true).setScale(this.health / VIRUS_MAX_HEALTH, 1);
  }

  remove(): void {
    this.body.destroy();
    this.healthBar.destroy();
  }

  private get progress(): number {
    return this.elapsedMs / STEP_MS - 1;
  }

  private place(): void {
    const progress = this.progress;
    if (progress >= this.path.length - 1) {
      this.remove();
      return;
    }

    const i = Math.floor(progress);
    const from = this.point(i);
    const to = this.point(i + 1);
    const f = progress - i;
    const x = tileCenter(from.x + (to.x - from.x) * f);
    const y = tileCenter(from.y + (to.y - from.y) * f);

    this.body.setPosition(x, y);
    this.healthBar.setPosition(x - TILE / 2, y - TILE / 2 - HEALTH_BAR_HEIGHT);
  }

  private point(i: number): Tile {
    return i < 0 ? { x: this.path[0].x, y: -1 } : this.path[Math.min(i, this.path.length - 1)];
  }
}
