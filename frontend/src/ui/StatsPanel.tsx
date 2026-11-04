import { useSyncExternalStore } from 'react';
import { getStats, subscribeStats, type Stat } from '../stats';
import './StatsPanel.css';

export default function StatsPanel() {
  const stats = useSyncExternalStore(subscribeStats, getStats);

  return (
    <aside className="stats-panel">
      <h2 className="stats-panel__title">Stats</h2>
      {stats.map((stat) => (
        <StatBar key={stat.key} label={stat.label} value={stat.value} max={stat.max} />
      ))}
    </aside>
  );
}

type StatBarProps = Pick<Stat, 'label' | 'value' | 'max'>;

function StatBar({ label, value, max }: StatBarProps) {
  const percent = label !== 'GPA'? Math.round((value / max) * 100) : (value-5)/(max-5);

  return (
    <div className="stat">
      <div className="stat__header">
        <span className="stat__label">{label}</span>
        {label !== 'GPA' && <span className="stat__value">{value}/{max}</span>}
        {label === 'GPA' && <span className="stat__value">{parseFloat(value.toFixed(2))}/{max}</span>}
      </div>
      <div
        className="stat__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div className="stat__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
