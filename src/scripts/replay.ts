// Career replay: renders the projection produced by folding career events up to a position.
import { careerEvents } from '../data/site';
import { project, formatMonth, yearsBetween, alsoText, type CareerProjection } from '../lib/career';
import { motionReduced } from '../lib/motion';

const STEP_MS = 1500;
const pad = (n: number) => String(n).padStart(2, '0');

export function mountReplay(root: HTMLElement): () => void {
  const cleanups: (() => void)[] = [];
  const total = careerEvents.length;
  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const qa = <T extends Element = HTMLElement>(sel: string) => [...root.querySelectorAll<T>(sel)];
  const out = (name: string) => qa(`[data-out="${name}"]`);
  const setText = (name: string, text: string) => out(name).forEach((el) => (el.textContent = text));

  const items = qa<HTMLLIElement>('[data-stream] > li');
  const scrubber = q<HTMLInputElement>('[data-scrubber]');
  const playButtons = qa<HTMLButtonElement>('[data-action="play"]');
  const live = q('[data-live]');
  const skillList = q<HTMLUListElement>('[data-out="skills"]');
  const affList = q<HTMLUListElement>('[data-out="affiliations"]');

  qa('[data-controls], [data-hud], [data-controls-hint]').forEach((el) => el.removeAttribute('hidden'));

  let position = total;
  let playing = false;
  let timer = 0;
  let liveTimer = 0;
  let scrollLockUntil = 0;

  /** Keyed list rendering so chips animate in only when they are genuinely new. */
  function renderChips(list: HTMLUListElement | null, keys: string[], fresh: Set<string>, extraClass = '') {
    if (!list) return;
    const existing = new Map<string, HTMLLIElement>();
    list.querySelectorAll<HTMLLIElement>(':scope > li').forEach((li) => existing.set(li.dataset['key'] ?? '', li));
    const next: HTMLLIElement[] = keys.map((key) => {
      let li = existing.get(key);
      if (!li) {
        li = document.createElement('li');
        li.className = `chip ${extraClass}`.trim();
        li.dataset['key'] = key;
        li.textContent = key;
      }
      li.classList.toggle('is-new', fresh.has(key));
      existing.delete(key);
      return li;
    });
    existing.forEach((li) => li.remove());
    next.forEach((li, i) => {
      if (list.children[i] !== li) list.insertBefore(li, list.children[i] ?? null);
    });
  }

  function announce(state: CareerProjection) {
    window.clearTimeout(liveTimer);
    liveTimer = window.setTimeout(() => {
      if (!live) return;
      const e = state.lastEvent;
      live.textContent = e
        ? `Stream position ${state.position} of ${total}. ${e.type}: ${e.title}. ` +
          (state.currentRoles.length ? `Current roles: ${state.currentRoles.map((r) => `${r.title} at ${r.org}`).join(' and ')}. ` : '') +
          `${state.skills.length} skills, ${state.affiliations.length} organisations.`
        : `Stream position 0 of ${total}. Nothing replayed yet.`;
    }, 700);
  }

  function render(prev: number) {
    // The projection is always recomputed by replaying the stream from the start.
    const state = project(careerEvents, position);
    const forward = position > prev;
    const e = state.lastEvent;

    setText('position', pad(position));
    setText('positionShort', `${position}/${total}`);
    out('progress').forEach((el) => (el.style.transform = `scaleX(${position / total})`));
    out('hudProgress').forEach((el) => (el.style.transform = `scaleX(${position / total})`));
    setText('lastSeq', e ? `#${pad(e.seq)}` : '#00');
    setText('lastType', e ? e.type : 'StreamOpened');
    setText('lastDate', e ? formatMonth(e.date) : '');
    setText('role', state.currentRole?.title ?? '—');
    setText(
      'roleOrg',
      state.currentRole ? `${state.currentRole.org} · since ${formatMonth(state.currentRole.from)}` : 'No role yet',
    );
    setText('roleAlso', alsoText(state));
    setText('years', yearsBetween(state.shippingSince, state.clock).toFixed(1));
    setText('affCount', String(state.affiliations.length));
    setText('skillCount', String(state.skills.length));
    setText('hudPos', `#${pad(position)}/${total}`);
    setText('hudType', e ? e.type : 'StreamOpened');
    setText(
      'hudRole',
      `${state.currentRole ? `${state.currentRole.title} · ${state.currentRole.org}` : 'No role yet'} · ${state.skills.length} skills`,
    );

    const animate = forward && position - prev === 1 && !motionReduced();
    renderChips(skillList, state.skills, new Set(animate ? state.newSkills : []));
    if (skillList && forward && state.newSkills.length) {
      skillList.scrollTo({ top: skillList.scrollHeight, behavior: motionReduced() ? 'auto' : 'smooth' });
    }
    const newAff =
      animate && e?.org && state.affiliations.at(-1) === e.org && !project(careerEvents, prev).affiliations.includes(e.org)
        ? new Set([e.org])
        : new Set<string>();
    renderChips(affList, state.affiliations, newAff, 'chip-org');

    items.forEach((li) => {
      const seq = Number(li.dataset['seq']);
      li.dataset['state'] = seq < position ? 'applied' : seq === position ? 'current' : 'future';
    });

    if (scrubber) {
      scrubber.value = String(position);
      scrubber.style.setProperty('--fill', `${(position / total) * 100}%`);
      scrubber.setAttribute('aria-valuetext', e ? `Position ${position} of ${total}: ${e.type}` : `Position 0 of ${total}`);
    }
    announce(state);
  }

  function setPosition(next: number) {
    const clamped = Math.max(0, Math.min(total, next));
    if (clamped === position) return;
    const prev = position;
    position = clamped;
    render(prev);
  }

  const sectionVisible = () => {
    const r = root.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  };

  function follow() {
    const li = items[position - 1];
    if (!li || !sectionVisible()) return;
    scrollLockUntil = performance.now() + 900;
    li.scrollIntoView({ block: 'center', behavior: motionReduced() ? 'auto' : 'smooth' });
  }

  function setPlaying(next: boolean) {
    playing = next;
    window.clearInterval(timer);
    playButtons.forEach((b) => {
      b.setAttribute('aria-pressed', String(next));
      b.setAttribute('aria-label', next ? 'Pause replay' : 'Play replay');
    });
    if (!next) return;
    if (position >= total) setPosition(0);
    timer = window.setInterval(() => {
      if (position >= total) return setPlaying(false);
      setPosition(position + 1);
      follow();
    }, STEP_MS);
    setPosition(position + 1);
    follow();
  }

  // --- Controls ------------------------------------------------------------
  root.addEventListener('click', (ev) => {
    const target = ev.target as Element;
    const action = target.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (action === 'play') return setPlaying(!playing);
    if (action === 'prev' || action === 'next') {
      setPlaying(false);
      return setPosition(position + (action === 'next' ? 1 : -1));
    }
    const jump = target.closest<HTMLElement>('[data-jump]');
    if (jump) {
      setPlaying(false);
      setPosition(Number(jump.dataset['jump']));
    }
  });

  scrubber?.addEventListener('input', () => {
    setPlaying(false);
    setPosition(Number(scrubber.value));
  });

  root.addEventListener('keydown', (ev) => {
    if ((ev.target as Element).matches('input[type="range"]')) return;
    const keys: Record<string, number> = { ArrowLeft: position - 1, ArrowRight: position + 1, Home: 0, End: total };
    const next = keys[ev.key];
    if (next === undefined || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    ev.preventDefault();
    setPlaying(false);
    setPosition(next);
  });

  // Any manual scrolling intent hands control back to the reader.
  const userScroll = () => playing && performance.now() > scrollLockUntil && setPlaying(false);
  window.addEventListener('wheel', userScroll, { passive: true });
  window.addEventListener('touchstart', userScroll, { passive: true });
  cleanups.push(() => {
    window.removeEventListener('wheel', userScroll);
    window.removeEventListener('touchstart', userScroll);
  });

  // --- Scroll-driven projection ------------------------------------------
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        if (playing || performance.now() < scrollLockUntil) return;
        for (const entry of entries) {
          if (entry.isIntersecting) setPosition(Number((entry.target as HTMLElement).dataset['seq']));
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    items.forEach((li) => io.observe(li));
    cleanups.push(() => io.disconnect());
  }

  // Palette / external trigger: scroll here and replay from the start.
  const onReplay = () => {
    setPlaying(false);
    setPosition(0);
    scrollLockUntil = performance.now() + 1200;
    root.scrollIntoView({ behavior: motionReduced() ? 'auto' : 'smooth', block: 'start' });
    window.setTimeout(() => setPlaying(true), motionReduced() ? 50 : 900);
  };
  document.addEventListener('replay:start', onReplay);
  cleanups.push(() => document.removeEventListener('replay:start', onReplay));

  // Start from an empty stream unless the reader is already past it.
  const r = root.getBoundingClientRect();
  if (r.top > window.innerHeight * 0.3) {
    const prev = position;
    position = 0;
    render(prev);
  } else {
    render(position);
  }

  // Arriving from another page via the palette: /?replay#career
  const url = new URL(location.href);
  if (url.searchParams.has('replay')) {
    url.searchParams.delete('replay');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    window.setTimeout(() => document.dispatchEvent(new CustomEvent('replay:start')), 300);
  }

  return () => {
    setPlaying(false);
    window.clearTimeout(liveTimer);
    cleanups.forEach((fn) => fn());
  };
}
