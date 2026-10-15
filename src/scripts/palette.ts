// ⌘K command palette: fuzzy filtering, full keyboard navigation, focus return.
import { person } from '../data/site';
import { copyText } from '../lib/clipboard';
import { motionReduced, toggleMotion } from '../lib/motion';
import { currentTheme, toggleTheme } from '../lib/theme';
import { go, goSection, openExternal, startReplay } from '../lib/nav';

type Kind = 'command' | 'event' | 'view';
type Item = {
  id: string;
  group: 'Navigate' | 'Actions' | 'Links';
  label: string;
  keywords?: string;
  kind: Kind;
  hint?: () => string;
  run: () => void | Promise<void>;
};

const SWATCH: Record<Kind, string> = {
  command: 'var(--color-command)',
  event: 'var(--color-event)',
  view: 'var(--color-view)',
};

const open = openExternal;

/** Subsequence match with bonuses for word starts and contiguous runs. */
export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  const t = text.toLowerCase();
  if (t.includes(q)) return 100 - t.indexOf(q);
  let score = 0;
  let ti = 0;
  let run = 0;
  let first = -1;
  const chars = q.replace(/\s+/g, '');
  for (const ch of chars) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    if (first === -1) first = found;
    // Matches scattered across the whole string are noise, not intent.
    if (found - first > chars.length * 3 + 2) return 0;
    const wordStart = found === 0 || /[\s\-/.]/.test(t[found - 1] ?? '');
    run = found === ti ? run + 1 : 0;
    score += 1 + (wordStart ? 3 : 0) + run * 2;
    ti = found + 1;
  }
  return score;
}

