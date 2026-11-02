import Phaser from 'phaser';
import CampusScene from './scenes/CampusScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 15 * 16,
  height: 11 * 16,
  pixelArt: true,
  backgroundColor: '#1c172e',
  scale: {
    mode: Phaser.Scale.FIT,                  // scale up to fit the window, keep aspect ratio
    autoCenter: Phaser.Scale.CENTER_BOTH,    // center horizontally and vertically
  },
  scene: CampusScene,
});