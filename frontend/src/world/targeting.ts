import type { DefensiveBlockStats } from '../entities/defense/DefensiveBlock';
import type { Tile } from '../save';
import { withinTiles } from './TileGrid';

export const SAME_MOMENT_MS = 1e-6;

export interface Tower {
  readonly tileX: number;
  readonly tileY: number;
  readonly stats: DefensiveBlockStats;
}

export interface Target {
  readonly tile: Tile;
  readonly order: number;
}

export function canShoot(tower: Tower, tile: Tile): boolean {
  return withinTiles({ x: tower.tileX, y: tower.tileY }, tile, tower.stats.radius);
}

export function closestTarget<T extends Target>(tower: Tower, targets: Iterable<T>): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;
  for (const target of targets) {
    if (!canShoot(tower, target.tile)) continue;
    const dx = target.tile.x - tower.tileX;
    const dy = target.tile.y - tower.tileY;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance || (distance === bestDistance && best && target.order < best.order)) {
      best = target;
      bestDistance = distance;
    }
  }
  return best;
}

export function damageRates<T extends Target>(
  locks: Iterable<[Tower, T]>,
  onBoard: readonly T[]
): Map<T, number> {
  const rates = new Map<T, number>();
  for (const [tower, target] of locks) {
    const perMs = tower.stats.damagePerSecond / 1000;
    for (const other of onBoard) {
      if (withinTiles(target.tile, other.tile, tower.stats.damageRadius)) rates.set(other, (rates.get(other) ?? 0) + perMs);
    }
  }
  return rates;
}

export function msToFirstDeath<T>(rates: Map<T, number>, health: (target: T) => number): number {
  let ms = Infinity;
  for (const [target, rate] of rates) ms = Math.min(ms, health(target) / rate);
  return ms;
}
