import type Computer from '../entities/Computer';
import { VIRUS_DEAD_AT } from '../entities/Virus';
import type { Tile } from '../save';
import { canShoot, closestTarget, damageRates, msToFirstDeath, SAME_MOMENT_MS, type Tower } from './targeting';
import TileGrid from './TileGrid';

const EPSILON = 1e-6;
const MOVES = [-1, 0, 1];
/** How many of the DP's best routes get checked against the exact simulation, per matrix */
const CANDIDATES = 8;

/** How good a route is. Compared by `compare`, in this order. */
interface Score {
  /** Health left, higher is better */
  health: number;
  /** Steps to reach the computer, lower is better */
  steps: number;
  /** Diagonal moves, lower is better, so equally short routes zigzag as little as possible */
  diagonals: number;
}

/** Positive when a is better than b, negative when worse, 0 when they're equally good */
function compare(a: Score, b: Score): number {
  if (Math.abs(a.health - b.health) > EPSILON) return a.health - b.health;
  if (a.steps !== b.steps) return b.steps - a.steps;
  return b.diagonals - a.diagonals;
}

interface Plan {
  path: readonly Tile[];
  spawnStep: number;
  health: number;
}

interface SimVirus {
  plan: Plan;
  order: number;
  health: number;
  tile: Tile;
  /** False while it's not spawned yet, dead, or in the computer */
  onBoard: boolean;
  dead: boolean;
  arrived: boolean;
}

interface SimResult {
  viruses: SimVirus[];
  /** busyMs[tower][t], flattened: how long the tower spent shooting during step t */
  busyMs: Float64Array;
}

/**
 * Picks the route each virus of a wave takes, when it spawns.
 *
 * Time is counted in steps. A virus moves exactly one row per step and always spawns at the
 * start of a step, so the virus spawned at step s is on row y during step s + y.
 *
 * Towers follow the rules in targeting.ts: lock onto the closest virus, keep on it until it
 * dies or leaves range. Because of that lock, the damage a virus takes depends on what every
 * other virus does, so a matrix alone can't give it exactly. Planning a virus goes:
 *  1. Simulate the routes already planned, exactly as the game will play them.
 *  2. mat[x][y][t] = damage a virus on tile (x, y) during step t would take from the towers
 *     the simulation shows are free then. Towers busy with earlier viruses are the holes.
 *  3. Run the DP on mat (and on the full defense, with no holes) for the best few routes.
 *  4. Simulate each of those routes exactly and take the one that really ends up best.
 */
export default class VirusPlanner {
  private readonly cols: number;
  private readonly rows: number;
  private readonly steps: number;
  private readonly towers: Tower[];
  /** For each tile, the towers that can shoot it */
  private readonly coveredBy: number[][];
  /** Damage per step on each tile with every tower free, flattened like mat */
  private readonly full: Float64Array;
  /** mat[x][y][t], flattened to [t][y][x] */
  private mat: Float64Array;
  private readonly planned: Plan[] = [];

  constructor(
    private readonly grid: TileGrid,
    private readonly computer: Computer,
    towers: readonly Tower[],
    /** Number of steps over which the wave spawns its viruses */
    spawnSteps: number,
    private readonly stepMs: number
  ) {
    this.cols = grid.width;
    this.rows = grid.height;
    this.steps = spawnSteps + this.rows;
    // Towers can't change during a wave, but take a copy anyway
    this.towers = towers.map(({ tileX, tileY, stats }) => ({ tileX, tileY, stats }));

    this.coveredBy = Array.from({ length: this.cols * this.rows }, () => []);
    this.towers.forEach((tower, i) => {
      for (let y = 0; y < this.rows; y++) {
        for (let x = 0; x < this.cols; x++) {
          if (canShoot(tower, { x, y })) this.coveredBy[this.cell(x, y)].push(i);
        }
      }
    });

    this.full = this.matrix(new Float64Array(this.towers.length * this.steps));
    this.mat = this.full;
  }

  /** Damage a virus on tile (x, y) takes during step t, given the routes planned so far. */
  damageAt(x: number, y: number, t: number): number {
    return this.lookup(this.mat, x, y, t);
  }

