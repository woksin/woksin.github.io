// Event Modeling board: highlight a card's flow on hover/focus/click, step through, or play.
import { disposer } from '../lib/lifecycle';

type CardData = { id: string; kind: string; name: string; source: string; note: string };
type StepData = { title: string; text: string; cards: string[] };
const KIND = { ui: 'Screen', command: 'Command', event: 'Event', view: 'Read model' } as Record<string, string>;
const STEP_MS = 2600;

export function initEventModel(): (() => void) | void {
  const root = document.querySelector<HTMLElement>('[data-model]');
  const json = document.querySelector<HTMLScriptElement>('[data-model-json]');
  if (!root || !json) return;
  const data = JSON.parse(json.textContent ?? '{}') as { cards: CardData[]; steps: StepData[]; root: string };
  const cards = new Map(data.cards.map((c) => [c.id, c]));
  const cardEls = [...root.querySelectorAll<HTMLButtonElement>('[data-card]')];
  const edgeEls = [...root.querySelectorAll<SVGPathElement>('.edge')];
  const stepEls = [...root.querySelectorAll<HTMLButtonElement>('[data-step]')];
  const meta = root.querySelector<HTMLElement>('[data-model-detail-meta]');
  const text = root.querySelector<HTMLElement>('[data-model-detail-text]');
  const play = root.querySelector<HTMLButtonElement>('[data-model-play]');
  const playLabel = root.querySelector<HTMLElement>('[data-model-play-label]');
  const reset = root.querySelector<HTMLButtonElement>('[data-model-reset]');
  const scroller = root.querySelector<HTMLElement>('[data-model-scroll]');
  const initial = { meta: meta?.textContent ?? '', text: text?.textContent ?? '' };
  const d = disposer();

  let pinned: { type: 'card' | 'step'; key: string | number } | null = null;
  let timer = 0;
  let playing = false;

  const light = (ids: Set<string>) => {
    root.toggleAttribute('data-focus', ids.size > 0);
    cardEls.forEach((el) => el.toggleAttribute('data-lit', ids.has(el.dataset['card'] ?? '')));
    edgeEls.forEach((el) => el.toggleAttribute('data-lit', ids.has(el.dataset['from'] ?? '') && ids.has(el.dataset['to'] ?? '')));
    if (reset) reset.hidden = ids.size === 0;
  };
  const detail = (metaText: string, body: string, href?: string) => {
    if (meta) {
      meta.replaceChildren(metaText);
      if (href) {
        const a = document.createElement('a');
        a.href = href;
        a.rel = 'noopener';
        a.className = 'ml-2 underline decoration-line-strong hover:text-fg';
        a.textContent = href.slice(data.root.length + 1);
        meta.append(a);
      }
    }
    if (text) text.textContent = body;
  };
  const markStep = (i: number | null) => stepEls.forEach((el, j) => el.setAttribute('aria-pressed', String(i === j)));

  const showCard = (id: string) => {
    const card = cards.get(id);
    if (!card) return;
    const ids = new Set<string>([id]);
    for (const s of data.steps) if (s.cards.includes(id)) s.cards.forEach((c) => ids.add(c));
    light(ids);
    markStep(null);
    detail(`${KIND[card.kind] ?? card.kind} · ${card.name} ·`, card.note, `${data.root}/${card.source}`);
  };
  const showStep = (i: number) => {
    const step = data.steps[i];
    if (!step) return;
    light(new Set(step.cards));
    markStep(i);
    detail(`Step ${i + 1} of ${data.steps.length} · ${step.title}`, step.text);
    // Keep the lit cards in view when the board scrolls.
    const first = cardEls.find((el) => el.dataset['card'] === step.cards[0]);
    const last = cardEls.find((el) => el.dataset['card'] === step.cards[step.cards.length - 1]);
    if (scroller && first && last && scroller.scrollWidth > scroller.clientWidth) {
      const mid = (first.offsetLeft + last.offsetLeft + last.offsetWidth) / 2;
      scroller.scrollTo({ left: mid - scroller.clientWidth / 2, behavior: 'smooth' });
    }
  };
  const clear = () => {
    light(new Set());
    markStep(null);
    detail(initial.meta, initial.text);
  };
  const restore = () => {
    if (playing) return;
    if (!pinned) clear();
    else if (pinned.type === 'card') showCard(String(pinned.key));
    else showStep(Number(pinned.key));
  };

  const stop = () => {
    playing = false;
    window.clearTimeout(timer);
    play?.setAttribute('aria-pressed', 'false');
    root.querySelector('[data-icon-play]')?.classList.remove('hidden');
    root.querySelector('[data-icon-pause]')?.classList.add('hidden');
    if (playLabel) playLabel.textContent = 'Play the flow';
  };
  const run = (i: number) => {
    if (i >= data.steps.length) {
      stop();
      pinned = { type: 'step', key: data.steps.length - 1 };
      return;
    }
    showStep(i);
    timer = window.setTimeout(() => run(i + 1), STEP_MS);
  };
  const start = () => {
    playing = true;
    play?.setAttribute('aria-pressed', 'true');
    root.querySelector('[data-icon-play]')?.classList.add('hidden');
    root.querySelector('[data-icon-pause]')?.classList.remove('hidden');
    if (playLabel) playLabel.textContent = 'Pause';
    run(0);
  };

  for (const el of cardEls) {
    const id = el.dataset['card'] ?? '';
    d.on(el, 'pointerenter', () => !playing && showCard(id));
    d.on(el, 'pointerleave', restore);
    d.on(el, 'focus', () => !playing && showCard(id));
    d.on(el, 'blur', restore);
    d.on(el, 'click', () => {
      stop();
      pinned = pinned?.type === 'card' && pinned.key === id ? null : { type: 'card', key: id };
      restore();
    });
  }
  stepEls.forEach((el, i) =>
    d.on(el, 'click', () => {
      stop();
      pinned = pinned?.type === 'step' && pinned.key === i ? null : { type: 'step', key: i };
      restore();
    }),
  );
  if (play) d.on(play, 'click', () => (playing ? stop() : start()));
  if (reset)
    d.on(reset, 'click', () => {
      stop();
      pinned = null;
      clear();
    });
  d.on<KeyboardEvent>(root, 'keydown', (e) => {
    if (e.key === 'Escape' && (pinned || playing)) {
      stop();
      pinned = null;
      clear();
    }
  });

  return () => {
    stop();
    d.dispose();
  };
}
