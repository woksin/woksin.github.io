// Typed access to the blog snapshot captured at build time by scripts/fetch-blog.mjs.
import raw from '../data/blog.json';

export type RawPost = { title: string; url: string; date: string; minutes?: number; description: string; tags: string[] };
export type Post = RawPost & { headline: string; series?: string; part?: number; themes: ThemeId[] };

export type ThemeId = 'event-sourcing' | 'event-modeling' | 'ai' | 'arc' | 'chronicle';

/** Reading themes for the filter, each a set of the blog's own tags. */
export const themes: { id: ThemeId; label: string; tags: string[] }[] = [
  { id: 'event-sourcing', label: 'Event sourcing', tags: ['event-sourcing', 'projections', 'read-models', 'replay', 'reactors', 'cqrs', 'constraints'] },
  { id: 'event-modeling', label: 'Event modeling', tags: ['event-modeling', 'screenplay', 'stage', 'scene', 'prologue', 'cratis-studio'] },
  { id: 'ai', label: 'AI & agents', tags: ['ai', 'agents', 'mcp', 'cratis-direct'] },
  { id: 'arc', label: 'Arc', tags: ['arc'] },
  { id: 'chronicle', label: 'Chronicle', tags: ['chronicle'] },
];

const snapshot = raw as { fetchedAt: string; source: string; posts: RawPost[] };

/** Splits "Title · Series, Part 3" into its parts. */
function split(title: string): Pick<Post, 'headline' | 'series' | 'part'> {
  const m = title.match(/^(.*?)\s+·\s+(.+?),\s+Part\s+(\d+)$/);
  if (m) return { headline: m[1]!, series: m[2]!, part: Number(m[3]) };
  const s = title.match(/^(.*?)\s+·\s+(.+)$/);
  return s ? { headline: s[1]!, series: s[2]! } : { headline: title };
}

/** Newest first; posts published together keep their series order. */
export const posts: Post[] = snapshot.posts
  .map((p) => ({ ...p, ...split(p.title), themes: themes.filter((t) => p.tags.some((tag) => t.tags.includes(tag))).map((t) => t.id) }))
  .sort((a, b) => b.date.slice(0, 10).localeCompare(a.date.slice(0, 10)) || (a.part ?? 0) - (b.part ?? 0));

export const blogSource = snapshot.source;
export const blogFetchedAt = snapshot.fetchedAt;
export const readingMinutes = posts.reduce((n, p) => n + (p.minutes ?? 0), 0);
export const postsFor = (theme: ThemeId): Post[] => posts.filter((p) => p.themes.includes(theme));
