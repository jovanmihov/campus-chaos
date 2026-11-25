import Phaser from 'phaser';
import LaserBeam from '../../components/LaserBeam';
import { canShoot, closestTarget } from '../../world/targeting';
import TileGrid, { TILE, tileCenter } from '../../world/TileGrid';
import type Virus from '../Virus';

export const OUTLINE_COLOR = 0x1c172e;
const DEPTH = 5;
const LIFTED_ALPHA = 0.35;

export interface DefensiveBlockStats {
  damagePerSecond: number;
  radius: number;
  damageRadius: number;
}

export interface DefensiveBlockKind {
  readonly stats: DefensiveBlockStats;
  readonly color: number;
  /** Spritesheet key; the animation with the same key plays while the block is shooting. */
  readonly texture: string;
  new (scene: Phaser.Scene, grid: TileGrid, tileX: number, tileY: number): DefensiveBlock;
}

export default abstract class DefensiveBlock {
  protected readonly body: Phaser.GameObjects.Sprite;
  private beam: LaserBeam;
  private lockedOn: Virus | null = null;

  constructor(
    scene: Phaser.Scene,
    private readonly grid: TileGrid,
    private _tileX: number,
    private _tileY: number,
    readonly stats: DefensiveBlockStats,
    color: number,
    private readonly texture: string
  ) {
    grid.block(_tileX, _tileY);

    this.body = scene.add
      .sprite(tileCenter(_tileX), tileCenter(_tileY), texture, 0)
      .setDisplaySize(TILE, TILE)
      .setDepth(DEPTH);
    this.beam = new LaserBeam(scene, color);
  }

  get tileX(): number {
    return this._tileX;
  }

  get tileY(): number {
    return this._tileY;
  }

  setLifted(lifted: boolean): void {
    this.body.setAlpha(lifted ? LIFTED_ALPHA : 1);
  }

  moveTo(tileX: number, tileY: number): void {
    this.grid.unblock(this._tileX, this._tileY);
    this._tileX = tileX;
    this._tileY = tileY;
    this.grid.block(tileX, tileY);
    this.body.setPosition(tileCenter(tileX), tileCenter(tileY));
  }

  get target(): Virus | null {
    return this.lockedOn?.onBoard ? this.lockedOn : null;
  }

  retarget(viruses: readonly Virus[]): void {
    const current = this.target;
    if (current && canShoot(this, current.tile)) return;
    this.lockedOn = closestTarget(this, viruses.filter((virus) => virus.onBoard));
  }

  drawBeam(): void {
    const target = this.target;
    if (target) {
      this.beam.aim(this.body, target);
      this.body.play(this.texture, true);
    } else {
      this.beam.off();
      this.body.stop().setFrame(0);
    }
  }

  stop(): void {
    this.lockedOn = null;
    this.beam.off();
    this.body.stop().setFrame(0);
  }
}
