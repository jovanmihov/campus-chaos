import Phaser from 'phaser';
import TileGrid, { TILE, tileCenter } from '../../world/TileGrid';

export const OUTLINE_COLOR = 0x1c172e;
const DEPTH = 5;

export interface DefensiveBlockStats {
  damagePerSecond: number;
  radius: number;
  damageRadius: number;
}

export interface DefensiveBlockKind {
  readonly stats: DefensiveBlockStats;
  readonly color: number;
  new (scene: Phaser.Scene, grid: TileGrid, tileX: number, tileY: number): DefensiveBlock;
}

export default abstract class DefensiveBlock {
  protected readonly body: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    grid: TileGrid,
    readonly tileX: number,
    readonly tileY: number,
    readonly stats: DefensiveBlockStats,
    color: number
  ) {
    grid.block(tileX, tileY);

    this.body = scene.add
      .rectangle(tileCenter(tileX), tileCenter(tileY), TILE, TILE, color)
      .setStrokeStyle(1, OUTLINE_COLOR)
      .setDepth(DEPTH);
  }
}
