export const TILE = 16;

export function tileCenter(t: number): number {
  return t * TILE + TILE / 2;
}

function inCircle(dx: number, dy: number, radius: number): boolean {
  return dx * dx + dy * dy <= (radius + 0.5) ** 2;
}

export function circleOffsets(radius: number): { x: number; y: number }[] {
  const offsets: { x: number; y: number }[] = [];
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (inCircle(x, y, radius)) offsets.push({ x, y });
    }
  }
  return offsets;
}

export function withinTiles(a: { x: number; y: number }, b: { x: number; y: number }, radius: number): boolean {
  return inCircle(b.x - a.x, b.y - a.y, radius);
}

export default class TileGrid {
  private blocked = new Set<string>();

  constructor(
    readonly width: number,
    readonly height: number
  ) {}

  block(x: number, y: number): void {
    this.blocked.add(`${x},${y}`);
  }

  unblock(x: number, y: number): void {
    this.blocked.delete(`${x},${y}`);
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return !this.blocked.has(`${x},${y}`);
  }
  
  castRay(
    x0: number,
    y0: number,
    angle: number,
    maxDist: number,
    onTile?: (x: number, y: number) => void
  ): { x: number; y: number } {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let tx = Math.floor(x0 / TILE);
    let ty = Math.floor(y0 / TILE);
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;

    // Ray length needed to cross one whole tile sideways / up-down
    const deltaX = Math.abs(TILE / dx);
    const deltaY = Math.abs(TILE / dy);
    // Ray length to reach the first tile edge on each axis
    let nextX = dx === 0 ? Infinity : (dx > 0 ? (tx + 1) * TILE - x0 : x0 - tx * TILE) / Math.abs(dx);
    let nextY = dy === 0 ? Infinity : (dy > 0 ? (ty + 1) * TILE - y0 : y0 - ty * TILE) / Math.abs(dy);

    // Hop to whichever tile edge is closer, so every tile the ray crosses gets checked in order
    let dist = 0;
    while (true) {
      if (nextX < nextY) {
        tx += stepX;
        dist = nextX;
        nextX += deltaX;
      } else {
        ty += stepY;
        dist = nextY;
        nextY += deltaY;
      }
      if (dist >= maxDist) {
        dist = maxDist;
        break;
      }
      if (!this.isWalkable(tx, ty)) break;   // solid tiles block sight as well as walking
      onTile?.(tx, ty);
    }
    return { x: x0 + dx * dist, y: y0 + dy * dist };
  }
}
