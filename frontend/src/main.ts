import Phaser from 'phaser';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import CampusScene from './scenes/CampusScene';
import StatsPanel from './ui/StatsPanel';

new Phaser.Game({
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
  scene: CampusScene,
});

const statsRoot = document.getElementById('stats-root');
if (!statsRoot) {
  throw new Error('#stats-root element not found');
}
createRoot(statsRoot).render(createElement(StatsPanel));
