import { getStats, setStat, type StatKey } from './stats';

const API_URL: string | undefined = import.meta.env.VITE_API_URL;
const CODE_KEY = 'campus-chaos.player-code';
const SAVE_KEY = 'campus-chaos.save';
const UNSYNCED_KEY = 'campus-chaos.save-unsynced';
const SAVE_VERSION = 1;
const AUTOSAVE_MS = 15_000;
const REQUEST_TIMEOUT_MS = 3_000;

if (!API_URL) {
  throw new Error('VITE_API_URL is not set. Copy frontend/.env.example to frontend/.env.');
}

export interface Tile {
  x: number;
  y: number;
}

export interface Progress {
  scene: string;
  position: Tile;
}

export interface SaveData extends Progress {
  version: number;
  stats: Record<StatKey, number>;
  flags: Record<string, unknown>;
}

export interface LoadedGame {
  playerCode: string | null;
  save: SaveData | null;
}

let playerCode: string | null = null;
let flags: SaveData['flags'] = {};
let getProgress: (() => Progress) | undefined;
let lastSynced: string | undefined;
let canSave = false;

/** Resolves to null instead of rejecting when the backend can't be reached. */
function request(path: string, init: RequestInit = {}): Promise<Response | null> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(playerCode && { Authorization: `Bearer ${playerCode}` }),
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch(() => null);
}

async function createPlayer(): Promise<string | null> {
  const response = await request('/players', { method: 'POST' });
  if (!response?.ok) return null;

  const { code } = (await response.json()) as { code: string };
  localStorage.setItem(CODE_KEY, code);
  return code;
}

function readLocalSave(): SaveData | null {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as SaveData | null;
  } catch {
    return null;
  }
}

function restore(save: SaveData): void {
  flags = save.flags;
  Object.entries(save.stats).forEach(([key, value]) => setStat(key as StatKey, value));
}

/** Finds this browser's player and restores their stats. Call once, before the game starts. */
export async function loadGame(): Promise<LoadedGame> {
  const localSave = readLocalSave();
  const hasUnsyncedSave = localStorage.getItem(UNSYNCED_KEY) !== null;
  let serverSave: SaveData | null = null;
  let serverSaveUnknown = false;

  playerCode = localStorage.getItem(CODE_KEY);
  if (playerCode) {
    const response = await request('/save');
    if (response?.ok) {
      serverSave = (await response.json()) as SaveData;
    } else if (response?.status === 401) {
      playerCode = null; // The server no longer knows this code, so get a new one below
    } else if (response?.status !== 404) {
      serverSaveUnknown = true;
    }
  }
  playerCode ??= serverSaveUnknown ? null : await createPlayer();

  // An unsynced save is newer than the server's. Otherwise the server is the main copy.
  const save = (hasUnsyncedSave ? localSave : null) ?? serverSave ?? localSave;
  if (save) restore(save);

  // A fresh start must not overwrite a server save we couldn't read
  canSave = save !== null || !serverSaveUnknown;
  return { playerCode, save };
}

function snapshot({ scene, position }: Progress): SaveData {
  const stats = Object.fromEntries(getStats().map((s) => [s.key, s.value])) as SaveData['stats'];
  return { version: SAVE_VERSION, scene, position, stats, flags };
}

async function saveNow(keepalive = false): Promise<void> {
  if (!canSave || !getProgress) return;

  const body = JSON.stringify(snapshot(getProgress()));
  if (body === lastSynced) return;

  // Written first, so the next load can recover a save that fails or gets cut off
  localStorage.setItem(SAVE_KEY, body);
  localStorage.setItem(UNSYNCED_KEY, '1');
  if (!playerCode) return;

  const response = await request('/save', { method: 'PUT', body, keepalive });
  if (response?.ok) {
    lastSynced = body;
    if (localStorage.getItem(SAVE_KEY) === body) localStorage.removeItem(UNSYNCED_KEY);
  } else if (response?.status === 401) {
    playerCode = null; // Retrying would count as wrong codes. The next load gets a new one.
  }
}

/** Call when a scene starts. This also saves right away, which covers scene changes. */
export function startAutosave(progress: () => Progress): void {
  if (!getProgress) {
    setInterval(() => void saveNow(), AUTOSAVE_MS);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void saveNow(true);
    });
  }
  getProgress = progress;
  void saveNow();
}
