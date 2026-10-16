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
// Read only the public entries in cratis.repos, keeping site.ts the source of truth.
const site = await readFile(new URL('../src/data/site.ts', import.meta.url), 'utf8').catch(() => '');
const repoSource = site.split('export const cratis = {')[1]?.split('] as CratisRepo[]')[0] ?? '';
const REPOS = [...repoSource.matchAll(/name: '([^']+)', url: 'https:\/\/github\.com\/Cratis\/([^']+)'/g)]
  .filter((m) => m[1] === m[2]).map((m) => m[1]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  ${TOOLS.map((t) => `${t}: repository(owner: "${LOGIN}", name: "${t}") { isPrivate url latestRelease { tagName publishedAt url } }`).join('\n  ')}
  ${STARRED.map((r) => `${r}: repository(owner: "${ORG}", name: "${r}") { isPrivate url stargazerCount }`).join('\n  ')}
  ${REPOS.map((r, i) => `repo${i}: repository(owner: "${ORG}", name: "${r}") { isPrivate }`).join('\n  ')}
  merged: search(query: $prs, type: ISSUE, first: 60) {
    issueCount
    nodes { ... on PullRequest { title number url mergedAt repository { name isPrivate } } }
  }
}`;

async function rest(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { authorization: `bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'woksin.com-build' },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status !== 200) throw new Error(`${path}: GitHub answered ${res.status}`);
  return res;
}

async function contributors(repo, token) {
  const all = [];
  for (let page = 1; ; page++) {
    const path = `/repos/${ORG}/${repo}/contributors?per_page=100&page=${page}`;
    let res;
    try { res = await rest(path, token); }
    catch (err) {
      if (!String(err).includes('answered 202')) throw err;
      await sleep(1000);
      res = await rest(path, token);
    }
    let items = await res.json();
    if (!items.length && page === 1) {
      await sleep(1000);
      res = await rest(path, token);
      items = await res.json();
      if (!items.length) throw new Error(`${repo}: contributors repeatedly empty`);
    }
    all.push(...items);
    if (!res.headers.get('link')?.includes('rel="next"')) break;
  }
  const humans = all.filter((c) => c.type !== 'Bot' && !c.login.toLowerCase().endsWith('[bot]') && c.login.toLowerCase() !== 'cratis-bot')
    .sort((a, b) => b.contributions - a.contributions);
  const index = humans.findIndex((c) => c.login.toLowerCase() === LOGIN);
  return { commits: index < 0 ? 0 : humans[index].contributions, rank: index + 1 };
}

async function mergedCount(q, token) {
  // Search has its own 30/minute authenticated limit, independent of core requests.
  await sleep(2100);
  const body = await (await rest(`/search/issues?q=${encodeURIComponent(q)}&per_page=1`, token)).json();
  if (!Number.isInteger(body.total_count) || body.incomplete_results) throw new Error('incomplete search response');
  return body.total_count;
}

async function main() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) return warn('no GITHUB_TOKEN or GH_TOKEN in the environment');
  if (!REPOS.length) return warn('could not read public Cratis repositories from site.ts');

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
    .filter((n) => n?.mergedAt && n.repository?.isPrivate === false)
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))
    .slice(0, PR_LIMIT)
    .map((n) => ({ title: n.title, repo: n.repository.name, number: n.number, url: n.url, mergedAt: n.mergedAt }));

  const releases = Object.fromEntries(
    TOOLS.filter((t) => d[t]?.isPrivate === false && d[t]?.latestRelease).map((t) => [
      t,
      { tag: d[t].latestRelease.tagName, publishedAt: d[t].latestRelease.publishedAt, url: d[t].latestRelease.url },
    ]),
  );
  const stars = Object.fromEntries(STARRED.filter((r) => d[r]?.isPrivate === false).map((r) => [r, d[r].stargazerCount]));
  const previous = JSON.parse(await readFile(OUT, 'utf8'));
  const cratisRepos = {};
  for (const [i, repo] of REPOS.entries()) {
    // Do not retain even an older snapshot for a repository that is now private.
    if (d[`repo${i}`]?.isPrivate !== false) continue;
    if (previous.cratisRepos?.[repo]) cratisRepos[repo] = previous.cratisRepos[repo];
    try {
      const counts = await contributors(repo, token);
      const prs = await mergedCount(`author:${LOGIN} repo:${ORG}/${repo} is:public is:pr is:merged`, token);
      cratisRepos[repo] = { ...counts, prs };
    } catch (err) {
      // Keep that repository's previous values; never let one repository stop the whole refresh.
      warn(`${repo}: ${err instanceof Error ? err.message : err} (keeping previous values)`);
    }
  }
  let dolittleMergedPrs = previous.dolittleMergedPrs;
  try {
    dolittleMergedPrs = await mergedCount(`author:${LOGIN} org:dolittle is:public is:pr is:merged`, token);
  } catch (err) { warn(`Dolittle: ${err instanceof Error ? err.message : err}`); }

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    login: LOGIN,
    org: ORG,
    cratisRepos,
    ...(dolittleMergedPrs !== undefined ? { dolittleMergedPrs } : {}),
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
