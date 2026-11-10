import Phaser from 'phaser';
import TileGrid from '../../world/TileGrid';
import DefensiveBlock, { type DefensiveBlockStats } from './DefensiveBlock';

export default class DefensiveBuilding1 extends DefensiveBlock {
  static readonly stats: DefensiveBlockStats = { damagePerSecond: 5, radius: 4, damageRadius: 0 };
  static readonly color = 0x4fb3ff;       // placeholder look until it gets real art

  constructor(scene: Phaser.Scene, grid: TileGrid, tileX: number, tileY: number) {
    super(scene, grid, tileX, tileY, DefensiveBuilding1.stats, DefensiveBuilding1.color);
  }
}
