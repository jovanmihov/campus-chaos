import Phaser from 'phaser';
import Player from '../entities/Player';
import Portal from '../entities/Portal';
import ProbabilityBlock from '../entities/ProbabilityBlock';
import Watcher from '../entities/Watcher';
import MovementKeys from '../input/MovementKeys';
import { isPortalDialogOpen, openPortalDialog } from '../portalDialog';
import { isProbabilityGameOpen, startProbabilityGame } from '../probabilityGame';
import { startAutosave, type Tile } from '../save';
import Minimap from '../ui/Minimap';
import TileGrid, { TILE } from '../world/TileGrid';

const SPAWN: Tile = { x: 65, y: 38 };
const WATCHER_TILE: Tile = { x: SPAWN.x - 3, y: SPAWN.y };
const PROBABILITY_BLOCK_TILE: Tile = { x: SPAWN.x, y: SPAWN.y - 3 };
const PORTAL_TILE: Tile = { x: SPAWN.x + 3, y: SPAWN.y };

/** True while a dialog is up, so the player shouldn't move or start anything else. */
function isDialogOpen(): boolean {
  return isProbabilityGameOpen() || isPortalDialogOpen();
}

export default class CampusScene extends Phaser.Scene {
  private player!: Player;
  private keys!: MovementKeys;
  private minimap?: Minimap;
  private savedTile?: Tile;

  constructor() {
    super('CampusScene');
  }

  init(data: { tile?: Tile }): void {
    this.savedTile = data.tile;
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

    // --- 4. Watchers: each one sweeps its own vision ray ---
    new Watcher(this, tiles, WATCHER_TILE.x, WATCHER_TILE.y, { facingDeg: 270, watch: () => this.player.tile });
    const probabilityBlock = new ProbabilityBlock(this, tiles, PROBABILITY_BLOCK_TILE.x, PROBABILITY_BLOCK_TILE.y);
    const portal = new Portal(this, tiles, PORTAL_TILE.x, PORTAL_TILE.y);

    // --- 5. Player: resumes from the save, unless the map changed and that tile is now solid ---
    const saved = this.savedTile;
    const start = saved && tiles.isWalkable(saved.x, saved.y) ? saved : SPAWN;
    this.player = new Player(this, tiles, start.x, start.y);
    startAutosave(() => ({ scene: this.scene.key, position: this.player.tile }));

    // --- 6. Camera ---
    const cam = this.cameras.main;
    cam.setBounds(0, 0, bg.width, bg.height);
    cam.startFollow(this.player.root, true);

    // --- 7. Input ---
    this.keys = new MovementKeys(this);
    this.input.keyboard!.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (event.repeat || isDialogOpen()) return;
      const tile = this.player.tile;
      if (probabilityBlock.isNextTo(tile)) {
        startProbabilityGame();
      } else if (portal.isNextTo(tile)) {
        openPortalDialog(() => this.scene.start('ComputerDefenseScene', { campusTile: this.player.tile }));
      }
    });

    // --- 8. Minimap ---
    //this.minimap = new Minimap(this, 'map', this.player.root);
  }

  update(): void {
    if (!isDialogOpen()) {
      const { dx, dy } = this.keys.direction();
      this.player.walk(dx, dy);
    }
    if (this.minimap) this.minimap.update();
  }
}
