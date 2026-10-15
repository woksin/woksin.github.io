const KEY = 'woksin:motion';
const query = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : undefined;

/** True when the OS asks for reduced motion or the visitor turned motion off. */
export function motionReduced(): boolean {
  if (typeof document === 'undefined') return true;
  const pref = document.documentElement.dataset['motion'];
  if (pref === 'reduced') return true;
  if (pref === 'full') return false;
  return query?.matches ?? false;
}

type Listener = (reduced: boolean) => void;
const listeners = new Set<Listener>();

export function onMotionChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const notify = () => {
  const reduced = motionReduced();
  document.documentElement.classList.toggle('js-motion', !reduced);
  listeners.forEach((l) => l(reduced));
};

query?.addEventListener('change', notify);

/** Toggles the visitor's motion preference and persists it. */
export function toggleMotion(): boolean {
  const next = motionReduced() ? 'full' : 'reduced';
  document.documentElement.dataset['motion'] = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage may be unavailable */
  }
  notify();
  return next === 'reduced';
}
