// Small page-wide behaviours: reveal on scroll, pointer glow, copy buttons, nav state.
import { motionReduced, onMotionChange } from '../lib/motion';
import { copyText } from '../lib/clipboard';
import { onPageLoad, disposer } from '../lib/lifecycle';

// --- Pointer-following glow ---------------------------------------------------
document.addEventListener(
  'pointermove',
  (e) => {
    const target = (e.target as Element | null)?.closest<HTMLElement>('.glow');
    if (!target) return;
    const r = target.getBoundingClientRect();
    target.style.setProperty('--mx', `${e.clientX - r.left}px`);
    target.style.setProperty('--my', `${e.clientY - r.top}px`);
  },
  { passive: true },
);

// --- Copy to clipboard --------------------------------------------------------
document.addEventListener('click', async (e) => {
  const btn = (e.target as Element | null)?.closest<HTMLButtonElement>('button[data-copy]');
  if (!btn) return;
  const text = btn.dataset['copy'] ?? '';
  const ok = await copyText(text);
  const label = btn.querySelector<HTMLElement>('[data-copy-label]');
  const status = btn.parentElement?.querySelector<HTMLElement>('[data-copy-status]');
  const original = label?.textContent ?? '';
  btn.dataset['copied'] = ok ? 'true' : 'false';
  if (label) label.textContent = ok ? 'Copied' : 'Press ⌘C';
  if (status) status.textContent = ok ? `Copied ${text} to the clipboard` : 'Copy failed';
  window.setTimeout(() => {
    delete btn.dataset['copied'];
    if (label) label.textContent = original;
  }, 1600);
});

// --- Per page view: reveal on scroll and nav state ------------------------------
onPageLoad(() => {
  const d = disposer();

  const revealables = document.querySelectorAll<HTMLElement>('[data-reveal]');
  const revealAll = () => revealables.forEach((el) => el.classList.add('is-visible'));
  if (motionReduced() || !('IntersectionObserver' in window)) {
    revealAll();
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    revealables.forEach((el) => io.observe(el));
    d.add(() => io.disconnect());
  }
  d.add(onMotionChange((reduced) => reduced && revealAll()));

  const nav = document.querySelector<HTMLElement>('[data-nav]');
  if (nav) {
    const update = () => nav.toggleAttribute('data-scrolled', window.scrollY > 8);
    update();
    d.on(window, 'scroll', update, { passive: true });

    const links = nav.querySelectorAll<HTMLAnchorElement>('a[data-section]');
    const sections = [...links]
      .map((a) => document.getElementById(a.dataset['section'] ?? ''))
      .filter((s): s is HTMLElement => !!s);
    if (sections.length) {
      const spy = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            links.forEach((a) => {
              if (a.dataset['section'] === entry.target.id) a.setAttribute('aria-current', 'location');
              else a.removeAttribute('aria-current');
            });
          }
        },
        { rootMargin: '-45% 0px -50% 0px' },
      );
      sections.forEach((s) => spy.observe(s));
      d.add(() => spy.disconnect());
    }
  }
  return d.dispose;
});
