#!/usr/bin/env node
// Captures live GitHub data for the site at build time and writes src/data/github.json.
//
// Never fails the build: on a missing token or any error it keeps the committed snapshot
// and logs a warning. Run locally with `GITHUB_TOKEN=$(gh auth token) npm run fetch:github`.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../src/data/github.json', import.meta.url));
const LOGIN = 'woksin';
const ORG = 'Cratis';
const TOOLS = ['workstats', 'reap', 'gearprice'];
const STARRED = ['Chronicle', 'Arc'];
const PR_LIMIT = 12;

const warn = (msg) => console.warn(`[fetch-github] warning: ${msg}; keeping the committed snapshot.`);

const query = `
query($login: String!, $prs: String!) {
  user(login: $login) {
    contributionsCollection {
      totalCommitContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
  ${TOOLS.map((t) => `${t}: repository(owner: "${LOGIN}", name: "${t}") { url latestRelease { tagName publishedAt url } }`).join('\n  ')}
  ${STARRED.map((r) => `${r}: repository(owner: "${ORG}", name: "${r}") { url stargazerCount }`).join('\n  ')}
  merged: search(query: $prs, type: ISSUE, first: 60) {
    issueCount
    nodes { ... on PullRequest { title number url mergedAt repository { name isPrivate } } }
  }
}`;

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return warn('no GITHUB_TOKEN or GH_TOKEN in the environment');

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      authorization: `bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'woksin.com-build',
    },
    body: JSON.stringify({
      query,
      variables: { login: LOGIN, prs: `author:${LOGIN} org:${ORG} is:public is:pr is:merged sort:updated-desc` },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return warn(`GitHub answered ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (body.errors?.length) return warn(`GraphQL errors: ${body.errors.map((e) => e.message).join('; ')}`);
  const d = body.data;
  const calendar = d?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar || !d.merged) return warn('unexpected response shape');

  const weeks = calendar.weeks.map((w) => ({
    start: w.contributionDays[0]?.date,
    counts: w.contributionDays.map((day) => day.contributionCount),
  }));

  const pullRequests = d.merged.nodes
    // The token can see private repositories; only public work is shown on the site.
    .filter((n) => n?.mergedAt && n.repository && !n.repository.isPrivate)
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))
    .slice(0, PR_LIMIT)
    .map((n) => ({ title: n.title, repo: n.repository.name, number: n.number, url: n.url, mergedAt: n.mergedAt }));

  const releases = Object.fromEntries(
    TOOLS.filter((t) => d[t]?.latestRelease).map((t) => [
      t,
      { tag: d[t].latestRelease.tagName, publishedAt: d[t].latestRelease.publishedAt, url: d[t].latestRelease.url },
    ]),
  );
  const stars = Object.fromEntries(STARRED.filter((r) => d[r]).map((r) => [r, d[r].stargazerCount]));

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    login: LOGIN,
    org: ORG,
    contributions: { total: calendar.totalContributions, commits: d.user.contributionsCollection.totalCommitContributions ?? 0, weeks },
    mergedPullRequests: { total: d.merged.issueCount, latest: pullRequests },
    releases,
    stars,
  };

  // Keep the per-week count arrays on one line so snapshot diffs stay readable.
  const json = JSON.stringify(snapshot, null, 2).replace(/\[\s*(\d[\d,\s]*?)\s*\]/g, (_, nums) => `[${nums.split(/[\s,]+/).join(', ')}]`);
  await writeFile(OUT, `${json}\n`);
  console.log(
    `[fetch-github] wrote snapshot: ${snapshot.contributions.total} contributions, ${pullRequests.length} PRs (of ${snapshot.mergedPullRequests.total}), ${Object.keys(releases).length} releases.`,
  );
}

try {
  await main();
} catch (err) {
  warn(err instanceof Error ? err.message : String(err));
}
// Make sure a snapshot exists at all; the site imports it.
try {
  await readFile(OUT);
} catch {
  console.warn('[fetch-github] warning: no snapshot exists at src/data/github.json; the build will fail to import it.');
}
