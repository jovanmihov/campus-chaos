import { useEffect, useSyncExternalStore } from 'react';
import { closePortalDialog, enterPortal, getPortalDialog, subscribePortalDialog } from '../portalDialog';
import './ProbabilityGameDialog.css';

export default function PortalDialog() {
  const dialog = useSyncExternalStore(subscribePortalDialog, getPortalDialog);

  useEffect(() => {
    if (!dialog.isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.code !== 'Escape') return;
      event.preventDefault();
      if (event.repeat) return;
      if (event.code === 'Space') enterPortal();
      else closePortalDialog();
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [dialog.isOpen]);

  if (!dialog.isOpen) return null;

  return (
    <div className="probability-dialog__backdrop">
      <section className="probability-dialog" role="dialog" aria-modal="true" aria-label="A strange square">
        <h2 className="probability-dialog__title">A strange square</h2>
        {/* Filler text until the real dialog is written */}
        <p className="probability-dialog__text">
          Lorem ipsum dolor sit amet. The square hums quietly. Something green waits on the other side.
        </p>
        <div className="portal-dialog__actions">
          <button className="probability-dialog__button" type="button" onClick={closePortalDialog}>
            Stay
          </button>
          <button className="probability-dialog__button" type="button" onClick={enterPortal}>
            Go through
          </button>
        </div>
        <p className="probability-dialog__hint">Space to go through, Esc to stay</p>
      </section>
    </div>
  );
}
