import Phaser from 'phaser';
import Computer from '../entities/Computer';
import type DefensiveBlock from '../entities/defense/DefensiveBlock';
import DefensiveBuilding1 from '../entities/defense/DefensiveBuilding1';
import type Virus from '../entities/Virus';
import { startAutosave, type Tile } from '../save';
import BlockPlacer from '../ui/BlockPlacer';
import { addTextButton, disableTextButton, enableTextButton } from '../ui/TextButton';
import { damageRates, msToFirstDeath, SAME_MOMENT_MS } from '../world/targeting';
import TileGrid, { TILE } from '../world/TileGrid';
import VirusWave from '../world/VirusWave';

const GAME_OVER_MS = 2500;
const GAME_OVER_DEPTH = 10;

export default class ComputerDefenseScene extends Phaser.Scene {
  private cols = 0;
  private rows = 0;
  private campusTile?: Tile;
  private computer!: Computer;
  private wave!: VirusWave;
  private placer!: BlockPlacer;
  private gameOver = false;

  constructor() {
    super('ComputerDefenseScene');
  }

  init(data: { tile?: Tile; campusTile?: Tile }): void {
    this.campusTile = data.campusTile ?? data.tile;
  }

  create(): void {
    this.cols = Math.floor(this.scale.width / TILE);
    this.rows = Math.floor(this.scale.height / TILE);
    const tiles = new TileGrid(this.cols, this.rows);
    this.drawGround();
    this.computer = new Computer(this, tiles);

    startAutosave(() => ({ scene: this.scene.key, position: this.campusTile ?? { x: -1, y: -1 } }));

    addTextButton(this, 8, 8, '< Back to campus').on('pointerdown', () =>
      this.scene.start('CampusScene', { tile: this.campusTile })
    );

    this.placer = new BlockPlacer(this, tiles, [DefensiveBuilding1]);

    const waveButton = addTextButton(this, this.scale.width - 8, 8, 'Start wave').setOrigin(1, 0);
    const startWave = (): void => {
      this.wave.start(this.placer.placed);
      this.placer.setLocked(true);
      disableTextButton(waveButton, 'Wave running');
    };
    waveButton.on('pointerdown', startWave);

    this.gameOver = false;
    this.wave = new VirusWave(this, tiles, this.computer, () => {
      if (this.gameOver) return;
      this.placer.setLocked(false);
      enableTextButton(waveButton, 'Start wave').on('pointerdown', startWave);
    });
  }

  update(_time: number, delta: number): void {
    let left = delta;
    while (left > 0 && !this.gameOver) {
      const rates = this.damageRates();
      const toTile = this.wave.msToNextTile();
      let ms = Math.min(left, toTile, msToFirstDeath(rates, (virus) => virus.healthLeft));
      if (toTile - ms < SAME_MOMENT_MS) ms = toTile;
      this.advance(ms, rates);
      left -= ms;
    }
    for (const block of this.placer.placed) block.drawBeam();
  }

  private damageRates(): Map<Virus, number> {
    const locks: [DefensiveBlock, Virus][] = [];
    for (const block of this.placer.placed) {
      const target = block.target;
      if (target) locks.push([block, target]);
    }
    return damageRates(locks, this.wave.viruses.filter((virus) => virus.onBoard));
  }

  private advance(ms: number, rates: Map<Virus, number>): void {
    for (const [virus, rate] of rates) virus.damage(rate * ms);
    this.wave.advance(ms);

    for (const virus of this.wave.viruses) {
      if (this.computer.isHitBy(virus)) {
        this.computer.damage(virus.attack);
        virus.remove();
      }
    }

    for (const block of this.placer.placed) block.retarget(this.wave.viruses);
    if (this.computer.destroyed) this.endGame();
  }

  private endGame(): void {
    this.gameOver = true;
    this.wave.stop();
    this.placer.setLocked(true);
    for (const block of this.placer.placed) block.stop();

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setDepth(GAME_OVER_DEPTH).setInteractive();
    this.add
      .text(width / 2, height / 2, 'GAME OVER', {
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: '32px',
        color: '#ff5c5c',
      })
      .setOrigin(0.5)
      .setDepth(GAME_OVER_DEPTH);

    this.time.delayedCall(GAME_OVER_MS, () => this.scene.start('CampusScene', { tile: this.campusTile }));
  }

  private drawGround(): void {
    const gfx = this.add.graphics();
    const rnd = Phaser.Math.FloatBetween;

    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const color = Phaser.Display.Color.HSLToColor(rnd(0.27, 0.36), rnd(0.4, 0.6), rnd(0.3, 0.4));
        gfx.fillStyle(color.color, 1).fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }

    for (let i = 0; i < this.cols * this.rows; i++) {
      const color = Phaser.Display.Color.HSLToColor(rnd(0.25, 0.38), rnd(0.4, 0.7), rnd(0.2, 0.5));
      const size = Phaser.Math.Between(1, 3);
      gfx
        .fillStyle(color.color, 0.8)
        .fillRect(rnd(0, this.cols * TILE), rnd(0, this.rows * TILE), size, size);
    }
  }
}
