export type StatKey = 'energy' | 'gpa' | 'dignity' | 'sanity';

export interface Stat {
  key: StatKey;
  label: string;
  value: number;
  max: number;
}

let stats: readonly Stat[] = [
  { key: 'energy', label: 'Energy', value: 100, max: 100 },
  { key: 'gpa', label: 'GPA', value: 5, max: 10 },
  { key: 'dignity', label: 'Dignity', value: 100, max: 100 },
  { key: 'sanity', label: 'Sanity', value: 100, max: 100 },
];

const listeners = new Set<() => void>();

export function getStats(): readonly Stat[] {
  return stats;
}

export function subscribeStats(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setStat(key: StatKey, value: number): void {
  stats = stats.map((s) =>
    s.key === key ? { ...s, value: Math.min(s.max, Math.max(0, value)) } : s
  );
  listeners.forEach((listener) => listener());
}

export function changeStat(key: StatKey, delta: number): void {
  const stat = stats.find((s) => s.key === key);
  if (stat) setStat(key, stat.value + delta);
}
