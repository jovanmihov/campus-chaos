export type PortalDialogState = { isOpen: false } | { isOpen: true; glimpse: string; onEnter: () => void };

let state: PortalDialogState = { isOpen: false };

const listeners = new Set<() => void>();

function setState(next: PortalDialogState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

export function getPortalDialog(): PortalDialogState {
  return state;
}

export function subscribePortalDialog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isPortalDialogOpen(): boolean {
  return state.isOpen;
}

export function openPortalDialog(glimpse: string, onEnter: () => void): void {
  setState({ isOpen: true, glimpse, onEnter });
}

export function closePortalDialog(): void {
  setState({ isOpen: false });
}

export function enterPortal(): void {
  if (!state.isOpen) return;
  const { onEnter } = state;
  closePortalDialog();
  onEnter();
}
