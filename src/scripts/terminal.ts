// woksin@stream:~$ — an interactive terminal over the same data the page renders.
// Lazy-loaded by Terminal.astro on first open.
import { person, now, careerEvents, skills, cratis, talks } from '../data/site';
import { github, liveProjects as projects, mergedPrTotal, snapshotDate } from '../lib/github';
import { relativeTime } from '../lib/reltime';
import { posts as blogPosts, themes as blogThemes } from '../lib/blog';
import { copyText } from '../lib/clipboard';
import { formatMonth } from '../lib/career';
import { go, goSection, openExternal, startReplay } from '../lib/nav';
import { currentTheme, setTheme } from '../lib/theme';

type Part = string | Node;
type Command = {
  desc: string;
  usage?: string;
  hidden?: boolean;
  run: (args: string[], raw: string) => void | Promise<void>;
  complete?: (args: string[]) => string[];
};

const SECTIONS = [
  ['top', 'hero'],
  ['about', 'now & about'],
  ['career', 'career replay'],
  ['model', 'event model'],
  ['cratis', 'open source'],
  ['activity', 'contributions'],
  ['agentic', 'agentic engineering'],
  ['projects', 'things I build'],
  ['writing', 'blog posts'],
  ['talks', 'talks & writing'],
  ['skills', 'toolbox'],
  ['contact', 'contact'],
] as const;
const LINKS: Record<string, string> = {
  github: person.links.github,
  linkedin: person.links.linkedin,
  cratis: person.links.cratis,
  'cratis-github': person.links.cratisGithub,
};
const brewable = projects.filter((p) => p.install?.startsWith('brew'));

// --- tiny DOM helpers --------------------------------------------------------------
const span = (cls: string, text: string): HTMLSpanElement => {
  const s = document.createElement('span');
  s.className = cls;
  s.textContent = text;
  return s;
};
const c = {
  ev: (t: string) => span('text-event', t),
  cmd: (t: string) => span('text-command', t),
  view: (t: string) => span('text-view', t),
  muted: (t: string) => span('text-fg-muted', t),
  faint: (t: string) => span('text-fg-faint', t),
  fg: (t: string) => span('text-fg', t),
};
const link = (href: string, text = href.replace(/^https?:\/\/(www\.)?/, '')): HTMLAnchorElement => {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  a.target = '_blank';
  a.rel = 'noopener';
  a.className = 'text-command-soft';
  return a;
};
const pad = (s: string, n: number) => s + ' '.repeat(Math.max(1, n - s.length));

/** Levenshtein distance, for "did you mean" suggestions. */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

class Terminal {
  private history: string[] = [];
  private cursor = 0;
  private draft = '';
  private returnFocus: HTMLElement | null = null;
  private greeted = false;
  private readonly commands: Record<string, Command>;

  constructor(
    private readonly dialog: HTMLDialogElement,
    private readonly out: HTMLElement,
    private readonly input: HTMLInputElement,
  ) {
    try {
      this.history = JSON.parse(sessionStorage.getItem('woksin:term-history') ?? '[]') as string[];
    } catch {
      this.history = [];
    }
    this.cursor = this.history.length;
    this.commands = this.buildCommands();
    this.bind();
  }

  // --- output ------------------------------------------------------------------
  print(...parts: Part[]): void {
    const line = document.createElement('div');
    line.className = 'ln text-fg-muted';
    line.append(...parts);
    this.out.append(line);
    this.out.scrollTop = this.out.scrollHeight;
  }
  blank(): void {
    this.print(' ');
  }
  private echo(raw: string): void {
    this.print(c.view('woksin@stream'), c.faint(':'), c.cmd('~'), c.faint('$ '), c.fg(raw));
  }
  clear(): void {
    this.out.replaceChildren();
  }

  private greet(): void {
    this.greeted = true;
    this.print(c.ev('woksin@stream'), c.faint(` · stream position ${careerEvents.length} · ${mergedPrTotal.toLocaleString('en-US')} PRs merged in Cratis`));
    this.print(c.faint(`GitHub snapshot taken ${snapshotDate()}. Everything here is real data.`));
    this.print('Type ', c.fg('help'), ' to see what you can do, or tap a suggestion below.');
    this.blank();
  }

