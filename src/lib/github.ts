// Typed access to the GitHub snapshot captured at build time by scripts/fetch-github.mjs.
import raw from '../data/github.json';
import { cratis, projects, type Project, type CratisRepo } from '../data/site';

export type PullRequest = { title: string; repo: string; number: number; url: string; mergedAt: string };
export type Week = { start: string; counts: number[] };
type Snapshot = {
  fetchedAt: string;
  login: string;
  org: string;
  contributions: { total: number; commits?: number; weeks: Week[] };
  mergedPullRequests: { total: number; latest: PullRequest[] };
  releases: Record<string, { tag: string; publishedAt: string; url: string }>;
  stars: Record<string, number>;
  cratisRepos?: Record<string, { commits: number; prs: number; rank: number }>;
  dolittleMergedPrs?: number;
};

export const github = raw as Snapshot;

/** Merged Cratis PRs from the snapshot, falling back to the hand-maintained number. */
export const mergedPrTotal: number = github.mergedPullRequests.total ?? cratis.mergedPrs;

/** Per-repository figures prefer the snapshot; hand-entered values are fallbacks only. */
export const cratisRepos: CratisRepo[] = cratis.repos.map((repo) => {
  const counts = repo.url ? github.cratisRepos?.[repo.name] : undefined;
  if (!counts) return repo;
  const rank = counts.rank;
  const role = repo.founded ? (rank === 1 ? 'Founder & lead' : 'Founder')
    : rank === 1 ? (repo.role.startsWith('#') ? '#1 committer' : 'Lead developer')
    : rank === 2 ? (repo.group === 'client' ? '#2 contributor' : '#2 all-time') : 'Contributor';
  return { ...repo, ...counts, role };
});

/** Floors to hundreds for an honest "3,100+" style figure. */
export const mergedPrFloor: number = Math.floor(mergedPrTotal / 100) * 100;

/** Projects with versions taken from the latest GitHub release when one was captured. */
export const liveProjects: Project[] = projects.map((p) => {
  const release = github.releases[p.name];
  return release ? { ...p, version: release.tag } : p;
});

export const snapshotDate = (d = github.fetchedAt): string =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Repo names in the live feed, most recent first, without duplicates. */
export const liveRepos: string[] = [...new Set(github.mergedPullRequests.latest.map((p) => p.repo))];
