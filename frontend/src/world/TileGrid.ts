export const TILE = 16;

export function tileCenter(t: number): number {
  return t * TILE + TILE / 2;
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

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return !this.blocked.has(`${x},${y}`);
  }
}
