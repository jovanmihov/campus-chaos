import { setStat } from './stats';

const ARROW_SPEED = 150;

const LEVELS = [
  { grade: 6, greenWidth: 23 },
  { grade: 7, greenWidth: 17 },
  { grade: 8, greenWidth: 14 },
  { grade: 9, greenWidth: 12 },
  { grade: 10, greenWidth: 6 },
];

export type ProbabilityGameState =
  | { phase: 'closed' }
  | { phase: 'playing'; level: number; grade: number; greenStart: number; greenWidth: number }
  | { phase: 'finished'; score: number };

let state: ProbabilityGameState = { phase: 'closed' };

const listeners = new Set<() => void>();

function setState(next: ProbabilityGameState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function playLevel(level: number): void {
  const { grade, greenWidth } = LEVELS[level];
  setState({ phase: 'playing', level, grade, greenWidth, greenStart: Math.random() * (100 - greenWidth) });
}

export function getProbabilityGame(): ProbabilityGameState {
  return state;
}

export function subscribeProbabilityGame(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isProbabilityGameOpen(): boolean {
  return state.phase !== 'closed';
}

export function startProbabilityGame(): void {
  playLevel(0);
}

export function arrowPosition(seconds: number): number {
  return 100 - Math.abs(100 - ((seconds * ARROW_SPEED) % 200));
}

export function stopArrow(position: number): void {
  if (state.phase !== 'playing') return;

  const { level, grade, greenStart, greenWidth } = state;
  const inGreen = position >= greenStart && position <= greenStart + greenWidth;

  if (inGreen && level + 1 < LEVELS.length) {
    playLevel(level + 1);
    return;
  }

  const score = inGreen ? grade : grade - 1;
  setStat('gpa', score);
  setState({ phase: 'finished', score });
}

export function closeProbabilityGame(): void {
  setState({ phase: 'closed' });
}
