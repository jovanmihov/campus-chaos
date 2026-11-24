import Phaser from 'phaser';
import { SCALE } from '../display';
import TileGrid, { TILE, tileCenter } from '../world/TileGrid';

const STEP_MS = 160;                      // time to walk one tile
const HOP_PX = 2 * SCALE;                        // how far the body lifts mid-step
const TILT_DEG = 5;                       // sway per step, alternating sides
const DEPTH = 6;                          // player is above watchers (5) and below UI (7)

// Frames of assets/player/student.png, left to right (32x32 each)
const FRAME = { diagonal: 0, front: 1, back: 2 };

/** Sprites are taller than a tile, so anchor them by the feet at the tile's bottom edge. */
function footY(t: number): number {
  return (t + 1) * TILE;
}

/** The player: a student who walks tile by tile across a TileGrid. */
export default class Player {
  /** Ground position (feet). The camera follows this, so it doesn't bob with each hop. */
  readonly root: Phaser.GameObjects.Container;
  private figure: Phaser.GameObjects.Sprite;
  private moving = false;
  private stepSide = 1;

  constructor(
    private scene: Phaser.Scene,
    private grid: TileGrid,
    private tileX: number,
    private tileY: number
  ) {
    const shadow = scene.add.ellipse(0, 0, 14 * SCALE, 5 * SCALE, 0x000000, 0.4);
    // student.png is old low-res art; drop the scale once it's redrawn at full size
    this.figure = scene.add.sprite(0, 0, 'player', FRAME.front).setOrigin(0.5, 1).setScale(SCALE);
    this.root = scene.add
      .container(tileCenter(tileX), footY(tileY), [shadow, this.figure])
      .setDepth(DEPTH);
  }

  get tile(): { x: number; y: number } {
    return { x: this.tileX, y: this.tileY };
  }

  walk(dx: number, dy: number): boolean {
    if (this.moving || (dx === 0 && dy === 0)) return false;

    const dir = this.pickStep(this.tileX, this.tileY, dx, dy);
    if (dir) this.startStep(dir.dx, dir.dy);
    // Fully blocked: still turn toward where the player pushed
    else this.face(dx, dy);
    return true;
  }

  /** Pick the frame for a direction; left-facing views are the right-facing ones mirrored. */
  private face(dx: number, dy: number): void {
    let frame: number;
    if (dy < 0) frame = FRAME.back;
    else if (dx === 0) frame = FRAME.front;
    else frame = FRAME.diagonal;
    this.figure.setFrame(frame);
    if (dx !== 0) this.figure.setFlipX(dx < 0);
  }

  private pickStep(x: number, y: number, dx: number, dy: number): { dx: number; dy: number } | null {
    if (this.canStep(x, y, dx, dy)) return { dx, dy };
    if (dx !== 0 && dy !== 0) {
      if (this.canStep(x, y, dx, 0)) return { dx, dy: 0 };
      if (this.canStep(x, y, 0, dy)) return { dx: 0, dy };
    }
    return null;
  }

  private canStep(x: number, y: number, dx: number, dy: number): boolean {
    if (!this.grid.isWalkable(x + dx, y + dy)) return false;
    if (dx !== 0 && dy !== 0) return this.grid.isWalkable(x + dx, y) && this.grid.isWalkable(x, y + dy);
    return true;
  }

  private startStep(dx: number, dy: number): void {
    this.moving = true;
    this.tileX += dx;
    this.tileY += dy;
    this.face(dx, dy);
    this.stepSide = -this.stepSide;

    this.scene.tweens.add({
      targets: this.root,
      x: tileCenter(this.tileX),
      y: footY(this.tileY),
      // Diagonal covers √2 tiles, so stretch the time to keep speed constant
      duration: STEP_MS * Math.hypot(dx, dy),
      // Hop and lean mid-step, swaying to the other side each step like footsteps
      onUpdate: (tw) => {
        const lift = Math.sin(tw.progress * Math.PI);
        this.figure.y = -lift * HOP_PX;
        this.figure.angle = lift * TILT_DEG * this.stepSide;
      },
      onComplete: () => {
        this.figure.setY(0).setAngle(0);
        this.moving = false;
      },
    });
  }
}
