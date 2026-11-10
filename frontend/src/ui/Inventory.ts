import Phaser from 'phaser';
import { OUTLINE_COLOR, type DefensiveBlockKind } from '../entities/defense/DefensiveBlock';
import { TILE } from '../world/TileGrid';

const SLOT_SIZE = 28;
const PADDING = 4;
const MARGIN = 8;
const DEPTH = 7;

const PANEL_COLOR = 0x241d3b;
const BORDER_COLOR = 0x4b3f70;
const SLOT_COLOR = 0x1c172e;
const SLOT_ACTIVE_COLOR = 0x4b3f70;
const SELECTED_BORDER_COLOR = 0xe8e4f5;

export default class Inventory {
  readonly bounds: Phaser.Geom.Rectangle;
  private slots = new Map<DefensiveBlockKind, Phaser.GameObjects.Rectangle>();
  private selected: DefensiveBlockKind | null = null;

  constructor(scene: Phaser.Scene, kinds: DefensiveBlockKind[], onClick: (kind: DefensiveBlockKind) => void) {
    const width = PADDING + kinds.length * (SLOT_SIZE + PADDING);
    const height = SLOT_SIZE + PADDING * 2;
    const left = MARGIN;
    const top = scene.scale.height - MARGIN - height;
    this.bounds = new Phaser.Geom.Rectangle(left, top, width, height);

    scene.add
      .rectangle(left, top, width, height, PANEL_COLOR)
      .setOrigin(0)
      .setStrokeStyle(1, BORDER_COLOR)
      .setScrollFactor(0)
      .setDepth(DEPTH);

    kinds.forEach((kind, i) => {
      const x = left + PADDING + i * (SLOT_SIZE + PADDING) + SLOT_SIZE / 2;
      const y = top + height / 2;

      const slot = scene.add
        .rectangle(x, y, SLOT_SIZE, SLOT_SIZE, SLOT_COLOR)
        .setStrokeStyle(1, BORDER_COLOR)
        .setScrollFactor(0)
        .setDepth(DEPTH)
        .setInteractive({ useHandCursor: true });

      scene.add
        .rectangle(x, y, TILE, TILE, kind.color)
        .setStrokeStyle(1, OUTLINE_COLOR)
        .setScrollFactor(0)
        .setDepth(DEPTH);

      slot.on('pointerover', () => slot.setFillStyle(SLOT_ACTIVE_COLOR));
      slot.on('pointerout', () => this.selected !== kind && slot.setFillStyle(SLOT_COLOR));
      slot.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.rightButtonDown()) onClick(kind);
      });
      this.slots.set(kind, slot);
    });
  }

  setSelected(kind: DefensiveBlockKind | null): void {
    this.selected = kind;
    for (const [slotKind, slot] of this.slots) {
      const isSelected = slotKind === kind;
      slot.setFillStyle(isSelected ? SLOT_ACTIVE_COLOR : SLOT_COLOR);
      slot.setStrokeStyle(1, isSelected ? SELECTED_BORDER_COLOR : BORDER_COLOR);
    }
  }

  contains(x: number, y: number): boolean {
    return this.bounds.contains(x, y);
  }
}
