import Phaser from 'phaser';
import { SCALE } from '../display';

const WIDTH = 120 * SCALE;                // minimap width in game pixels; height follows the map's aspect ratio
const MARGIN = 6 * SCALE;                 // gap from the screen's top-right corner
const BORDER = 2 * SCALE;
const TEXTURE = 'minimap';

/** A shrunken copy of the map in the top-right corner, with the player and the camera's view drawn on it. */
export default class Minimap {
  private overlay: Phaser.GameObjects.Graphics;
  private scale: number;
  private left: number;
  private top: number;

  constructor(
    private scene: Phaser.Scene,
    map: Phaser.GameObjects.Image,
    private target: { x: number; y: number }
  ) {
    const source = map.texture.getSourceImage() as HTMLImageElement;
    // World pixels to minimap pixels; the map image may be drawn scaled up
    this.scale = WIDTH / map.displayWidth;
    const height = Math.round(map.displayHeight * this.scale);

    // Sampling a big shrink on the GPU turns it into noise (worse if the map is kept pixelated),
    // so let the browser downscale the map smoothly once into its own texture
    if (!scene.textures.exists(TEXTURE)) {
      const texture = scene.textures.createCanvas(TEXTURE, WIDTH, height)!;
      texture.context.imageSmoothingQuality = 'high';
      texture.context.drawImage(source, 0, 0, WIDTH, height);
      texture.refresh();
    }

    this.left = scene.cameras.main.width - MARGIN - WIDTH;
    this.top = MARGIN;

    scene.add
      .rectangle(this.left - BORDER, this.top - BORDER, WIDTH + BORDER * 2, height + BORDER * 2, 0x3a3058)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(100);
    scene.add.image(this.left, this.top, TEXTURE).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
    this.overlay = scene.add.graphics().setScrollFactor(0).setDepth(101);
  }

  /** Redraw the player dot and the camera's view box. Call once per frame. */
  update(): void {
    const view = this.scene.cameras.main.worldView;
    // Graphics ignore roundPixels, so snap to whole pixels by hand to keep lines crisp
    const vx = this.left + Math.round(view.x * this.scale);
    const vy = this.top + Math.round(view.y * this.scale);
    const vw = Math.round(view.width * this.scale);
    const vh = Math.round(view.height * this.scale);
    const px = this.left + Math.round(this.target.x * this.scale);
    const py = this.top + Math.round(this.target.y * this.scale);

    this.overlay
      .clear()
      .lineStyle(SCALE, 0xffffff, 0.8)
      .strokeRect(vx + SCALE / 2, vy + SCALE / 2, vw - SCALE, vh - SCALE)
      // Dark outline keeps the dot visible on grass, roofs and roads alike
      .fillStyle(0x1c172e)
      .fillCircle(px, py, 2.5 * SCALE)
      .fillStyle(0xffd23f)
      .fillCircle(px, py, 1.5 * SCALE);
  }
}