  /**
   * Route for the virus that spawns at `spawnStep` with `health`. It runs from the top row to
   * the computer tile the virus hits, one tile per row.
   */
  route(spawnStep: number, health: number): Tile[] {
    const candidates = new Map<string, Tile[]>();
    for (const mat of [this.mat, this.full]) {
      for (const path of this.bestPaths(spawnStep, health, mat)) {
        candidates.set(path.map(({ x, y }) => `${x},${y}`).join(' '), path);
      }
    }
    // No way through: go straight down the middle, over whatever is in the way
    if (candidates.size === 0) candidates.set('', this.straightDown());

    let best: Score | null = null;
    let picks: { plan: Plan; sim: SimResult }[] = [];
    for (const path of candidates.values()) {
      const plan = { path, spawnStep, health };
      const sim = this.simulate([...this.planned, plan]);
      const self = sim.viruses[sim.viruses.length - 1];
      const score: Score = {
        // Arriving always beats dying. Among routes that die, the matrix says how badly.
        health: self.arrived ? self.health : Math.min(0, this.healthAlong(path, spawnStep, health, this.mat)),
        steps: path.length - 1,
        diagonals: countDiagonals(path),
      };
      const vs = best ? compare(score, best) : 1;
      if (vs > 0) {
        best = score;
        picks = [];
      }
      if (vs >= 0) picks.push({ plan, sim });
    }

    // Equally good routes: pick one at random so the wave doesn't all come down the same column
    const { plan, sim } = picks[Math.floor(Math.random() * picks.length)];
    this.planned.push(plan);
    this.mat = this.matrix(sim.busyMs);
    return [...plan.path];
  }

  /** Every virus planned so far, played out exactly as the game will. */
  predict(): { health: number; arrived: boolean }[] {
    return this.simulate(this.planned).viruses.map(({ health, arrived }) => ({ health, arrived }));
  }

  /**
   * Plays the wave out the way the game does: viruses change tile halfway through each step,
   * and towers re-pick the moment their target dies or leaves range.
   */
  private simulate(plans: readonly Plan[]): SimResult {
    const viruses: SimVirus[] = plans.map((plan, order) => ({
      plan,
      order,
      health: plan.health,
      tile: { x: -1, y: -1 },
      onBoard: false,
      dead: false,
      arrived: false,
    }));
    const locks: (SimVirus | null)[] = this.towers.map(() => null);
    const busyMs = new Float64Array(this.towers.length * this.steps);

    const onBoard = (): SimVirus[] => viruses.filter((v) => v.onBoard);
    const retarget = (): void => {
      const board = onBoard();
      this.towers.forEach((tower, i) => {
        const current = locks[i];
        if (current?.onBoard && canShoot(tower, current.tile)) return;
        locks[i] = closestTarget(tower, board);
      });
    };

    for (let t = 0; t < this.steps; t++) {
      // Start of step t: everyone moves onto their next tile
      for (const virus of viruses) {
        const i = t - virus.plan.spawnStep;
        if (virus.dead || virus.arrived || i < 0) continue;
        const tile = virus.plan.path[i];
        virus.tile = tile;
        virus.onBoard = !this.computer.covers(tile.x, tile.y);
        virus.arrived = !virus.onBoard;
      }
      retarget();

      // Through step t, splitting it at every death
      let left = this.stepMs;
      while (left > EPSILON) {
        const pairs: [Tower, SimVirus][] = [];
        this.towers.forEach((tower, i) => {
          const target = locks[i];
          if (target?.onBoard) pairs.push([tower, target]);
        });
        const rates = damageRates(pairs, onBoard());
        let ms = Math.min(left, msToFirstDeath(rates, (v) => v.health));
        const endOfStep = left - ms < SAME_MOMENT_MS;
        if (endOfStep) ms = left;

        for (const [virus, rate] of rates) {
          virus.health -= rate * ms;
          if (virus.health <= VIRUS_DEAD_AT) {
            virus.dead = true;
            virus.onBoard = false;
          }
        }
        this.towers.forEach((_, i) => {
          if (locks[i]) busyMs[i * this.steps + t] += ms;
        });
        // A death right at the end of the step is handled with the move, like in the game
        if (endOfStep) break;
        left -= ms;
        retarget();
      }
    }
    return { viruses, busyMs };
  }

