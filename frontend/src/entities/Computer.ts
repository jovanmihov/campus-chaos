import Phaser from 'phaser';
import TileGrid, { TILE } from '../world/TileGrid';
import type Virus from './Virus';

const BODY_COLOR = 0x000000;
const OUTLINE_COLOR = 0x1c172e;
const HEALTH_COLOR = 0xff3344;
const HEALTH_BAR_HEIGHT = 3;
const MAX_HEALTH = 100;
const DEPTH = 5;

export default class Computer {
  readonly left: number;
  readonly top: number;
  readonly size: number;
  private health = MAX_HEALTH;
  private healthBar: Phaser.GameObjects.Rectangle;
  private healthText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, grid: TileGrid) {
    this.size = grid.width % 2 === 0 ? 4 : 3;
    this.left = (grid.width - this.size) / 2;
    this.top = grid.height - this.size;

    for (let x = this.left; x < this.left + this.size; x++) {
      for (let y = this.top; y < this.top + this.size; y++) {
        grid.block(x, y);
      }
    }

    scene.add
      .rectangle(this.left * TILE, this.top * TILE, this.size * TILE, this.size * TILE, BODY_COLOR)
      .setOrigin(0)
      .setStrokeStyle(1, OUTLINE_COLOR)
      .setDepth(DEPTH);

    this.healthBar = scene.add
      .rectangle(this.left * TILE, this.top * TILE - HEALTH_BAR_HEIGHT, this.size * TILE, HEALTH_BAR_HEIGHT, HEALTH_COLOR)
      .setOrigin(0)
      .setDepth(DEPTH);

    this.healthText = scene.add
      .text((this.left + this.size / 2) * TILE, (this.top + this.size / 2) * TILE, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH);
    this.showHealth();
  }

  isHitBy(virus: Virus): boolean {
    const { x } = virus.tile;
    return x >= this.left && x < this.left + this.size && virus.y + TILE / 2 >= this.top * TILE;
  }

  damage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    this.showHealth();
  }

  private showHealth(): void {
    this.healthBar.setScale(this.health / MAX_HEALTH, 1);
    this.healthText.setText(`${this.health}`);
  }
}
