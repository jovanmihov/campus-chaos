import Phaser from 'phaser';
import Player from './Player';
import TileGrid, { TILE } from '../world/TileGrid';

type Pt = { x: number; y: number };
const key = (t: Pt) => `${t.x},${t.y}`;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const TINT = 0xff9090;
const CONE_COLOR = 0xffe066;
const SEEN_COLOR = 0xff3344;
const RANGE = 6 * TILE;
const FOV = Phaser.Math.DegToRad(70);
// 2° apart leaves gaps under half a tile at full range, so no tile slips between rays
const RAY_GAP = Phaser.Math.DegToRad(2);
const TURN_PER_MS = 0.006;                 // radians, so the cone swings round instead of snapping
const PAUSE_MS: [number, number] = [1000, 2500];

export function bfsPath(from: Pt, to: Pt, area: Set<string>): Pt[] {
  const prev = new Map<string, Pt | null>([[key(from), null]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    if (cur.x === to.x && cur.y === to.y) {
      const path: Pt[] = [];
      for (let t = cur; prev.get(key(t)); t = prev.get(key(t))!) path.unshift(t);
      return path;
    }
    for (const [dx, dy] of DIRS) {
      const next = { x: cur.x + dx, y: cur.y + dy };
      if (area.has(key(next)) && !prev.has(key(next))) {
        prev.set(key(next), cur);
        queue.push(next);
      }
    }
  }
  return [];
}

export default class Guard {
  seen = false;
  private body: Player;
  private area: Set<string>;
  private path: Pt[] = [];
  private waitUntil = 0;
  private facing = Math.PI / 2;            // radians, 0 = right; starts looking down
  private targetFacing = this.facing;
  private cone: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private grid: TileGrid,
    private room: Pt[],
    private watch: () => Pt
  ) {
    const start = Phaser.Utils.Array.GetRandom(room);
    this.body = new Player(scene, grid, start.x, start.y);
    this.body.figure.setTint(TINT);
    this.area = new Set(room.map(key));
    this.cone = scene.add.graphics().setDepth(4);
  }

  update(time: number, delta: number): void {
    this.patrol(time);
    this.facing = Phaser.Math.Angle.RotateTo(this.facing, this.targetFacing, TURN_PER_MS * delta);
    this.drawCone();
  }

  private patrol(time: number): void {
    if (this.path.length === 0) {
      if (time >= this.waitUntil) this.path = bfsPath(this.body.tile, Phaser.Utils.Array.GetRandom(this.room), this.area);
      return;
    }
    const here = this.body.tile;
    const dx = this.path[0].x - here.x;
    const dy = this.path[0].y - here.y;
    if (!this.body.walk(dx, dy)) return;   // still finishing the last step
    this.path.shift();
    this.targetFacing = Math.atan2(dy, dx);
    if (this.path.length === 0) this.waitUntil = time + Phaser.Math.Between(...PAUSE_MS);
  }

  private drawCone(): void {
    const eye = { x: this.body.root.x, y: this.body.root.y - TILE / 2 };   // root is at the feet
    const target = this.watch();
    const here = this.body.tile;
    this.seen = target.x === here.x && target.y === here.y;   // rays skip their start tile
    const points: Pt[] = [eye];
    for (let a = -FOV / 2; a <= FOV / 2 + 1e-6; a += RAY_GAP) {
      points.push(
        this.grid.castRay(
          eye.x,
          eye.y,
          this.facing + a,
          RANGE,
          (tx, ty) => {
            if (tx === target.x && ty === target.y) this.seen = true;
          },
          // Sight ends at the room's edge, so doors block it like walls
          (tx, ty) => this.area.has(`${tx},${ty}`)
        )
      );
    }
    this.cone
      .clear()
      .fillStyle(this.seen ? SEEN_COLOR : CONE_COLOR, 0.3)
      .fillPoints(points, true);
  }
}
