import Phaser from 'phaser';
import { keepPixelated, SCALE } from '../display';
import Player from '../entities/Player';
import MovementKeys from '../input/MovementKeys';
import { startAutosave, type Tile } from '../save';
import { addTextButton } from '../ui/TextButton';
import TileGrid, { TILE } from '../world/TileGrid';

// One house to sneak through, one character per tile; it fills the 30x22 screen exactly.
// You come in at the left end of the entry hallway along the bottom.
// . floor   # wall   D door   B bed   S sofa   T table   C cabinet/counter
const MAP = [
  '##############################',
  '#BB........CCC#..SSSSS....CCC#',
  '#BB...........#...........CCC#',
  '#BB...........#..............#',
  '#.............D..............#',
  '#.............D.............C#',
  '#.............D.............C#',
  '#.............#.............C#',
  '#C............#..............#',
  '#C............#SS............#',
  '######DDD############DD#######',
  '#CCCC.....CCCC#..........TTTT#',
  '#C............#..............#',
  '#C............D..............#',
  '#C............D.............C#',
  '#C............D.............C#',
  '#C............#.............C#',
  '#.............#.............C#',
  '######DDD######.............C#',
  '#.............D..............#',
  '#.............D..SSS.........#',
  '##############################',
];
const WALKABLE = '.D';
const COLORS: Record<string, number> = {
  '.': 0x9a9a9a,
  '#': 0x2e2e2e,
  D: 0x6e6e6e,
  B: 0xd0d0d0,
  S: 0x7a7a7a,
  T: 0xb4b4b4,
  C: 0x4a4a4a,
};
const OUTLINE_COLOR = 0x1c1c1c;
const SPAWN: Tile = { x: 1, y: 19 }; // start of the entry hallway

if (MAP.some((row) => row.length !== MAP[0].length || [...row].some((c) => !(c in COLORS)))) {
  throw new Error('Gray dimension MAP rows must be equal length and use only known tiles');
}

export default class GrayDimensionScene extends Phaser.Scene {
  private campusTile?: Tile;
  private player!: Player;
  private keys!: MovementKeys;

  constructor() {
    super('GrayDimensionScene');
  }

  init(data: { tile?: Tile; campusTile?: Tile }): void {
    this.campusTile = data.campusTile ?? data.tile;
  }

  preload(): void {
    this.load.spritesheet('player', 'assets/player/student.png', { frameWidth: 32, frameHeight: 32 });
  }

  create(): void {
    keepPixelated(this, 'player');
    const tiles = new TileGrid(MAP[0].length, MAP.length);
    this.drawMap(tiles);

    this.player = new Player(this, tiles, SPAWN.x, SPAWN.y);
    this.keys = new MovementKeys(this);

    startAutosave(() => ({ scene: this.scene.key, position: this.campusTile ?? { x: -1, y: -1 } }));

    addTextButton(this, 8 * SCALE, 8 * SCALE, '< Back to campus').on('pointerdown', () =>
      this.scene.start('CampusScene', { tile: this.campusTile })
    );
  }

  update(): void {
    const { dx, dy } = this.keys.direction();
    if (this.player.walk(dx, dy)) this.keys.consumeTaps();
  }

  private drawMap(tiles: TileGrid): void {
    const gfx = this.add.graphics();
    const inset = 2 * SCALE;

    MAP.forEach((row, y) => {
      [...row].forEach((c, x) => {
        const px = x * TILE;
        const py = y * TILE;
        if (WALKABLE.includes(c)) {
          gfx.fillStyle(COLORS[c], 1).fillRect(px, py, TILE, TILE);
          return;
        }
        tiles.block(x, y);
        if (c === '#') {
          gfx.fillStyle(COLORS[c], 1).fillRect(px, py, TILE, TILE);
          return;
        }
        // Furniture sits on the floor, drawn a bit smaller so neighbours read as separate pieces
        gfx.fillStyle(COLORS['.'], 1).fillRect(px, py, TILE, TILE);
        gfx.fillStyle(COLORS[c], 1).fillRect(px + inset, py + inset, TILE - 2 * inset, TILE - 2 * inset);
        gfx.lineStyle(SCALE, OUTLINE_COLOR).strokeRect(px + inset, py + inset, TILE - 2 * inset, TILE - 2 * inset);
      });
    });
  }
}
