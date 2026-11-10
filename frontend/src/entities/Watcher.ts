import Phaser from 'phaser';
import VisionRay, { VisionRayOptions } from '../components/VisionRay';
import TileGrid, { TILE, tileCenter } from '../world/TileGrid';

// Placeholder look until it gets real art
const BODY_COLOR = 0x7b4fd1;
const OUTLINE_COLOR = 0x1c172e;

/** A solid one-tile block that keeps watch with a sweeping VisionRay. */
export default class Watcher {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly vision: VisionRay;

  constructor(scene: Phaser.Scene, grid: TileGrid, tileX: number, tileY: number, vision: VisionRayOptions) {
    // Solid, so the player can't walk through it and other watchers can't see through it
    grid.block(tileX, tileY);

    const x = tileCenter(tileX);
    const y = tileCenter(tileY);
    this.body = scene.add
      .rectangle(x, y, TILE, TILE, BODY_COLOR)
      .setStrokeStyle(1, OUTLINE_COLOR)
      .setDepth(5);
    this.vision = new VisionRay(scene, grid, () => ({ x, y }), vision);
  }
}
