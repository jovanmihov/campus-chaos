import Phaser from 'phaser';
import TileGrid, { TILE } from '../world/TileGrid';

const BODY_COLOR = 0x000000;
const OUTLINE_COLOR = 0x1c172e;
const DEPTH = 5;

export default class Computer {
  readonly left: number;
  readonly top: number;
  readonly size: number;

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
  }
}
