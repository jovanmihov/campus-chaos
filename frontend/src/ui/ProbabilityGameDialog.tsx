import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import {
  arrowPosition,
  closeProbabilityGame,
  getProbabilityGame,
  stopArrow,
  subscribeProbabilityGame,
  type ProbabilityGameState,
} from '../probabilityGame';
import './ProbabilityGameDialog.css';

export default function ProbabilityGameDialog() {
  const game = useSyncExternalStore(subscribeProbabilityGame, getProbabilityGame);

  if (game.phase === 'playing') return <PlayDialog game={game} />;
  if (game.phase === 'finished') return <ScoreDialog score={game.score} />;
  return null;
}

interface DialogProps {
  title: string;
  className?: string;
  children: ReactNode;
}

function Dialog({ title, className = '', children }: DialogProps) {
  return (
    <div className="probability-dialog__backdrop">
      <section className={`probability-dialog ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="probability-dialog__title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

function useSpacePress(onPress: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      if (!event.repeat) onPress();
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [onPress]);
}

interface PlayDialogProps {
  game: Extract<ProbabilityGameState, { phase: 'playing' }>;
}

function PlayDialog({ game }: PlayDialogProps) {
  const arrow = useRef<HTMLDivElement>(null);
  const position = useRef(0);

  useSpacePress(() => stopArrow(position.current));

  useEffect(() => {
    const startedAt = performance.now();
    let frame = 0;
    const moveArrow = () => {
      position.current = arrowPosition((performance.now() - startedAt) / 1000);
      if (arrow.current) arrow.current.style.left = `${position.current}%`;
      frame = requestAnimationFrame(moveArrow);
    };
    moveArrow();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Dialog title={`Trying for grade ${game.grade}`}>
      <p className="probability-dialog__text">Get it in the green to get a higher grade</p>
      <div className="probability-dialog__bar">
        <div
          className="probability-dialog__green"
          style={{ left: `${game.greenStart}%`, width: `${game.greenWidth}%` }}
        />
      </div>
      <div className="probability-dialog__arrow-track">
        <div className="probability-dialog__arrow" ref={arrow} />
      </div>
      <p className="probability-dialog__hint">Press Space to stop the arrow</p>
    </Dialog>
  );
}

function ScoreDialog({ score }: { score: number }) {
  useSpacePress(closeProbabilityGame);

  return (
    <Dialog title="Your score" className="probability-dialog--score">
      <p className="probability-dialog__score">{score}</p>
      <button className="probability-dialog__button" type="button" onClick={closeProbabilityGame}>
        OK
      </button>
    </Dialog>
  );
}
