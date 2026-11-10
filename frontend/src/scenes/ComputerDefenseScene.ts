import Phaser from 'phaser';
import Computer from '../entities/Computer';
import DefensiveBuilding1 from '../entities/defense/DefensiveBuilding1';
import { startAutosave, type Tile } from '../save';
import BlockPlacer from '../ui/BlockPlacer';
import { addTextButton, disableTextButton } from '../ui/TextButton';
import TileGrid, { TILE } from '../world/TileGrid';
import VirusWave from '../world/VirusWave';

export default class ComputerDefenseScene extends Phaser.Scene {
  private cols = 0;
  private rows = 0;
  private campusTile?: Tile;

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
    new Computer(this, tiles);

    startAutosave(() => ({ scene: this.scene.key, position: this.campusTile ?? { x: -1, y: -1 } }));

    addTextButton(this, 8, 8, '< Back to campus').on('pointerdown', () =>
      this.scene.start('CampusScene', { tile: this.campusTile })
    );

    const wave = new VirusWave(this, this.cols);
    const waveButton = addTextButton(this, this.scale.width - 8, 8, 'Start wave').setOrigin(1, 0);
    waveButton.on('pointerdown', () => {
      wave.start();
      disableTextButton(waveButton, 'Wave running');
    });

    new BlockPlacer(this, tiles, [DefensiveBuilding1]);
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
