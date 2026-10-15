// Generative Event Modeling board for the hero.
// Blue commands fire as they cross the "now" line, append orange events, and the
// events feed green read models. Canvas 2D, DPR aware, paused when not visible.
import { motionReduced, onMotionChange } from '../lib/motion';

type Kind = 'command' | 'event' | 'view';
type Card = {
  id: number;
  kind: Kind;
  label: string;
  band: number;
  x: number; // world x of the left edge
  row: 0 | 1; // 0 = command/view row, 1 = event row
  /** Time (ms) the card became active; Infinity = not yet. */
  activeAt: number;
  inputs: Card[];
};
type Edge = { from: Card; to: Card };

const COLORS: Record<Kind, { base: string; soft: string; rgb: string }> = {
  command: { base: '#4da3ff', soft: '#8cc3ff', rgb: '77,163,255' },
  event: { base: '#ff8a3d', soft: '#ffb37f', rgb: '255,138,61' },
  view: { base: '#3ddc97', soft: '#86ebbe', rgb: '61,220,151' },
};

/** Real names for the cards: [command, event] pairs and read models, passed in from the page. */
export type BoardLabels = { flows: [string, string][]; views: string[] };
const FALLBACK: BoardLabels = { flows: [['MergePullRequest', 'PullRequestMerged']], views: ['Sindre.Now'] };

const SPEED = 16; // px per second of world drift
const PULSE_MS = 700;
const NOW_X = 0.86; // fraction of width