  /** mat from how long each tower is busy each step: a tower only hurts you while it's free */
  private matrix(busyMs: Float64Array): Float64Array {
    const cells = this.cols * this.rows;
    const mat = new Float64Array(cells * this.steps);
    for (let t = 0; t < this.steps; t++) {
      for (let cell = 0; cell < cells; cell++) {
        let damage = 0;
        for (const i of this.coveredBy[cell]) {
          const freeMs = Math.max(0, this.stepMs - busyMs[i * this.steps + t]);
          damage += (this.towers[i].stats.damagePerSecond * freeMs) / 1000;
        }
        mat[t * cells + cell] = damage;
      }
    }
    return mat;
  }

  /**
   * Dynamic programming over (x, y), from every starting tile on the top row at once.
   * For each tile it keeps the best way to get there: most health left, then fewest
   * diagonal moves. The step a virus is on at row y is always spawnStep + y, so time doesn't
   * need its own dimension, and every route to a tile takes the same number of steps.
   * Returns the best few routes into the computer, ranked by `compare`.
   */
  private bestPaths(spawnStep: number, health: number, mat: Float64Array): Tile[][] {
    const { cols, rows } = this;
    const best = new Float64Array(cols * rows).fill(-Infinity);
    const diagonals = new Int32Array(cols * rows);
    const from = new Int32Array(cols * rows).fill(-1);

    for (let x = 0; x < cols; x++) {
      if (this.grid.isWalkable(x, 0)) best[x] = health - this.lookup(mat, x, 0, spawnStep);
    }

    const arrivals: { score: Score; last: number; hit: Tile }[] = [];

    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < cols; x++) {
        const here = this.cell(x, y);
        if (best[here] === -Infinity) continue;

        for (const dx of MOVES) {
          const nx = x + dx;
          const ny = y + 1;
          if (nx < 0 || nx >= cols) continue;
          const nd = diagonals[here] + (dx === 0 ? 0 : 1);

          if (this.computer.covers(nx, ny)) {
            arrivals.push({ score: { health: best[here], steps: ny, diagonals: nd }, last: here, hit: { x: nx, y: ny } });
            continue;
          }

          if (!this.grid.isWalkable(nx, ny)) continue;
          const next = this.cell(nx, ny);
          const candidate = { health: best[here] - this.lookup(mat, nx, ny, spawnStep + ny), steps: ny, diagonals: nd };
          const current = { health: best[next], steps: ny, diagonals: diagonals[next] };
          if (best[next] === -Infinity || compare(candidate, current) > 0) {
            best[next] = candidate.health;
            diagonals[next] = nd;
            from[next] = here;
          }
        }
      }
    }

    arrivals.sort((a, b) => compare(b.score, a.score));
    return arrivals.slice(0, CANDIDATES).map(({ last, hit }) => {
      const path: Tile[] = [hit];
      for (let cell = last; cell !== -1; cell = from[cell]) {
        path.push({ x: cell % cols, y: Math.floor(cell / cols) });
      }
      return path.reverse();
    });
  }

  private healthAlong(path: readonly Tile[], spawnStep: number, health: number, mat: Float64Array): number {
    let h = health;
    for (const { x, y } of path) {
      if (this.computer.covers(x, y)) break;
      h -= this.lookup(mat, x, y, spawnStep + y);
    }
    return h;
  }

  private straightDown(): Tile[] {
    const x = Math.floor(this.cols / 2);
    const path: Tile[] = [];
    for (let y = 0; y <= this.computer.top; y++) path.push({ x, y });
    return path;
  }

  private lookup(mat: Float64Array, x: number, y: number, t: number): number {
    if (t < 0 || t >= this.steps) return 0;
    return mat[t * this.cols * this.rows + this.cell(x, y)];
  }

  private cell(x: number, y: number): number {
    return y * this.cols + x;
  }
}

function countDiagonals(path: readonly Tile[]): number {
  let count = 0;
  for (let i = 1; i < path.length; i++) if (path[i].x !== path[i - 1].x) count++;
  return count;
}
