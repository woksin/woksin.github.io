// Public, unauthenticated home-page refresh. Snapshot rendering never depends on it.
import { onPageLoad } from '../lib/lifecycle';
import { relativeTime } from '../lib/reltime';
import type { PullRequest } from '../lib/github';

const TTL = 5 * 60_000;
type Merged = { total: number; latest: PullRequest[] };
type Activity = { type: string; repo: string; at: string };
let merged: { at: number; data: Merged } | undefined;
const pending = new Map<string, Promise<unknown>>();

export const getLiveMerged = (): Merged | undefined => merged && Date.now() - merged.at < TTL ? merged.data : undefined;

async function cached<T>(key: string, path: string, parse: (data: any) => T): Promise<T> {
  try {
    const entry = JSON.parse(sessionStorage.getItem(`github:${key}`) ?? 'null');
    if (entry && Date.now() - entry.at >= 0 && Date.now() - entry.at < TTL) return parse(entry.data);
  } catch { /* Storage may be disabled; the snapshot still works. */ }
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const request = (async () => {
    const res = await fetch(`https://api.github.com${path}`, { signal: AbortSignal.timeout(8000) });
    if (res.status !== 200) throw new Error('GitHub unavailable');
    const data: unknown = await res.json();
    const parsed = parse(data);
    try { sessionStorage.setItem(`github:${key}`, JSON.stringify({ at: Date.now(), data })); } catch { /* Optional cache. */ }
    return parsed;
  })();
  pending.set(key, request);
  try { return await request; } finally { pending.delete(key); }
}

function parseMerged(data: any): Merged {
  if (!Number.isSafeInteger(data?.total_count) || data.total_count < 0 || data.incomplete_results || !Array.isArray(data.items)) throw new Error('Invalid search');
  const latest: PullRequest[] = data.items.flatMap((item: any) => {
    const repo = /^https:\/\/api\.github\.com\/repos\/Cratis\/([^/]+)$/i.exec(item?.repository_url ?? '')?.[1];
    const at = item?.pull_request?.merged_at;
    if (!repo || !Number.isFinite(Date.parse(at)) || typeof item.title !== 'string' || !Number.isSafeInteger(item.number)
      || item.html_url !== `https://github.com/Cratis/${repo}/pull/${item.number}`) return [];
    return [{ title: item.title, repo, number: item.number, url: item.html_url, mergedAt: at }];
  }).sort((a: PullRequest, b: PullRequest) => b.mergedAt.localeCompare(a.mergedAt));
  return { total: data.total_count, latest };
}

function parseEvents(data: any): Activity[] {
  if (!Array.isArray(data)) throw new Error('Invalid events');
  return data.flatMap((event: any) => {
    if (!event?.repo?.name || !Number.isFinite(Date.parse(event.created_at))) return [];
    const p = event.payload ?? {};
    let type: string | undefined;
    switch (event.type) {
      case 'PushEvent': type = 'CommitsPushed'; break;
      case 'PullRequestEvent': if (p.action === 'closed' && p.pull_request?.merged) type = 'PullRequestMerged'; break;
      case 'CreateEvent': type = p.ref_type === 'branch' ? 'BranchCreated' : p.ref_type === 'tag' ? 'TagCreated' : undefined; break;
      case 'ReleaseEvent': if (p.action === 'published') type = 'ReleasePublished'; break;
      case 'IssuesEvent': type = p.action === 'opened' ? 'IssueOpened' : p.action === 'closed' ? 'IssueClosed' : undefined; break;
      case 'IssueCommentEvent': if (p.action === 'created') type = 'CommentAdded'; break;
      case 'PullRequestReviewEvent': if (p.action === 'submitted') type = 'ReviewSubmitted'; break;
    }
    return type ? [{ type, repo: event.repo.name, at: event.created_at }] : [];
  }).sort((a: Activity, b: Activity) => b.at.localeCompare(a.at));
}

function renderMerged(data: Merged): void {
  const fmt = new Intl.NumberFormat('en-US');
  document.querySelectorAll<HTMLElement>('[data-merged-prs]').forEach((el) => {
    const kind = el.dataset['mergedPrs'];
    el.dataset['live'] = 'true'; // Supersede any snapshot count-up animation.
    el.textContent = fmt.format(kind === 'exact' ? data.total : Math.floor(data.total / 100) * 100) + (kind === 'floor' ? '+' : '');
  });
  document.querySelectorAll('[data-pr-status]').forEach((el) => { el.textContent = 'live'; });
  const list = document.querySelector('[data-pr-feed]');
  const template = document.querySelector<HTMLTemplateElement>('[data-pr-template]');
  if (!list || !template) return;
  const rows = data.latest.slice(0, 8).map((pr, i) => {
    const row = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
    row.style.setProperty('--i', String(i));
    const set = (selector: string, text: string) => { row.querySelector(selector)!.textContent = text; };
    row.querySelector('a')!.href = pr.url;
    set('[data-pr-head]', i === 0 ? 'HEAD' : `HEAD~${i}`);
    set('[data-pr-repo]', `Cratis/${pr.repo}`);
    set('[data-pr-number]', `#${pr.number}`);
    set('[data-pr-title]', pr.title);
    const time = row.querySelector('time')!;
    time.dateTime = pr.mergedAt;
    time.textContent = relativeTime(pr.mergedAt);
    return row;
  });
  list.replaceChildren(...rows);
}

onPageLoad(() => {
  if (!document.querySelector('[data-hero]')) return;
  let active = true;
  let idle: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = () => {
    if (!active || document.visibilityState !== 'visible') return;
    void cached('merged', '/search/issues?q=author:woksin+org:Cratis+is:public+is:pr+is:merged&sort=updated&order=desc&per_page=12', parseMerged)
      .then((data) => {
        merged = { at: Date.now(), data };
        if (active && document.visibilityState === 'visible') renderMerged(data);
      }).catch(() => { /* Quietly keep the build-time snapshot. */ });
    void cached('events', '/users/woksin/events/public?per_page=30', parseEvents)
      .then((events) => {
        if (!active || document.visibilityState !== 'visible' || !events.length) return;
        const event = events[0]!;
        const el = document.querySelector('[data-public-event]');
        if (el) {
          el.textContent = `last event ${relativeTime(event.at)}`;
          el.setAttribute('title', `${event.type} · ${event.repo} · ${event.at}`);
        }
        const status = document.querySelector('[data-event-status]');
        if (status) status.textContent = 'live';
      }).catch(() => { /* Quietly keep the career-stream position. */ });
  };
  const schedule = () => {
    if (document.visibilityState !== 'visible' || idle !== undefined || timer !== undefined) return;
    if ('requestIdleCallback' in window) idle = window.requestIdleCallback(() => { idle = undefined; refresh(); });
    else timer = setTimeout(() => { timer = undefined; refresh(); }, 0);
  };
  document.addEventListener('visibilitychange', schedule);
  schedule();
  return () => {
    active = false;
    document.removeEventListener('visibilitychange', schedule);
    if (idle !== undefined) window.cancelIdleCallback(idle);
    if (timer !== undefined) clearTimeout(timer);
  };
});
