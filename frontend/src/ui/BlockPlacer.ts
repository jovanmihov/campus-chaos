import Phaser from 'phaser';
import DefensiveBlock, { OUTLINE_COLOR, type DefensiveBlockKind } from '../entities/defense/DefensiveBlock';
import type { Tile } from '../save';
import TileGrid, { circleOffsets, TILE, tileCenter } from '../world/TileGrid';
import Inventory from './Inventory';

const GHOST_DEPTH = 6;
const RANGE_DEPTH = 5.5;
const GHOST_ALPHA = 0.5;
const INVALID_COLOR = 0xff5c5c;
const RANGE_COLOR = 0xffffff;
const RANGE_ALPHA = 0.25;

export default class BlockPlacer {
  readonly placed: DefensiveBlock[] = [];
  private inventory: Inventory;
  private ghost: Phaser.GameObjects.Rectangle;
  private range: Phaser.GameObjects.Graphics;
  private selected: DefensiveBlockKind | null = null;

  constructor(
    private scene: Phaser.Scene,
    private grid: TileGrid,
    kinds: DefensiveBlockKind[]
  ) {
    this.inventory = new Inventory(scene, kinds, (kind) => this.select(kind === this.selected ? null : kind));

    this.ghost = scene.add
      .rectangle(0, 0, TILE, TILE)
      .setStrokeStyle(1, OUTLINE_COLOR, 0.6)
      .setDepth(GHOST_DEPTH)
      .setVisible(false);
    this.range = scene.add.graphics().setDepth(RANGE_DEPTH).setVisible(false);

    scene.input.mouse?.disableContextMenu();
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.moveGhost(pointer));
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    scene.input.keyboard?.on('keydown-ESC', () => this.select(null));
  }

  select(kind: DefensiveBlockKind | null): void {
    this.selected = kind;
    this.inventory.setSelected(kind);
    if (!kind) {
      this.ghost.setVisible(false);
      this.range.setVisible(false);
      return;
    }
    this.drawRange(kind.stats.radius);
    this.moveGhost(this.scene.input.activePointer);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    const kind = this.selected;
    if (!kind || this.isOverUi(pointer)) return;
    if (pointer.rightButtonDown()) {
      this.select(null);
      return;
    }
    const tile = this.pointerTile(pointer);
    if (!this.grid.isWalkable(tile.x, tile.y)) return;
    this.placed.push(new kind(this.scene, this.grid, tile.x, tile.y));
    this.select(null);
  }

  private drawRange(radius: number): void {
    this.range.clear().fillStyle(RANGE_COLOR, RANGE_ALPHA);
    for (const { x, y } of circleOffsets(radius)) {
      if (x === 0 && y === 0) continue;
      this.range.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  private moveGhost(pointer: Phaser.Input.Pointer): void {
    if (!this.selected) return;

    const visible = !this.isOverUi(pointer);
    const tile = this.pointerTile(pointer);
    const free = this.grid.isWalkable(tile.x, tile.y);

    this.ghost
      .setVisible(visible)
      .setPosition(tileCenter(tile.x), tileCenter(tile.y))
      .setFillStyle(free ? this.selected.color : INVALID_COLOR, GHOST_ALPHA);
    this.range.setVisible(visible).setPosition(tile.x * TILE, tile.y * TILE);
  }

  private isOverUi(pointer: Phaser.Input.Pointer): boolean {
    return this.inventory.contains(pointer.x, pointer.y) || this.scene.input.hitTestPointer(pointer).length > 0;
  }

  private pointerTile(pointer: Phaser.Input.Pointer): Tile {
    return { x: Math.floor(pointer.worldX / TILE), y: Math.floor(pointer.worldY / TILE) };
  }
}
