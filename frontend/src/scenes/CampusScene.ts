import Phaser from 'phaser';

const TILE = 16;

export default class CampusScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private tileX = 5;
  private tileY = 5;
  private moving = false;
  private mapW = 0;                       // map size in tiles
  private mapH = 0;
  private blocked = new Set<string>();    // "x,y" of tiles you can't walk on

  constructor() {
    super('CampusScene');
  }

  preload(): void {
    this.load.image('map', 'assets/campus__v2.png');
  }

  create(): void {
    // --- 1. The map image ---
    const bg = this.add.image(0, 0, 'map').setOrigin(0, 0);
    this.mapW = Math.floor(bg.width / TILE);
    this.mapH = Math.floor(bg.height / TILE);

    // --- 2. Solid tiles (example: a building at x 10-14, y 4-7) ---
    for (let x = 10; x <= 14; x++) {
      for (let y = 4; y <= 7; y++) {
        //this.blocked.add(`${x},${y}`);
        y++;
      }
    }

    // --- 3. Debug grid: shows tile coordinates; delete when done ---
    this.add
      .grid(0, 0, bg.width, bg.height, TILE, TILE)
      .setOrigin(0, 0)
      .setOutlineStyle(0xffffff, 0.3);

    // --- 4. Player ---
    this.player = this.add
      .rectangle(
        this.tileX * TILE + TILE / 2,
        this.tileY * TILE + TILE / 2,
        TILE - 8,
        TILE - 8,
        0xff5252
      )
      .setDepth(5);

    // --- 5. Camera ---
    const cam = this.cameras.main;
    cam.setBounds(0, 0, bg.width, bg.height);
    cam.startFollow(this.player, true);

    if (!this.input.keyboard) {
      throw new Error('Keyboard input not available');
    }
    this.cursors = this.input.keyboard.createCursorKeys();
  }

  update(): void {
    if (this.moving) return;

    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown) dx = -1;
    else if (this.cursors.right.isDown) dx = 1;
    else if (this.cursors.up.isDown) dy = -1;
    else if (this.cursors.down.isDown) dy = 1;

    if (dx !== 0 || dy !== 0) this.tryMove(dx, dy);
  }

  private tryMove(dx: number, dy: number): void {
    const nx = this.tileX + dx;
    const ny = this.tileY + dy;

    if (nx < 0 || ny < 0 || nx >= this.mapW || ny >= this.mapH) return;
    if (this.blocked.has(`${nx},${ny}`)) return;

    this.moving = true;
    this.tileX = nx;
    this.tileY = ny;

    this.tweens.add({
      targets: this.player,
      x: nx * TILE + TILE / 2,
      y: ny * TILE + TILE / 2,
      duration: 160,
      onComplete: () => {
        this.moving = false;
      },
    });
  }
}