export function mountPalette(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-palette]');
  const input = dialog?.querySelector<HTMLInputElement>('[data-palette-input]');
  const list = dialog?.querySelector<HTMLUListElement>('[data-palette-list]');
  if (!dialog || !input || !list) return;

  let toast: HTMLElement | null = null;
  const notify = (msg: string) => {
    toast?.remove();
    toast = document.createElement('div');
    toast.setAttribute('role', 'status');
    toast.className =
      'fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full border border-line-strong bg-ink-800/95 px-4 py-2 font-mono text-xs text-fg shadow-2xl backdrop-blur';
    toast.textContent = msg;
    document.body.append(toast);
    const el = toast;
    window.setTimeout(() => el.remove(), 2200);
  };

  const items: Item[] = [
    { id: 'about', group: 'Navigate', label: 'Now & about', keywords: 'read model projection photo', kind: 'view', run: () => goSection('about') },
    { id: 'career', group: 'Navigate', label: 'Career event stream', keywords: 'experience jobs timeline', kind: 'event', run: () => goSection('career') },
    { id: 'model', group: 'Navigate', label: 'How I think: event model', keywords: 'varde event modeling board slice', kind: 'command', run: () => goSection('model') },
    { id: 'cratis', group: 'Navigate', label: 'Cratis', keywords: 'open source chronicle arc', kind: 'command', run: () => goSection('cratis') },
    { id: 'activity', group: 'Navigate', label: 'Contribution event store', keywords: 'github heatmap activity calendar', kind: 'event', run: () => goSection('activity') },
    { id: 'agentic', group: 'Navigate', label: 'Agentic engineering', keywords: 'ai agents harness pi review workflow', kind: 'view', run: () => goSection('agentic') },
    { id: 'projects', group: 'Navigate', label: 'Things I build', keywords: 'projects cli agents apps', kind: 'command', run: () => goSection('projects') },
    { id: 'writing', group: 'Navigate', label: 'Writing', keywords: 'blog posts articles script to stage', kind: 'event', run: () => goSection('writing') },
    { id: 'talks', group: 'Navigate', label: 'Talks & community', keywords: 'webinar conference event modeling', kind: 'event', run: () => goSection('talks') },
    { id: 'skills', group: 'Navigate', label: 'Skills', keywords: 'toolbox stack', kind: 'view', run: () => goSection('skills') },
    { id: 'contact', group: 'Navigate', label: 'Contact', keywords: 'email message hire', kind: 'command', run: () => goSection('contact') },
    { id: 'top', group: 'Navigate', label: 'Back to top', keywords: 'home hero start', kind: 'view', run: () => goSection('top') },

    {
      id: 'replay', group: 'Actions', label: 'Replay career', keywords: 'play event stream projection', kind: 'event',
      run: startReplay,
    },
    {
      id: 'terminal', group: 'Actions', label: 'Open terminal', keywords: 'shell console cli bash git log', kind: 'command',
      hint: () => '`',
      run: () => void document.dispatchEvent(new CustomEvent('terminal:open')),
    },
    { id: 'cv', group: 'Actions', label: 'Open CV', keywords: 'resume curriculum vitae', kind: 'view', run: () => go('/cv') },
    {
      id: 'print', group: 'Actions', label: 'Print CV / save as PDF', keywords: 'resume pdf download', kind: 'view',
      run: () => {
        if (location.pathname.startsWith('/cv')) window.print();
        else void go('/cv?print');
      },
    },
    {
      id: 'email', group: 'Actions', label: 'Copy email address', keywords: person.email, kind: 'command',
      hint: () => person.email,
      run: async () => notify((await copyText(person.email)) ? `Copied ${person.email}` : 'Copy failed'),
    },
    {
      id: 'theme', group: 'Actions', label: 'Toggle light / dark theme', keywords: 'appearance colour color mode', kind: 'view',
      hint: () => currentTheme(),
      run: () => notify(`Theme: ${toggleTheme()}`),
    },
    {
      id: 'motion', group: 'Actions', label: 'Toggle motion', keywords: 'animation reduce accessibility', kind: 'command',
      hint: () => (motionReduced() ? 'off' : 'on'),
      run: () => notify(toggleMotion() ? 'Motion reduced' : 'Motion on'),
    },

    { id: 'github', group: 'Links', label: 'GitHub', keywords: 'woksin code', kind: 'event', hint: () => 'github.com/woksin', run: () => open(person.links.github) },
    { id: 'linkedin', group: 'Links', label: 'LinkedIn', keywords: 'profile', kind: 'event', run: () => open(person.links.linkedin) },
    { id: 'cratis-site', group: 'Links', label: 'cratis.io', keywords: 'cratis website docs', kind: 'event', run: () => open(person.links.cratis) },
    { id: 'cratis-gh', group: 'Links', label: 'Cratis on GitHub', keywords: 'org repositories', kind: 'event', run: () => open(person.links.cratisGithub) },
  ];

  let results: Item[] = items;
  let active = 0;
  let returnFocus: HTMLElement | null = null;

  function render() {
    const q = input!.value;
    results = items
      .map((item) => ({ item, score: fuzzyScore(q, `${item.label} ${item.keywords ?? ''}`) * (fuzzyScore(q, item.label) ? 2 : 1) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => (q ? b.score - a.score : 0))
      .map((r) => r.item);
    active = Math.min(active, Math.max(0, results.length - 1));

    list!.replaceChildren();
    if (!results.length) {
      const li = document.createElement('li');
      li.className = 'px-3 py-8 text-center font-mono text-sm text-fg-faint';
      li.setAttribute('role', 'presentation');
      li.textContent = 'EventNotFound: no matching commands';
      list!.append(li);
      input!.removeAttribute('aria-activedescendant');
      return;
    }
    let lastGroup = '';
    results.forEach((item, i) => {
      if (!q && item.group !== lastGroup) {
        lastGroup = item.group;
        const g = document.createElement('li');
        g.className = 'grp';
        g.setAttribute('role', 'presentation');
        g.textContent = item.group;
        list!.append(g);
      }
      const li = document.createElement('li');
      li.id = `pal-${item.id}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === active));
      li.dataset['index'] = String(i);
      const sw = document.createElement('span');
      sw.className = 'sw';
      sw.style.background = SWATCH[item.kind];
      sw.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = item.label;
      li.append(sw, label);
      const hint = item.hint?.();
      if (hint) {
        const h = document.createElement('span');
        h.className = 'hint';
        h.textContent = hint;
        li.append(h);
      }
      list!.append(li);
    });
    syncActive();
  }

  function syncActive() {
    list!.querySelectorAll<HTMLElement>('[role="option"]').forEach((el) => {
      const on = Number(el.dataset['index']) === active;
      el.setAttribute('aria-selected', String(on));
      if (on) {
        input!.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function show() {
    if (dialog!.open) return;
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    input!.value = '';
    active = 0;
    render();
    dialog!.showModal();
    document.documentElement.style.overflow = 'hidden';
    input!.focus();
  }

  function hide() {
    if (dialog!.open) dialog!.close();
  }

  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    returnFocus?.focus({ preventScroll: true });
  });

  async function runActive(index = active) {
    const item = results[index];
    if (!item) return;
    // Navigation moves focus to the target section; everything else returns focus.
    if (item.group === 'Navigate' || item.id === 'replay' || item.id === 'terminal') returnFocus = null;
    hide();
    await item.run();
  }

  input.addEventListener('input', () => {
    active = 0;
    render();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
      e.preventDefault();
      active = (active + 1) % Math.max(1, results.length);
      syncActive();
    } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
      e.preventDefault();
      active = (active - 1 + results.length) % Math.max(1, results.length);
      syncActive();
    } else if (e.key === 'Home' && e.ctrlKey) {
      active = 0;
      syncActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void runActive();
    }
  });

  // Keep Tab inside the dialog (the input and close button are the only stops).
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const stops = [...dialog.querySelectorAll<HTMLElement>('input, button')];
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  });

  list.addEventListener('click', (e) => {
    const li = (e.target as Element).closest<HTMLElement>('[role="option"]');
    if (li) void runActive(Number(li.dataset['index']));
  });
  list.addEventListener('pointermove', (e) => {
    const li = (e.target as Element).closest<HTMLElement>('[role="option"]');
    const i = Number(li?.dataset['index']);
    if (li && i !== active) {
      active = i;
      syncActive();
    }
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) hide();
  });
  dialog.querySelector('[data-palette-close]')?.addEventListener('click', hide);

  document.addEventListener('click', (e) => {
    if ((e.target as Element).closest('[data-palette-open]')) show();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dialog.open) hide();
      else show();
    }
  });
}
