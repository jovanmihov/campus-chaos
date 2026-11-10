import Phaser from 'phaser';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { loadGame, type LoadedGame } from './save';
import CampusScene from './scenes/CampusScene';
import ComputerDefenseScene from './scenes/ComputerDefenseScene';
import PortalDialog from './ui/PortalDialog';
import ProbabilityGameDialog from './ui/ProbabilityGameDialog';
import StatsPanel from './ui/StatsPanel';

// Saves name their scene by key, so every scene a player can be in must be listed here
const SCENES: Record<string, typeof Phaser.Scene> = { CampusScene, ComputerDefenseScene };
const FIRST_SCENE = 'CampusScene';

async function start(): Promise<void> {
  const { playerCode, save } = await loadGame().catch((error): LoadedGame => {
    console.warn('Could not load the save', error);
    return { playerCode: null, save: null };
  });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'phaser-container',
    width: 15 * 32,
    height: 11 * 32,
    pixelArt: true,
    backgroundColor: '#1c172e',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  const resumed = save && Object.hasOwn(SCENES, save.scene) ? save : null;
  const startScene = resumed?.scene ?? FIRST_SCENE;
  for (const [key, scene] of Object.entries(SCENES)) {
    game.scene.add(key, scene, key === startScene, { tile: resumed?.position });
  }

  const statsRoot = document.getElementById('stats-root');
  if (!statsRoot) {
    throw new Error('#stats-root element not found');
  }
  createRoot(statsRoot).render(createElement(StatsPanel, { playerCode }));

  const dialogRoot = document.getElementById('dialog-root');
  if (!dialogRoot) {
    throw new Error('#dialog-root element not found');
  }
  createRoot(dialogRoot).render([
    createElement(ProbabilityGameDialog, { key: 'probability' }),
    createElement(PortalDialog, { key: 'portal' }),
  ]);
}

void start();
