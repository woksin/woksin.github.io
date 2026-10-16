// The Cast v2 profile is a projection of the same content and snapshots as the site.
import {
  person, now, stats, careerEvents, cratis, talks, community, agentic,
  skills, education, certifications,
} from '../data/site';
import { eventModel } from '../data/eventModel';
import { github, cratisRepos, liveProjects } from './github';
import { themes } from './blog';
import blog from '../data/blog.json';

const liveStats: Record<string, string> = {
  contributionsLastYear: 'contributionsLastYear',
  cratisMergedPrs: 'mergedPullRequests',
  cratisRankOne: 'rankOneRepositories',
  chronicleLanguages: 'clientLanguages',
};

/** Only the endpoint knows the built portrait URL and Astro's canonical site URL. */
// Cast renders *words* as the Cratis display accent; the site itself keeps its own styling.
const tagline = person.tagline.replace(/remember everything\.$/, '*remember everything.*');

export function buildCastJson(photo: string, siteUrl: URL) {
  return {
    $schema: 'https://unpkg.com/@cratis/cast/cast-json.schema.json',
    castJsonVersion: 2,
    handle: person.handle,
    generator: 'woksin.com build',
    // The directory also reads these summaries for its member cards.
    title: person.title,
    // Cast renders *words* as the Cratis display accent; the site itself keeps its own styling.
    tagline: person.tagline,
    profile: {
      cast: {
        site: { url: siteUrl.origin, language: 'en' },
        person: { ...person, photo, tagline },
        now,
        stats: stats.map((stat) => ({ ...stat, live: liveStats[stat.live] })),
        career: { events: careerEvents },
        cratis: {
          pitch: cratis.pitch,
          role: cratis.role,
          links: {
            'cratis.io': person.links.cratis,
            'github.com/Cratis': person.links.cratisGithub,
            About: cratis.about,
          },
          pipeline: cratis.pipeline,
          clientLanguages: cratis.clientLanguages,
          repos: cratisRepos,
          highlights: cratis.highlights,
        },
        projects: liveProjects.map((project) => ({
          ...project,
          featured: project.name === 'workstats' || project.name === 'Varde',
        })),
        projectCategories: [
          { id: 'cli', label: 'CLI' },
          { id: 'agents', label: 'Agent tooling', filter: 'Agents' },
          { id: 'app', label: 'App', filter: 'Apps' },
        ],
        talks: talks.map(({ year: _year, ...talk }) => talk),
        community,
        writing: {
          sources: [{ starlightBlogAuthor: blog.source }],
          themes,
          agenticTheme: 'ai',
        },
        agentic,
        eventModel,
        skills,
        education,
        certifications,
        github: {
          login: person.handle,
          orgs: [github.org],
          releases: Object.keys(github.releases).map((name) => `${person.handle}/${name}`),
          stars: Object.keys(github.stars).map((name) => `${github.org}/${name}`),
        },
        // No accent: on cast.cratis.io the profile uses the Cratis violet.
        theme: { mode: 'dark' },
      },
      github: {
        login: github.login,
        fetchedAt: github.fetchedAt,
        orgs: [github.org],
        contributions: github.contributions,
        mergedPullRequests: {
          total: github.mergedPullRequests.total,
          byOrg: { [github.org]: github.mergedPullRequests.total },
          latest: github.mergedPullRequests.latest.map(({ repo, ...pr }) => ({
            ...pr,
            repository: `${github.org}/${repo}`,
          })),
        },
        repositories: Object.fromEntries(
          Object.entries(github.cratisRepos ?? {}).map(([name, counts]) => [
            `${github.org}/${name}`, counts,
          ]),
        ),
        releases: Object.fromEntries(
          Object.entries(github.releases).map(([name, release]) => [
            `${person.handle}/${name}`, release,
          ]),
        ),
        stars: Object.fromEntries(
          Object.entries(github.stars).map(([name, count]) => [`${github.org}/${name}`, count]),
        ),
      },
      writing: {
        fetchedAt: blog.fetchedAt,
        sources: [blog.source],
        posts: blog.posts,
      },
    },
  };
}
