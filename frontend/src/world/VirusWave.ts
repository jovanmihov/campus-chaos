import Phaser from 'phaser';
import type Computer from '../entities/Computer';
import type DefensiveBlock from '../entities/defense/DefensiveBlock';
import Virus, { STEP_MS, VIRUS_MAX_HEALTH } from '../entities/Virus';
import type TileGrid from './TileGrid';
import VirusPlanner from './VirusPlanner';

const WAVE_SIZE = 10;
const SPAWN_MS = STEP_MS;
const SPAWN_STEPS = SPAWN_MS / STEP_MS;
if (!Number.isInteger(SPAWN_STEPS)) {
  throw new Error(`SPAWN_MS (${SPAWN_MS}) must be a multiple of STEP_MS (${STEP_MS})`);
}


export default class VirusWave {
  private list: Virus[] = [];
  private planner: VirusPlanner | null = null;
  private elapsedMs = 0;
  private spawned = 0;

  constructor(
    private scene: Phaser.Scene,
    private grid: TileGrid,
    private computer: Computer,
    private onEnd: () => void
  ) {}

  get running(): boolean {
    return this.planner !== null;
  }

  get viruses(): readonly Virus[] {
    this.list = this.list.filter((v) => v.alive);
    return this.list;
  }

  /** Towers can't change while the wave runs, so every route is planned against these. */
  start(towers: readonly DefensiveBlock[]): void {
    if (this.running) return;
    this.planner = new VirusPlanner(this.grid, this.computer, towers, WAVE_SIZE * SPAWN_STEPS, STEP_MS);
    this.elapsedMs = 0;
    this.spawned = 0;
  }

  stop(): void {
    for (const virus of this.list) virus.remove();
    this.list = [];
    this.planner = null;
  }

  msToNextTile(): number {
    return this.running ? this.nextTileMs() - this.elapsedMs : Infinity;
  }

  advance(ms: number): boolean {
    const planner = this.planner;
    if (!planner) return false;

    const next = this.nextTileMs();
    const onTileChange = this.elapsedMs + ms >= next;
    this.elapsedMs = onTileChange ? next : this.elapsedMs + ms;

    for (const virus of this.viruses) virus.setClock(this.elapsedMs);

    while (this.spawned < WAVE_SIZE && this.elapsedMs >= this.spawned * SPAWN_MS) {
      const path = planner.route(this.spawned * SPAWN_STEPS, VIRUS_MAX_HEALTH);
      this.list.push(new Virus(this.scene, path, this.spawned, this.spawned * SPAWN_MS, this.elapsedMs));
      this.spawned++;
    }

    if (this.spawned === WAVE_SIZE && this.viruses.length === 0) {
      this.planner = null;
      this.onEnd();
    }
    return onTileChange;
  }

  private nextTileMs(): number {
    const half = STEP_MS / 2;
    return (Math.floor((this.elapsedMs - half) / STEP_MS) + 1) * STEP_MS + half;
  }
}
