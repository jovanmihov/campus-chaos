import Phaser from 'phaser';
import Virus from '../entities/Virus';

const SPAWN_MS = 1000;

export default class VirusWave {
  private running = false;

  constructor(
    private scene: Phaser.Scene,
    private columns: number
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scene.time.addEvent({ delay: SPAWN_MS, loop: true, callback: () => this.spawn() });
  }

  private spawn(): void {
    new Virus(this.scene, Phaser.Math.Between(0, this.columns - 1));
  }
}