  // --- lifecycle ----------------------------------------------------------------
  open(): void {
    if (this.dialog.open) return;
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!this.greeted) this.greet();
    this.dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    this.input.focus();
  }
  close(restoreFocus = true): void {
    if (!restoreFocus) this.returnFocus = null;
    if (this.dialog.open) this.dialog.close();
  }

  private bind(): void {
    const { dialog, input, out } = this;
    dialog.addEventListener('close', () => {
      document.documentElement.style.overflow = '';
      if (this.returnFocus && this.returnFocus !== document.body && this.returnFocus.isConnected) this.returnFocus.focus({ preventScroll: true });
      // Nothing to return to: drop focus from the closed dialog once the browser is done closing it.
      else window.setTimeout(() => dialog.contains(document.activeElement) && (document.activeElement as HTMLElement).blur(), 0);
    });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) this.close();
    });
    dialog.querySelector('[data-terminal-close]')?.addEventListener('click', () => this.close());
    dialog.querySelector('[data-terminal-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.exec(input.value);
    });
    dialog.querySelector('[data-terminal-chips]')?.addEventListener('click', (e) => {
      const chip = (e.target as Element).closest<HTMLButtonElement>('[data-cmd]');
      if (!chip) return;
      void this.exec(chip.dataset['cmd'] ?? '');
      input.focus();
    });
    // Clicking the output focuses the prompt, unless the visitor is selecting text or a link.
    out.addEventListener('click', (e) => {
      if ((e.target as Element).closest('a') || window.getSelection()?.toString()) return;
      input.focus();
    });
    input.addEventListener('keydown', (e) => this.onKey(e));
    // Keep Tab completion inside the prompt and Shift+Tab cycling within the dialog.
    dialog.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || e.target === input) return;
      const stops = [...dialog.querySelectorAll<HTMLElement>('input, button, a[href]')];
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
  }

  private onKey(e: KeyboardEvent): void {
    const { input } = this;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.cursor === this.history.length) this.draft = input.value;
      this.cursor = Math.max(0, this.cursor - 1);
      input.value = this.history[this.cursor] ?? this.draft;
      requestAnimationFrame(() => input.setSelectionRange(input.value.length, input.value.length));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.cursor = Math.min(this.history.length, this.cursor + 1);
      input.value = this.cursor === this.history.length ? this.draft : (this.history[this.cursor] ?? '');
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      this.complete();
    } else if (e.key.toLowerCase() === 'l' && e.ctrlKey) {
      e.preventDefault();
      this.clear();
    } else if (e.key.toLowerCase() === 'c' && e.ctrlKey && input.selectionStart === input.selectionEnd) {
      // Ctrl+C with no selection cancels the line, like a shell.
      e.preventDefault();
      this.echo(`${input.value}^C`);
      input.value = '';
    }
  }

  private complete(): void {
    const { input } = this;
    const value = input.value;
    const parts = value.split(/\s+/);
    let candidates: string[];
    let prefix: string;
    if (parts.length <= 1) {
      prefix = parts[0] ?? '';
      candidates = Object.entries(this.commands).filter(([, cmd]) => !cmd.hidden).map(([name]) => name);
    } else {
      prefix = parts[parts.length - 1] ?? '';
      candidates = this.commands[parts[0] ?? '']?.complete?.(parts.slice(1, -1)) ?? [];
    }
    const matches = candidates.filter((x) => x.startsWith(prefix));
    if (matches.length === 1) {
      parts[parts.length - 1] = matches[0]!;
      input.value = `${parts.join(' ')} `;
    } else if (matches.length > 1) {
      // Extend to the longest common prefix, then list the options.
      let common = matches[0]!;
      for (const m of matches) while (!m.startsWith(common)) common = common.slice(0, -1);
      if (common.length > prefix.length) {
        parts[parts.length - 1] = common;
        input.value = parts.join(' ');
      } else {
        this.echo(value);
        this.print(...matches.flatMap((m) => [c.fg(m), '  ']));
      }
    }
  }

  async exec(raw: string): Promise<void> {
    const line = raw.trim();
    this.input.value = '';
    this.echo(line);
    if (!line) return;
    if (this.history[this.history.length - 1] !== line) this.history.push(line);
    this.history = this.history.slice(-50);
    this.cursor = this.history.length;
    this.draft = '';
    try {
      sessionStorage.setItem('woksin:term-history', JSON.stringify(this.history));
    } catch {
      /* ignore */
    }

    if (/^sudo\b/.test(line)) return this.print(c.ev('Permission denied:'), ' event streams are append-only.');
    if (/^rm\b/.test(line)) return this.print(c.ev('Events are immutable.'), ' Try appending a compensating event.');

    const [name = '', ...args] = line.split(/\s+/);
    const cmd = this.commands[name.toLowerCase()];
    if (!cmd) {
      const names = Object.entries(this.commands).filter(([, x]) => !x.hidden).map(([n]) => n);
      const near = names
        .map((n) => ({ n, d: distance(name.toLowerCase(), n) }))
        .filter((x) => x.d <= 2 || x.n.startsWith(name.toLowerCase()))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
        .map((x) => x.n);
      this.print(c.ev('command not found: '), c.fg(name));
      if (near.length) this.print('Did you mean ', ...near.flatMap((n, i) => [c.fg(n), i < near.length - 1 ? ', ' : '']), '? Or type ', c.fg('help'), '.');
      else this.print('Type ', c.fg('help'), ' for the list of commands.');
      return;
    }
    await cmd.run(args, line);
  }

  // --- commands -------------------------------------------------------------------
  private buildCommands(): Record<string, Command> {
    const findProject = (q = '') => projects.find((p) => p.name.toLowerCase() === q.toLowerCase());
    const projectNames = () => projects.map((p) => p.name);

    const cmds: Record<string, Command> = {
      help: {
        desc: 'list commands',
        run: () => {
          this.print(c.faint('Commands are projections over the same event stream as the page.'));
          for (const [name, cmd] of Object.entries(this.commands)) {
            if (cmd.hidden) continue;
            this.print(c.cmd(pad(cmd.usage ?? name, 26)), cmd.desc);
          }
          this.print(c.faint('Keys: ↑/↓ history · Tab complete · Ctrl+L clear · Esc close'));
        },
      },
      whoami: {
        desc: 'who is behind this stream',
        run: () => {
          this.print(c.fg(person.name), c.faint(` (${person.handle})`));
          this.print(person.title, c.faint(' · '), person.location);
          this.print(c.ev(person.tagline));
        },
      },
      now: {
        desc: 'the Sindre.Now read model',
        run: () => {
          this.print(c.faint('Projection: '), c.view('Sindre.Now'), c.faint(` · projected from ${careerEvents.length} events`));
          const rows: [string, string][] = [
            ['role', now.role],
            ['company', now.company],
            ['since', formatMonth(now.since)],
            ['assignment', now.assignment],
            ['cratis', now.cratis],
            ['building', now.building.join(', ')],
          ];
          for (const [k, v] of rows) this.print(c.faint(pad(k, 12)), c.fg(v));
        },
      },
      ls: {
        desc: 'list sections, projects or blog posts',
        usage: 'ls [projects|blog]',
        complete: () => ['projects', 'blog'],
        run: ([what]) => {
          if (what === 'blog') return this.commands['blog']!.run([], 'blog');
          if (what === 'projects') {
            for (const p of projects) this.print(c.view(pad(p.name, 12)), c.faint(pad(p.version ?? '', 9)), c.faint(pad(p.category, 8)), p.pitch);
            this.print(c.faint('cat <project> for details'));
            return;
          }
          if (what) return this.print(c.ev('ls: '), `cannot access '${what}': try `, c.fg('ls'), ' or ', c.fg('ls projects'));
          this.print(...SECTIONS.flatMap(([id]) => [c.cmd(`${id}/`), '  ']));
          this.print(c.faint('cd <section> to jump there'));
        },
      },
      cd: {
        desc: 'jump to a section',
        usage: 'cd <section>',
        complete: () => SECTIONS.map(([id]) => id),
        run: ([to]) => {
          const id = (to ?? '').replace(/\/$/, '');
          if (!id || id === '~' || id === '/') return this.navigateSection('top');
          if (id === 'cv') return this.navigate('/cv');
          if (!SECTIONS.some(([s]) => s === id)) return this.print(c.ev('cd: '), `no such section: ${id}`);
          this.navigateSection(id);
        },
      },
      cat: {
        desc: 'show a project',
        usage: 'cat <project>',
        complete: projectNames,
        run: ([name]) => {
          const p = findProject(name);
          if (!p) {
            this.print(c.ev('cat: '), name ? `${name}: no such project` : 'missing project name');
            return this.print('Try one of: ', ...projectNames().flatMap((n, i, a) => [c.fg(n), i < a.length - 1 ? ', ' : '']));
          }
          this.print(c.view(p.name), p.version ? c.faint(` ${p.version}`) : '', c.faint(` · ${p.category}`));
          this.print(c.fg(p.pitch));
          for (const f of p.features) this.print(c.ev('  • '), f);
          this.print(c.faint('stack   '), p.stack.join(', '));
          if (p.install) this.print(c.faint('install '), c.cmd(p.install));
          this.print(c.faint('source  '), link(p.url));
        },
      },
      git: {
        desc: 'career events, newest first',
        usage: 'git log [--oneline]',
        complete: (args) => (args.length ? ['--oneline'] : ['log']),
        run: ([sub, flag]) => {
          if (sub !== 'log') return this.print(c.ev('git: '), `'${sub ?? ''}' is not supported here. Try `, c.fg('git log'), ' or ', c.fg('git log --oneline'));
          const events = [...careerEvents].reverse();
          events.forEach((e, i) => {
            const head = i === 0 ? [c.faint(' ('), c.cmd('HEAD -> '), c.view('stream'), c.faint(')')] : [];
            if (flag === '--oneline') {
              this.print(c.ev(`#${String(e.seq).padStart(2, '0')}`), ...head, ' ', c.faint(e.date), ' ', c.ev(e.type), ' ', c.fg(e.title), e.org ? c.faint(` · ${e.org}`) : '');
              return;
            }
            this.print(c.ev(`event #${e.seq}`), ...head);
            this.print(c.faint('Type:  '), c.ev(e.type));
            this.print(c.faint('Date:  '), formatMonth(e.date));
            if (e.org) this.print(c.faint('Org:   '), e.org);
            this.blank();
            this.print('    ', c.fg(e.title));
            this.print('    ', e.summary);
            this.blank();
          });
        },
      },
      stream: {
        desc: 'latest merged PRs from GitHub',
        usage: 'stream tail [-n N]',
        complete: (args) => (args.length ? ['-n'] : ['tail']),
        run: ([sub, flag, n]) => {
          if (sub !== 'tail') return this.print(c.ev('stream: '), 'try ', c.fg('stream tail'));
          const prs = github.mergedPullRequests.latest;
          const count = flag === '-n' ? Math.max(1, Math.min(prs.length, Number(n) || prs.length)) : prs.length;
          this.print(c.faint(`tail ${github.org} · snapshot taken ${snapshotDate()} · ${mergedPrTotal.toLocaleString('en-US')} merged in total`));
          prs.slice(0, count).forEach((pr, i) => {
            this.print(
              c.faint(pad(i === 0 ? 'HEAD' : `HEAD~${i}`, 8)),
              c.ev('PullRequestMerged '),
              c.cmd(`${pr.repo}#${pr.number} `),
              link(pr.url, pr.title),
              c.faint(` · ${relativeTime(pr.mergedAt)}`),
            );
          });
          if (!prs.length) this.print(c.faint('EventNotFound: the snapshot has no merged pull requests.'));
        },
      },
      replay: {
        desc: 'replay my career on the page',
        run: () => {
          this.close(false);
          startReplay();
        },
      },
      cv: {
        desc: 'open the printable CV',
        run: () => this.navigate('/cv'),
      },
      skills: {
        desc: 'the toolbox, grouped',
        run: () => {
          for (const [group, list] of Object.entries(skills)) {
            this.print(c.view(group));
            this.print('  ', list.join(' · '));
          }
        },
      },
      contact: {
        desc: 'how to reach me',
        usage: 'contact [--copy]',
        complete: () => ['--copy'],
        run: async ([flag]) => {
          this.print(c.faint(pad('email', 10)), link(`mailto:${person.email}`, person.email));
          this.print(c.faint(pad('linkedin', 10)), link(person.links.linkedin));
          this.print(c.faint(pad('github', 10)), link(person.links.github));
          if (flag === '--copy') this.print((await copyText(person.email)) ? c.view(`✓ copied ${person.email}`) : c.ev('copy failed; select the address above'));
          else this.print(c.faint('contact --copy copies the email address'));
        },
      },
      open: {
        desc: 'open a profile in a new tab',
        usage: 'open github|linkedin|cratis',
        complete: () => Object.keys(LINKS),
        run: ([target]) => {
          const url = LINKS[target ?? ''];
          if (!url) return this.print(c.ev('open: '), 'choose one of ', ...Object.keys(LINKS).flatMap((k, i, a) => [c.fg(k), i < a.length - 1 ? ', ' : '']));
          this.print(c.faint('opening '), link(url));
          openExternal(url);
        },
      },
      brew: {
        desc: 'install one of my CLI tools',
        usage: 'brew install <tool>',
        complete: (args) => (args.length ? brewable.map((p) => p.name) : ['install']),
        run: async ([sub, name]) => {
          if (sub !== 'install' || !name) return this.print('Usage: ', c.fg('brew install <tool>'), c.faint(` (${brewable.map((p) => p.name).join(', ')})`));
          const p = brewable.find((x) => x.name === name.toLowerCase());
          if (!p?.install) return this.print(c.ev('Error: '), `No available formula with the name "${name}". Try: ${brewable.map((x) => x.name).join(', ')}`);
          this.print(c.cmd('==> '), c.fg(`${p.name} ${p.version ?? ''}`.trim()), c.faint(` · ${p.pitch}`));
          this.print(c.faint('Run this in your own terminal:'));
          this.print('  ', c.cmd(p.install));
          this.print((await copyText(p.install)) ? c.view('✓ copied to the clipboard') : c.faint('(select the line above to copy it)'));
        },
      },
      theme: {
        desc: 'switch the colour theme',
        usage: 'theme light|dark',
        complete: () => ['light', 'dark'],
        run: ([t]) => {
          if (t !== 'light' && t !== 'dark') return this.print('theme is ', c.fg(currentTheme()), c.faint('; use theme light or theme dark'));
          setTheme(t);
          this.print(c.view('✓ '), `theme set to ${t}`);
        },
      },
      blog: {
        desc: 'my posts on blog.cratis.io',
        usage: 'blog [theme]',
        complete: () => blogThemes.map((t) => t.id),
        run: ([theme]) => {
          const t = blogThemes.find((x) => x.id === theme);
          if (theme && !t) return this.print(c.ev('blog: '), 'themes are ', ...blogThemes.flatMap((x, i, a) => [c.fg(x.id), i < a.length - 1 ? ', ' : '']));
          const list = t ? blogPosts.filter((p) => p.themes.includes(t.id)) : blogPosts;
          this.print(c.faint(`${list.length} post${list.length === 1 ? '' : 's'}${t ? ` about ${t.label}` : ''} on blog.cratis.io`));
          for (const p of list) this.print(c.ev(pad(p.part !== undefined ? `Part ${String(p.part).padStart(2, '0')}` : 'Overview', 9)), link(p.url, p.headline), c.faint(p.minutes ? ` · ${p.minutes} min` : ''));
        },
      },
      talks: {
        desc: 'talks & writing',
        run: () => {
          for (const t of talks) {
            this.print(c.ev(t.year), ' ', c.fg(t.title), c.faint(` · ${t.host}`));
            this.print('  ', link(t.url, 'watch'));
          }
        },
      },
      cratis: {
        desc: 'what Cratis is',
        run: () => {
          this.print(c.fg(cratis.pitch));
          this.print(c.faint(`${mergedPrTotal.toLocaleString('en-US')} merged PRs · `), link(person.links.cratis));
          for (const r of cratis.repos) this.print(c.cmd(pad(r.name, 21)), c.faint(pad(r.role, 16)), r.url ? link(r.url, r.desc) : r.desc);
        },
      },
      clear: { desc: 'clear the screen (Ctrl+L)', run: () => this.clear() },
      exit: { desc: 'close the terminal (Esc)', run: () => this.close() },
      // Hidden aliases.
      history: {
        desc: 'command history',
        hidden: true,
        run: () => this.history.forEach((h, i) => this.print(c.faint(String(i + 1).padStart(4)), '  ', h)),
      },
      pwd: { desc: '', hidden: true, run: () => this.print(location.pathname) },
      echo: { desc: '', hidden: true, run: (_, raw) => this.print(raw.replace(/^echo\s?/, '')) },
      man: { desc: '', hidden: true, run: () => this.commands['help']!.run([], 'help') },
      vim: { desc: '', hidden: true, run: () => this.print('You are now trapped. Just kidding: press ', c.fg('Esc'), '.') },
    };
    return cmds;
  }

  private navigateSection(id: string): void {
    this.close(false);
    goSection(id);
  }
  private navigate(href: string): void {
    this.print(c.faint(`navigating to ${href}…`));
    this.close(false);
    void go(href);
  }
}

// One Terminal per dialog element: the view-transition router replaces the DOM on navigation.
const instances = new WeakMap<HTMLDialogElement, Terminal>();

export function openTerminal(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-terminal]');
  const out = dialog?.querySelector<HTMLElement>('[data-terminal-out]');
  const input = dialog?.querySelector<HTMLInputElement>('[data-terminal-input]');
  if (!dialog || !out || !input) return;
  let term = instances.get(dialog);
  if (!term) {
    term = new Terminal(dialog, out, input);
    instances.set(dialog, term);
  }
  term.open();
}
