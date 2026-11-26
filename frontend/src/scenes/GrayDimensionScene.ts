import Phaser from 'phaser';
import { keepPixelated, SCALE } from '../display';
import Guard from '../entities/Guard';
import Player from '../entities/Player';
import MovementKeys from '../input/MovementKeys';
import { startAutosave, type Tile } from '../save';
import { setSceneControls } from '../sceneControls';
import TileGrid, { TILE } from '../world/TileGrid';

// One house to sneak through, one character per tile; it fills the 30x22 screen exactly.
// You come in at the left end of the entry hallway along the bottom.
// . floor   # wall   D door   B bed   S sofa   A table   C cabinet/counter
// T test paper to collect   E exit, opens once every test is collected
const MAP = [
  '##############################',
  '#BB.......TCCC#..SSSSS...TCCC#',
  '#BB...........#...........CCC#',
  '#BB...........#..............#',
  '#.............D..............#',
  '#.............D.............C#',
  '#.............D.............C#',
  '#.............#.............C#',
  '#C............#..............#',
  '#C............#SS............#',
  '######DDD############DD#######',
  '#CCCC.....CCCC#..........AAAA#',
  '#CT...........#..............#',
  '#C............#..............#',
  '#C............#.............C#',
  '#C............#.............C#',
  '#C............#.............C#',
  '#.............#.............C#',
  '######DDD######.............C#',
  '#.............#..............#',
  '#.............#T.SSS.........#',
  '#######################EE#####',
];
const WALKABLE = '.DT';
const COLORS: Record<string, number> = {
  '.': 0x9a9a9a,
  '#': 0x2e2e2e,
  D: 0x6e6e6e,
  B: 0xd0d0d0,
  S: 0x7a7a7a,
  A: 0xb4b4b4,
  T: 0x9a9a9a, // floor under the paper
  E: 0x2e2e2e, // looks like wall until it opens
  C: 0x4a4a4a,
};
const OUTLINE_COLOR = 0x1c1c1c;
const SPAWN: Tile = { x: 1, y: 19 }; // start of the entry hallway
const OPEN_EXIT_COLOR = 0x5fbf6a;
const PAPER_COLOR = 0xf4f1e6;
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'ui-monospace, Consolas, monospace',
  fontSize: `${12 * SCALE}px`,
  color: '#e8e4f5',
  backgroundColor: '#241d3b',
  padding: { x: 6 * SCALE, y: 4 * SCALE },
  align: 'center',
};

function tilesOf(c: string): Tile[] {
  return MAP.flatMap((row, y) => [...row].flatMap((ch, x) => (ch === c ? [{ x, y }] : [])));
}

if (MAP.some((row) => row.length !== MAP[0].length || [...row].some((c) => !(c in COLORS)))) {
  throw new Error('Gray dimension MAP rows must be equal length and use only known tiles');
}

/** Rooms are 4-way connected '.' tiles, so doors and furniture split them apart. */
function findRooms(): Tile[][] {
  const seen = new Set<string>();
  const rooms: Tile[][] = [];
  MAP.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (!'.T'.includes(c) || seen.has(`${x},${y}`)) return;
      seen.add(`${x},${y}`);
      const room = [{ x, y }];
      for (let i = 0; i < room.length; i++) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = { x: room[i].x + dx, y: room[i].y + dy };
          if (!'.T'.includes(MAP[n.y]?.[n.x] ?? '#') || seen.has(`${n.x},${n.y}`)) continue;
          seen.add(`${n.x},${n.y}`);
          room.push(n);
        }
      }
      rooms.push(room);
    })
  );
  return rooms;
}

export default class GrayDimensionScene extends Phaser.Scene {
  private campusTile?: Tile;
  private player!: Player;
  private keys!: MovementKeys;
  private guards: Guard[] = [];
  private tiles!: TileGrid;
  private papers = new Map<string, Phaser.GameObjects.Rectangle>();
  private testCount = 0;
  private exitOpen = false;
  private finished = false;

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
    const tiles = (this.tiles = new TileGrid(MAP[0].length, MAP.length));
    this.drawMap(tiles);
    // Scenes are reused on re-entry, so reset the run
    this.exitOpen = this.finished = false;
    this.papers.clear();
    const tests = tilesOf('T');
    this.testCount = tests.length;
    tests.forEach(({ x, y }) =>
      this.papers.set(
        `${x},${y}`,
        this.add
          .rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE * 0.5, TILE * 0.65, PAPER_COLOR)
          .setStrokeStyle(SCALE, OUTLINE_COLOR)
          .setAngle(-8)
      )
    );

    this.player = new Player(this, tiles, SPAWN.x, SPAWN.y);
    this.keys = new MovementKeys(this);

    this.guards = findRooms()
      .filter((room) => !room.some((t) => t.x === SPAWN.x && t.y === SPAWN.y))
      .map((room) => new Guard(this, tiles, room, () => this.player.tile));

    startAutosave(() => ({ scene: this.scene.key, position: this.campusTile ?? { x: -1, y: -1 } }));

    this.updateCounter();
  }

  private updateCounter(): void {
    setSceneControls(this, [
      { label: '< Back to campus', onClick: () => this.scene.start('CampusScene', { tile: this.campusTile }) },
      { label: `Tests: ${this.testCount - this.papers.size}/${this.testCount}` },
    ]);
  }

  private checkTile(): void {
    const { x, y } = this.player.tile;
    const key = `${x},${y}`;
    const paper = this.papers.get(key);
    if (paper) {
      paper.destroy();
      this.papers.delete(key);
      this.updateCounter();
      if (this.papers.size === 0) this.openExit();
    }
    if (this.exitOpen && MAP[y][x] === 'E') this.finish();
  }

  private openExit(): void {
    this.exitOpen = true;
    const gfx = this.add.graphics().fillStyle(OPEN_EXIT_COLOR, 1);
    tilesOf('E').forEach(({ x, y }) => {
      this.tiles.unblock(x, y);
      gfx.fillRect(x * TILE, y * TILE, TILE, TILE);
    });
  }

  private finish(): void {
    this.finished = true;
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, `Congratulations!\nYou collected all ${this.testCount} tests.`, {
        ...TEXT_STYLE,
        fontSize: `${20 * SCALE}px`,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(7);
    this.time.delayedCall(2500, () => this.scene.start('CampusScene', { tile: this.campusTile }));
  }

  update(time: number, delta: number): void {
    if (this.finished) return;
    const { dx, dy } = this.keys.direction();
    if (this.player.walk(dx, dy)) this.keys.consumeTaps();
    this.guards.forEach((g) => g.update(time, delta));
    this.checkTile();
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
