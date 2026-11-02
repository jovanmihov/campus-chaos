import Phaser from 'phaser';

type Direction = 'up' | 'down' | 'left' | 'right';

export default class MovementKeys {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<Direction, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    if (!scene.input.keyboard) {
      throw new Error('Keyboard input not available');
    }
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<Direction, Phaser.Input.Keyboard.Key>;
  }

  /** -1, 0 or 1 on each axis */
  direction(): { dx: number; dy: number } {
    // Axes are read independently so two keys combine into a diagonal
    let dx = 0;
    let dy = 0;
    if (this.isDown('left')) dx -= 1;
    if (this.isDown('right')) dx += 1;
    if (this.isDown('up')) dy -= 1;
    if (this.isDown('down')) dy += 1;
    return { dx, dy };
  }

  private isDown(dir: Direction): boolean {
    return this.cursors[dir].isDown || this.wasd[dir].isDown;
  }
}
