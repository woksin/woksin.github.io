// Contribution heatmap: fill-in on first view, pointer/keyboard tooltip, scroll to "now".
import { motionReduced } from '../lib/motion';
import { disposer } from '../lib/lifecycle';

const fmt = new Intl.NumberFormat('en-US');
const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const describe = (cell: HTMLElement) => {
  const n = Number(cell.dataset['n']);
  return `${n === 0 ? 'No' : fmt.format(n)} event${n === 1 ? '' : 's'} · ${dayLabel(cell.dataset['d'] ?? '')}`;
};

export function initHeatmap(): (() => void) | void {
  const root = document.querySelector<HTMLElement>('[data-heatmap]');
  const grid = root?.querySelector<HTMLElement>('[data-heatmap-grid]');
  const tip = document.querySelector<HTMLElement>('[data-heatmap-tip]');
  const keys = root?.querySelector<HTMLElement>('[data-heatmap-keys]');
  const live = root?.querySelector<HTMLElement>('[data-heatmap-live]');
  const scroller = root?.querySelector<HTMLElement>('[data-heatmap-scroll]');
  if (!root || !grid || !tip) return;
  const d = disposer();
  const cells = [...grid.querySelectorAll<HTMLElement>('.c')];

  // Most recent weeks are on the right; start there on narrow screens.
  if (scroller) scroller.scrollLeft = scroller.scrollWidth;

  if (motionReduced() || !('IntersectionObserver' in window)) {
    root.classList.add('filled');
  } else {
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        root.classList.add('filled');
        io.disconnect();
      },
      { threshold: 0.25 },
    );
    io.observe(grid);
    d.add(() => io.disconnect());
  }

  let current: HTMLElement | null = null;
  const show = (cell: HTMLElement | null) => {
    current?.removeAttribute('data-on');
    current = cell;
    if (!cell) {
      tip.hidden = true;
      return;
    }
    cell.setAttribute('data-on', '');
    const r = cell.getBoundingClientRect();
    tip.textContent = describe(cell);
    tip.hidden = false;
    const half = tip.offsetWidth / 2 + 8;
    tip.style.left = `${Math.min(window.innerWidth - half, Math.max(half, r.left + r.width / 2))}px`;
    tip.style.top = `${r.top}px`;
  };

  d.on<PointerEvent>(grid, 'pointerover', (e) => {
    const cell = (e.target as Element).closest<HTMLElement>('.c');
    if (cell) show(cell);
  });
  d.on(grid, 'pointerleave', () => show(null));
  d.on(window, 'scroll', () => current && document.activeElement !== keys && show(null), { passive: true });

  if (keys) {
    let index = cells.length - 1;
    const announce = () => {
      const cell = cells[index];
      if (!cell) return;
      cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      show(cell);
      if (live) live.textContent = describe(cell);
    };
    d.on(keys, 'focus', announce);
    d.on(keys, 'blur', () => show(null));
    d.on<KeyboardEvent>(keys, 'keydown', (e) => {
      const step: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1, Home: -Infinity, End: Infinity };
      const s = step[e.key];
      if (s === undefined) return;
      e.preventDefault();
      index = Number.isFinite(s) ? Math.min(cells.length - 1, Math.max(0, index + s)) : s < 0 ? 0 : cells.length - 1;
      announce();
    });
  }

  return () => {
    show(null);
    d.dispose();
  };
}
