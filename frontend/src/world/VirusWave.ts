import Phaser from 'phaser';
import Virus from '../entities/Virus';

const SPAWN_MS = 1000;

export default class VirusWave {
  private running = false;
  private list: Virus[] = [];

  constructor(
    private scene: Phaser.Scene,
    private columns: number
  ) {}

  get viruses(): readonly Virus[] {
    this.list = this.list.filter((v) => v.alive);
    return this.list;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scene.time.addEvent({ delay: SPAWN_MS, loop: true, callback: () => this.spawn() });
  }

  private spawn(): void {
    this.list.push(new Virus(this.scene, Phaser.Math.Between(0, this.columns - 1)));
  }
}
