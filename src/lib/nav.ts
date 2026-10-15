import { motionReduced } from './motion';

export const onHome = (): boolean => location.pathname === '/' || location.pathname === '/index.html';

/** Navigates to another page, through the view-transition router when it is active. */
export async function go(href: string): Promise<void> {
  if (document.querySelector('meta[name="astro-view-transitions-enabled"]')) {
    const { navigate } = await import('astro:transitions/client');
    await navigate(href);
  } else {
    location.href = href;
  }
}

/** Scrolls to a home-page section and moves focus to its heading. */
export function goSection(id: string): void {
  const el = document.getElementById(id);
  if (onHome() && el) {
    el.scrollIntoView({ behavior: motionReduced() ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(history.state, '', `#${id}`);
    const focusTarget = el.querySelector<HTMLElement>('h2') ?? el;
    focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
  } else {
    void go(`/#${id}`);
  }
}

/** Scrolls to the career section and starts the replay, from any page. */
export function startReplay(): void {
  if (onHome() && document.querySelector('[data-replay]')) document.dispatchEvent(new CustomEvent('replay:start'));
  else void go('/?replay#career');
}

export const openExternal = (url: string): void => void window.open(url, '_blank', 'noopener');
