import Phaser from 'phaser';
import LaserBeam from '../../components/LaserBeam';
import TileGrid, { TILE, tileCenter, withinTiles } from '../../world/TileGrid';
import type Virus from '../Virus';

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
  private beam: LaserBeam;
  private target: Virus | null = null;

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
    this.beam = new LaserBeam(scene, color);
  }

  update(deltaMs: number, viruses: readonly Virus[]): void {
    if (!this.target || !this.target.alive || !this.inRange(this.target)) {
      this.target = this.pickTarget(viruses);
    }
    const target = this.target;
    if (!target) {
      this.beam.off();
      return;
    }

    this.beam.aim(this.body, target);

    const damage = (this.stats.damagePerSecond * deltaMs) / 1000;
    const center = target.tile;
    for (const virus of viruses) {
      if (withinTiles(center, virus.tile, this.stats.damageRadius)) virus.damage(damage);
    }
  }

  private inRange(virus: Virus): boolean {
    return withinTiles({ x: this.tileX, y: this.tileY }, virus.tile, this.stats.radius);
  }

  private pickTarget(viruses: readonly Virus[]): Virus | null {
    let best: Virus | null = null;
    for (const virus of viruses) {
      if (virus.alive && this.inRange(virus) && (!best || virus.y > best.y)) best = virus;
    }
    return best;
  }
}
