import Phaser from 'phaser';
import Player from '../entities/Player';
import MovementKeys from '../input/MovementKeys';
import Minimap from '../ui/Minimap';
import TileGrid, { TILE } from '../world/TileGrid';

export default class CampusScene extends Phaser.Scene {
  private player!: Player;
  private keys!: MovementKeys;
  private minimap?: Minimap;

  constructor() {
    super('CampusScene');
  }

  preload(): void {
    this.load.image('map', 'assets/campus__v3.png');
    this.load.spritesheet('player', 'assets/player/student.png', { frameWidth: 32, frameHeight: 32 });
  }

  create(): void {
    // --- 1. The map image ---
    const bg = this.add.image(0, 0, 'map').setOrigin(0, 0);
    const tiles = new TileGrid(Math.floor(bg.width / TILE), Math.floor(bg.height / TILE));

    // --- 2. Solid tiles (example: a building at x 10-14, y 4-7) ---
    for (let x = 10; x <= 14; x++) {
      for (let y = 4; y <= 7; y++) {
        //tiles.block(x, y);
      }
    }

    // --- 3. Debug grid: shows tile coordinates; delete when done ---
    this.add
      .grid(0, 0, bg.width, bg.height, TILE, TILE)
      .setOrigin(0, 0)
      .setOutlineStyle(0xffffff, 0.3);

    // --- 4. Player ---
    this.player = new Player(this, tiles, 5, 5);

    // --- 5. Camera ---
    const cam = this.cameras.main;
    cam.setBounds(0, 0, bg.width, bg.height);
    cam.startFollow(this.player.root, true);

    // --- 6. Input ---
    this.keys = new MovementKeys(this);

    // --- 7. Minimap ---
    //this.minimap = new Minimap(this, 'map', this.player.root);
  }

  update(): void {
    const { dx, dy } = this.keys.direction();
    this.player.walk(dx, dy);
    if (this.minimap) this.minimap.update();
  }
}
