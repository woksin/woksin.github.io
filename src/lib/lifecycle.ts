// Page lifecycle that works with and without Astro's <ClientRouter />.
//
// With the router, module scripts run once per full load while the DOM is swapped on
// every navigation. `onPageLoad` runs `init` for every page view (initial and after each
// navigation) and runs the returned cleanup before the next swap, so nothing double-binds
// and observers on detached elements are released.
type Cleanup = (() => void) | void;

const routerActive = () => !!document.querySelector('meta[name="astro-view-transitions-enabled"]');

export function onPageLoad(init: () => Cleanup): void {
  let cleanup: Cleanup;
  const run = () => {
    cleanup?.();
    cleanup = init();
  };
  document.addEventListener('astro:page-load', run);
  document.addEventListener('astro:before-swap', () => {
    cleanup?.();
    cleanup = undefined;
  });
  if (!routerActive()) run();
}

/** Collects teardown callbacks for one page view. */
export function disposer() {
  const fns: (() => void)[] = [];
  return {
    add<T extends () => void>(fn: T): T {
      fns.push(fn);
      return fn;
    },
    /** addEventListener that is removed on dispose. */
    on<E extends Event = Event>(target: EventTarget, type: string, fn: (e: E) => void, opts?: AddEventListenerOptions): void {
      const listener = fn as unknown as EventListener;
      target.addEventListener(type, listener, opts);
      fns.push(() => target.removeEventListener(type, listener, opts));
    },
    dispose: () => fns.splice(0).forEach((fn) => fn()),
  };
}
