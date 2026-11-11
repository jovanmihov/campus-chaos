import Phaser from 'phaser';

const DEPTH = 7;
const BACKGROUND = '#241d3b';
const BACKGROUND_HOVER = '#4b3f70';

const STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'ui-monospace, Consolas, monospace',
  fontSize: '12px',
  color: '#e8e4f5',
  backgroundColor: BACKGROUND,
  padding: { x: 6, y: 4 },
};

export function addTextButton(scene: Phaser.Scene, x: number, y: number, label: string): Phaser.GameObjects.Text {
  const button = scene.add
    .text(x, y, label, STYLE)
    .setScrollFactor(0)
    .setDepth(DEPTH)
    .setInteractive({ useHandCursor: true });

  addHover(button);
  return button;
}

function addHover(button: Phaser.GameObjects.Text): void {
  button.on('pointerover', () => button.setBackgroundColor(BACKGROUND_HOVER));
  button.on('pointerout', () => button.setBackgroundColor(BACKGROUND));
}

export function enableTextButton(button: Phaser.GameObjects.Text, label: string): Phaser.GameObjects.Text {
  button.off('pointerover').off('pointerout');
  addHover(button);
  button.setText(label).setBackgroundColor(BACKGROUND).setAlpha(1);
  button.input!.cursor = 'pointer';
  return button;
}

export function disableTextButton(button: Phaser.GameObjects.Text, label: string): void {
  button.off('pointerover').off('pointerout').off('pointerdown');
  button.setText(label).setBackgroundColor(BACKGROUND).setAlpha(0.6);
  button.input!.cursor = 'default';
}
