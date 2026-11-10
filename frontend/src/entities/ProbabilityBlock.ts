import Phaser from 'phaser';
import type { Tile } from '../save';
import TileGrid, { TILE, tileCenter } from '../world/TileGrid';

// Placeholder look until it gets real art
const BODY_COLOR = 0xffd23f;
const OUTLINE_COLOR = 0x1c172e;

/** A solid one-tile block that the player walks up to in order to play the probability game. */
export default class ProbabilityBlock {
  constructor(
    scene: Phaser.Scene,
    grid: TileGrid,
    private tileX: number,
    private tileY: number
  ) {
    grid.block(tileX, tileY);

    scene.add
      .rectangle(tileCenter(tileX), tileCenter(tileY), TILE, TILE, BODY_COLOR)
      .setStrokeStyle(1, OUTLINE_COLOR)
      .setDepth(5);
  }

  /** True when `tile` touches this block, diagonals included. */
  isNextTo(tile: Tile): boolean {
    return Math.abs(tile.x - this.tileX) <= 1 && Math.abs(tile.y - this.tileY) <= 1;
  }
}
