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
  private moving: DefensiveBlock | null = null;
  private locked = false;

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
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer));
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
    scene.input.keyboard?.on('keydown-ESC', () => this.select(null));
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
    if (locked) {
      this.select(null);
      this.scene.input.setDefaultCursor('default');
    }
    this.inventory.setEnabled(!locked);
  }

  select(kind: DefensiveBlockKind | null): void {
    this.moving?.setLifted(false);
    this.moving = null;

    if (this.locked) kind = null;
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

  private pickUp(block: DefensiveBlock): void {
    this.select(block.constructor as DefensiveBlockKind);
    this.moving = block;
    block.setLifted(true);
    this.scene.input.setDefaultCursor('default');
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.locked || this.isOverUi(pointer)) return;
    if (pointer.rightButtonDown()) {
      this.select(null);
      return;
    }

    const tile = this.pointerTile(pointer);
    const kind = this.selected;
    if (!kind) {
      const block = this.blockAt(tile);
      if (block) this.pickUp(block);
      return;
    }

    if (!this.canPlaceAt(tile)) return;
    if (this.moving) this.moving.moveTo(tile.x, tile.y);
    else this.placed.push(new kind(this.scene, this.grid, tile.x, tile.y));
    this.select(null);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.selected) {
      this.moveGhost(pointer);
      return;
    }
    const over = !this.locked && !this.isOverUi(pointer) && this.blockAt(this.pointerTile(pointer));
    this.scene.input.setDefaultCursor(over ? 'pointer' : 'default');
  }

  private blockAt(tile: Tile): DefensiveBlock | undefined {
    return this.placed.find((block) => block.tileX === tile.x && block.tileY === tile.y);
  }

  private canPlaceAt(tile: Tile): boolean {
    if (this.moving && this.moving.tileX === tile.x && this.moving.tileY === tile.y) return true;
    return this.grid.isWalkable(tile.x, tile.y);
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
    const free = this.canPlaceAt(tile);

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
