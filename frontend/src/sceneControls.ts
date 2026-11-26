import type Phaser from 'phaser';

/** Buttons and readouts a scene shows in the stats panel; no onClick means plain text. */
export interface SceneControl {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

let controls: readonly SceneControl[] = [];

const listeners = new Set<() => void>();

export function getSceneControls(): readonly SceneControl[] {
  return controls;
}

export function subscribeSceneControls(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSceneControls(scene: Phaser.Scene, next: readonly SceneControl[]): void {
  controls = next;
  listeners.forEach((listener) => listener());
  scene.events.off('shutdown', clearSceneControls).once('shutdown', clearSceneControls);
}

function clearSceneControls(): void {
  controls = [];
  listeners.forEach((listener) => listener());
}
