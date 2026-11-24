import Phaser from 'phaser';

type Direction = 'up' | 'down' | 'left' | 'right';
const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

export default class MovementKeys {
  private keys = {} as Record<Direction, Phaser.Input.Keyboard.Key[]>;
  // A press counts until a step uses it, so a quick tap still moves the player
  private tapped = new Set<Direction>();

  constructor(scene: Phaser.Scene) {
    if (!scene.input.keyboard) {
      throw new Error('Keyboard input not available');
    }
    const cursors = scene.input.keyboard.createCursorKeys();
    const wasd = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<Direction, Phaser.Input.Keyboard.Key>;

    for (const dir of DIRECTIONS) {
      this.keys[dir] = [cursors[dir], wasd[dir]];
      for (const key of this.keys[dir]) key.on('down', () => this.tapped.add(dir));
    }
  }

  /** -1, 0 or 1 on each axis */
  direction(): { dx: number; dy: number } {
    // Axes are read independently so two keys combine into a diagonal
    return { dx: this.axis('left', 'right'), dy: this.axis('up', 'down') };
  }

  consumeTaps(): void {
    this.tapped.clear();
  }

  private axis(negative: Direction, positive: Direction): number {
    const neg = this.pressedAt(negative);
    const pos = this.pressedAt(positive);
    if (neg === null && pos === null) return 0;
    return (pos ?? -Infinity) > (neg ?? -Infinity) ? 1 : -1;
  }

  private pressedAt(dir: Direction): number | null {
    const keys = this.keys[dir];
    if (!this.tapped.has(dir) && !keys.some((key) => key.isDown)) return null;
    return Math.max(...keys.map((key) => key.timeDown));
  }
}
