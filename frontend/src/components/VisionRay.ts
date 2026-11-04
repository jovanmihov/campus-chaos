import Phaser from 'phaser';
import TileGrid, { TILE } from '../world/TileGrid';

export interface VisionRayOptions {
  /** Direction the sweep is centred on, in degrees: 0 = right, 90 = down, 180 = left, 270 = up. */
  facingDeg: number;
  /** Total angle swept, in degrees; the ray swings half of it to each side of `facingDeg`. */
  sweepDeg?: number;
  /** Time to swing across the sweep once, in ms. Swinging back takes the same time. */
  sweepMs?: number;
  /** How far it can see, in tiles. */
  range?: number;
  color?: number;
  /** The tile to watch for, e.g. the player's. The ray turns red while it passes through it. */
  watch?: () => { x: number; y: number };
}

const SEEN_COLOR = 0xff3344;

/**
 * A line of sight that slowly swings back and forth and stops at the first solid tile.
 * Attach it to anything that should look around: `eye` says where the ray starts each frame,
 * so it follows the owner if the owner moves.
 */
export default class VisionRay {
  /** Change this to turn the whole sweep, e.g. when the owner turns around. */
  facingDeg: number;
  /** True while the ray passes through the watched tile. */
  seen = false;
  private sweep: { offsetDeg: number };
  private range: number;
  private color: number;
  private watch?: () => { x: number; y: number };
  private gfx: Phaser.GameObjects.Graphics;
  private tween: Phaser.Tweens.Tween;

  constructor(
    private scene: Phaser.Scene,
    private grid: TileGrid,
    private eye: () => { x: number; y: number },
    { facingDeg, sweepDeg = 30, sweepMs = 2500, range = 10, color = 0xffe066, watch }: VisionRayOptions
  ) {
    this.facingDeg = facingDeg;
    this.watch = watch;
    this.range = range * TILE;
    this.color = color;
    this.gfx = scene.add.graphics().setDepth(4);   // under people and objects (depth 5)

    // Swing from one side to the other and back forever, easing at each end like a turning head
    this.sweep = { offsetDeg: -sweepDeg / 2 };
    this.tween = scene.tweens.add({
      targets: this.sweep,
      offsetDeg: sweepDeg / 2,
      duration: sweepMs,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.draw, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.draw, this);
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    this.tween.remove();
    this.gfx.destroy();
  }

  /** Redrawn every frame, since both the angle and the owner can change. */
  private draw(): void {
    const from = this.eye();
    const angle = Phaser.Math.DegToRad(this.facingDeg + this.sweep.offsetDeg);
    const target = this.watch?.();
    this.seen = false;
    const to = this.grid.castRay(from.x, from.y, angle, this.range, (tx, ty) => {
      if (target && tx === target.x && ty === target.y) this.seen = true;
    });

    const color = this.seen ? SEEN_COLOR : this.color;
    this.gfx
      .clear()
      .lineStyle(1, color, 0.9)
      .lineBetween(from.x, from.y, to.x, to.y)
      .fillStyle(color, 1)
      .fillCircle(to.x, to.y, 1.5);
  }
}
