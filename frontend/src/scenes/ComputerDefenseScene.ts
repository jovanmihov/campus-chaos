import Phaser from 'phaser';
import Player from '../entities/Player';
import MovementKeys from '../input/MovementKeys';
import { startAutosave, type Tile } from '../save';
import TileGrid, { TILE } from '../world/TileGrid';

/**
 * Where viruses will attack a computer that the player defends.
 * For now the ground is a placeholder: every tile is a slightly different random shade of green.
 * It's exactly one screen big, so the camera never has to move.
 */
export default class ComputerDefenseScene extends Phaser.Scene {
  private player!: Player;
  private keys!: MovementKeys;
  private cols = 0;
  private rows = 0;
  private savedTile?: Tile;
  private campusTile?: Tile;

  constructor() {
    super('ComputerDefenseScene');
  }

  init(data: { tile?: Tile; campusTile?: Tile }): void {
    this.savedTile = data.tile;
    this.campusTile = data.campusTile;
  }

  preload(): void {
    // Loaded by CampusScene too, but a save can start the game straight in this scene
    if (!this.textures.exists('player')) {
      this.load.spritesheet('player', 'assets/player/student.png', { frameWidth: 32, frameHeight: 32 });
    }
  }

  create(): void {
    this.cols = Math.floor(this.scale.width / TILE);
    this.rows = Math.floor(this.scale.height / TILE);
    const tiles = new TileGrid(this.cols, this.rows);
    this.drawGround();

    const spawn: Tile = { x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) };
    const saved = this.savedTile;
    const start = saved && tiles.isWalkable(saved.x, saved.y) ? saved : spawn;
    this.player = new Player(this, tiles, start.x, start.y);
    startAutosave(() => ({ scene: this.scene.key, position: this.player.tile }));

    this.keys = new MovementKeys(this);
    this.addBackButton();
  }

  update(): void {
    const { dx, dy } = this.keys.direction();
    this.player.walk(dx, dy);
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

  private addBackButton(): void {
    const button = this.add
      .text(8, 8, '< Back to campus', {
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: '12px',
        color: '#e8e4f5',
        backgroundColor: '#241d3b',
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(7)
      .setInteractive({ useHandCursor: true });

    button.on('pointerover', () => button.setBackgroundColor('#4b3f70'));
    button.on('pointerout', () => button.setBackgroundColor('#241d3b'));
    button.on('pointerdown', () => this.scene.start('CampusScene', { tile: this.campusTile }));
  }
}