export function mountEventBoard(canvas: HTMLCanvasElement, host: HTMLElement, labels: BoardLabels = FALLBACK): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const FLOWS = labels.flows.length ? labels.flows : FALLBACK.flows;
  const VIEWS = labels.views.length ? labels.views : FALLBACK.views;

  let dpr = 1;
  let W = 0;
  let H = 0;
  let cardW = 96;
  let cardH = 56;
  let bands: { top: number; depth: number }[] = [];

  let cards: Card[] = [];
  let edges: Edge[] = [];
  let nextId = 0;
  let worldEnd = 0; // world x where generation continues
  let lastEventsByBand: Card[][] = [];

  let t = 0; // world scroll offset (px)
  let now = 0; // ms clock that only advances while running
  let raf = 0;
  let running = false;
  let visible = true;
  let last = 0;

  const pointer = { x: -9999, y: -9999, px: 0, py: 0, tx: 0, ty: 0 };
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)] as T;

  function layout() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cardW = Math.round(Math.min(118, Math.max(78, H * 0.115)));
    cardH = Math.round(cardW * 0.6);
    const rowGap = cardH * 0.95;
    const bandH = cardH * 2 + rowGap;
    const count = H > bandH * 2.6 ? 2 : 1;
    const usable = H - bandH * count;
    const gap = usable / (count + 1);
    bands = Array.from({ length: count }, (_, i) => ({ top: gap * (i + 1) + bandH * i, depth: i === 0 ? 0.6 : 1 }));
  }

  function rowY(card: Card) {
    const band = bands[card.band] ?? bands[0]!;
    const rowGap = cardH * 0.95;
    return band.top + (card.row === 1 ? cardH + rowGap : 0);
  }

  function addCard(kind: Kind, label: string, band: number, x: number, row: 0 | 1, inputs: Card[] = []): Card {
    const card: Card = { id: nextId++, kind, label, band, x, row, activeAt: Number.POSITIVE_INFINITY, inputs };
    cards.push(card);
    for (const from of inputs) edges.push({ from, to: card });
    return card;
  }

  function generateUntil(limit: number) {
    while (worldEnd < limit) {
      for (let b = 0; b < bands.length; b++) {
        const jitter = (rand() - 0.5) * cardW * 0.5;
        const x = worldEnd + jitter + b * cardW * 0.55;
        const recent = lastEventsByBand[b] ?? (lastEventsByBand[b] = []);
        if (recent.length >= 2 && rand() < 0.42) {
          const inputs = recent.slice(-1 - Math.floor(rand() * 2));
          addCard('view', pick(VIEWS), b, x, 0, inputs);
          recent.length = 0;
        } else {
          const [command, event] = pick(FLOWS);
          const cmd = addCard('command', command, b, x, 0);
          const ev = addCard('event', event, b, x + cardW * 0.42, 1, [cmd]);
          recent.push(ev);
          if (recent.length > 4) recent.shift();
        }
      }
      worldEnd += cardW * (1.32 + rand() * 0.5);
    }
  }

  function reset() {
    cards = [];
    edges = [];
    lastEventsByBand = [];
    nextId = 0;
    seed = 1337;
    worldEnd = -cardW * 2;
    t = 0;
    generateUntil(W + cardW * 4);
    // Everything already left of "now" is history: active from the start.
    settle(Number.NEGATIVE_INFINITY);
  }

  const screenX = (c: Card, parallax: number) => c.x - t + parallax;

  /** Propagates activation: crossing "now" fires commands, which drive events, which drive views. */
  function settle(at: number) {
    const nowLine = W * NOW_X;
    for (const c of cards) {
      if (c.activeAt !== Number.POSITIVE_INFINITY) continue;
      if (c.kind === 'command' && c.x - t + cardW * 0.5 < nowLine) c.activeAt = at;
    }
    // Two passes reach views fed by events fed by commands.
    for (let pass = 0; pass < 2; pass++) {
      for (const c of cards) {
        if (c.kind === 'command' || c.activeAt !== Number.POSITIVE_INFINITY || !c.inputs.length) continue;
        const ready = Math.max(...c.inputs.map((i) => i.activeAt));
        if (ready === Number.POSITIVE_INFINITY) continue;
        if (c.kind === 'view' && c.x - t + cardW * 0.5 > nowLine) continue;
        c.activeAt = ready === Number.NEGATIVE_INFINITY ? ready : Math.max(ready, at) + PULSE_MS;
      }
    }
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx!.beginPath();
    ctx!.roundRect(x, y, w, h, r);
  }

  function edgePath(e: Edge, pA: number, pB: number) {
    const ax = screenX(e.from, pA) + cardW / 2;
    const bx = screenX(e.to, pB) + cardW / 2;
    const fromBelow = e.from.row === 0; // command -> event goes down; event -> view goes up
    const ay = rowY(e.from) + (fromBelow ? cardH : 0);
    const by = rowY(e.to) + (fromBelow ? 0 : cardH);
    const my = (ay + by) / 2;
    return { ax, ay, bx, by, c1x: ax, c1y: my, c2x: bx, c2y: my };
  }

  const bez = (p0: number, p1: number, p2: number, p3: number, s: number) => {
    const u = 1 - s;
    return u * u * u * p0 + 3 * u * u * s * p1 + 3 * u * s * s * p2 + s * s * s * p3;
  };

  function draw(static_ = false) {
    // Hairlines follow the theme: white on ink, ink on paper.
    const ink = document.documentElement.dataset['theme'] === 'light' ? '20,22,30' : '255,255,255';
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, W, H);
    const nowLine = W * NOW_X;

    // Timeline ticks drifting with the world.
    const tick = cardW * 0.75;
    ctx!.lineWidth = 1;
    for (let x = -((t % tick) + tick); x < W + tick; x += tick) {
      ctx!.strokeStyle = `rgba(${ink},0.035)`;
      ctx!.beginPath();
      ctx!.moveTo(Math.round(x) + 0.5, 0);
      ctx!.lineTo(Math.round(x) + 0.5, H);
      ctx!.stroke();
    }
    // Swimlane guides.
    for (const band of bands) {
      for (const row of [0, 1]) {
        const y = band.top + (row ? cardH * 1.95 : 0) + cardH / 2;
        ctx!.strokeStyle = `rgba(${ink},0.045)`;
        ctx!.setLineDash([2, 6]);
        ctx!.beginPath();
        ctx!.moveTo(0, Math.round(y) + 0.5);
        ctx!.lineTo(W, Math.round(y) + 0.5);
        ctx!.stroke();
        ctx!.setLineDash([]);
      }
    }

    // "now" line.
    const grad = ctx!.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(255,138,61,0)');
    grad.addColorStop(0.5, 'rgba(255,138,61,0.35)');
    grad.addColorStop(1, 'rgba(255,138,61,0)');
    ctx!.strokeStyle = grad;
    ctx!.beginPath();
    ctx!.moveTo(Math.round(nowLine) + 0.5, 0);
    ctx!.lineTo(Math.round(nowLine) + 0.5, H);
    ctx!.stroke();
    ctx!.font = '500 10px "JetBrains Mono Variable", ui-monospace, monospace';
    ctx!.fillStyle = 'rgba(255,179,127,0.55)';
    ctx!.fillText('now ▸ append', nowLine + 8, (bands[0]?.top ?? 40) - 14);

    const par = (band: number) => {
      const depth = bands[band]?.depth ?? 1;
      return { x: pointer.px * depth, y: pointer.py * depth };
    };

    // Edges.
    for (const e of edges) {
      const pa = par(e.from.band).x;
      const pb = par(e.to.band).x;
      const p = edgePath(e, pa, pb);
      if (Math.max(p.ax, p.bx) < -cardW || Math.min(p.ax, p.bx) > W + cardW) continue;
      const py = par(e.to.band).y;
      const active = e.to.activeAt <= now;
      ctx!.strokeStyle = active ? `rgba(${COLORS[e.to.kind].rgb},0.28)` : `rgba(${ink},0.07)`;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(p.ax, p.ay + py);
      ctx!.bezierCurveTo(p.c1x, p.c1y + py, p.c2x, p.c2y + py, p.bx, p.by + py);
      ctx!.stroke();

      // Travelling pulse while the target is being activated.
      const start = e.to.activeAt - PULSE_MS;
      if (!static_ && Number.isFinite(e.to.activeAt) && now >= start && now < e.to.activeAt) {
        const s = (now - start) / PULSE_MS;
        const x = bez(p.ax, p.c1x, p.c2x, p.bx, s);
        const y = bez(p.ay, p.c1y, p.c2y, p.by, s) + py;
        const g = ctx!.createRadialGradient(x, y, 0, x, y, 10);
        g.addColorStop(0, `rgba(${COLORS[e.to.kind].rgb},0.95)`);
        g.addColorStop(1, `rgba(${COLORS[e.to.kind].rgb},0)`);
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(x, y, 10, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    // Cards.
    for (const c of cards) {
      const p = par(c.band);
      const x = screenX(c, p.x);
      if (x > W + cardW || x < -cardW * 1.5) continue;
      const y = rowY(c) + p.y;
      const col = COLORS[c.kind];
      const active = c.activeAt <= now;
      const age = active ? now - c.activeAt : 0;
      const flash = active && Number.isFinite(c.activeAt) ? Math.max(0, 1 - age / 1400) : 0;
      const dx = pointer.x - (x + cardW / 2);
      const dy = pointer.y - (y + cardH / 2);
      const near = Math.max(0, 1 - Math.hypot(dx, dy) / 240);

      ctx!.save();
      if (flash > 0 || near > 0.2) {
        ctx!.shadowColor = `rgba(${col.rgb},${0.55 * Math.max(flash, near * 0.6)})`;
        ctx!.shadowBlur = 24;
      }
      roundRect(x, y, cardW, cardH, 7);
      if (active) {
        ctx!.fillStyle = `rgba(${col.rgb},${0.1 + 0.16 * flash + 0.08 * near})`;
        ctx!.fill();
        ctx!.restore();
        ctx!.strokeStyle = `rgba(${col.rgb},${0.42 + 0.4 * flash + 0.3 * near})`;
        ctx!.lineWidth = 1;
        roundRect(x + 0.5, y + 0.5, cardW - 1, cardH - 1, 7);
        ctx!.stroke();
        // Sticky-note tab.
        ctx!.fillStyle = `rgba(${col.rgb},${0.75 + 0.25 * flash})`;
        ctx!.fillRect(x + 9, y + 9, 10, 3);
      } else {
        ctx!.restore();
        ctx!.setLineDash([3, 4]);
        ctx!.strokeStyle = `rgba(${col.rgb},${0.16 + 0.25 * near})`;
        roundRect(x + 0.5, y + 0.5, cardW - 1, cardH - 1, 7);
        ctx!.stroke();
        ctx!.setLineDash([]);
      }

      // Label, clipped to the card.
      const labelAlpha = (active ? 0.5 : 0.18) + 0.45 * Math.max(near, flash);
      ctx!.save();
      ctx!.beginPath();
      ctx!.rect(x + 6, y, cardW - 12, cardH);
      ctx!.clip();
      ctx!.fillStyle = `rgba(${col.rgb},${labelAlpha})`;
      const size = Math.max(7.5, Math.min(cardW / 10.5, (cardW - 18) / (c.label.length * 0.6)));
      ctx!.font = `500 ${size.toFixed(1)}px "JetBrains Mono Variable", ui-monospace, monospace`;
      ctx!.fillText(c.label, x + 9, y + cardH - 12);
      ctx!.restore();
    }
  }

  function frame(ts: number) {
    const dt = Math.min(50, last ? ts - last : 16);
    last = ts;
    now += dt;
    t += (SPEED * dt) / 1000;
    pointer.px += (pointer.tx - pointer.px) * 0.06;
    pointer.py += (pointer.ty - pointer.py) * 0.06;

    generateUntil(t + W + cardW * 4);
    settle(now);
    // Cull cards that drifted off the left edge (keeping any still feeding visible cards).
    if (cards.length > 160) {
      const keep = new Set<Card>();
      for (const c of cards) if (c.x - t > -cardW * 6) keep.add(c);
      for (const c of [...keep]) c.inputs.forEach((i) => keep.add(i));
      cards = cards.filter((c) => keep.has(c));
      edges = edges.filter((e) => keep.has(e.from) && keep.has(e.to));
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || motionReduced() || !visible || document.hidden) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  function renderStatic() {
    stop();
    draw(true);
  }

  layout();
  reset();
  if (motionReduced()) renderStatic();
  else start();
  host.dataset['boardReady'] = 'true';

  const ro = new ResizeObserver(() => {
    const prevW = W;
    const prevH = H;
    layout();
    if (Math.abs(prevH - H) > 40 || Math.abs(prevW - W) > 40) reset();
    if (!running) draw(true);
  });
  ro.observe(canvas);

  const io = new IntersectionObserver(([entry]) => {
    visible = !!entry?.isIntersecting;
    if (visible) start();
    else stop();
  });
  io.observe(canvas);

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  const offMotion = onMotionChange((reduced) => (reduced ? renderStatic() : start()));
  const onTheme = () => !running && draw(true);
  document.addEventListener('theme:change', onTheme);

  host.addEventListener(
    'pointermove',
    (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * -18;
      pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * -10;
      if (!running) draw(true);
    },
    { passive: true },
  );
  host.addEventListener('pointerleave', () => {
    pointer.x = pointer.y = -9999;
    pointer.tx = pointer.ty = 0;
    if (!running) draw(true);
  });

  return () => {
    stop();
    ro.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    offMotion();
    document.removeEventListener('theme:change', onTheme);
  };
}
