# woksin.com

Portfolio and CV of Sindre Wilting, built as an "event-sourced CV": the career is an event stream and every section of the page is a projection of it.

Built with [Astro](https://astro.build), TypeScript and Tailwind CSS. Static output, no UI framework; the interactive parts (hero event board, career replay, event model, command palette, terminal) are small vanilla TypeScript modules, with view transitions between pages.

## Develop

Requires Node.js 22 or newer.

```sh
npm install
npm run dev      # http://localhost:4321
npm run check    # astro check (TypeScript)
npm run build    # static site in dist/
npm run preview  # serve dist/ locally
```

## Content

All content lives in [`src/data/site.ts`](src/data/site.ts). Edit it and every page updates: the home page, the career replay (which folds `careerEvents` through the reducer in [`src/lib/career.ts`](src/lib/career.ts)) and the printable CV at `/cv`.

Live data is captured at build time by two scripts that `npm run build` runs first (`prebuild`). Both keep the committed snapshot and only warn when anything fails, so the build never breaks on them:

- [`scripts/fetch-github.mjs`](scripts/fetch-github.mjs) writes `src/data/github.json`: contribution calendar, merged Cratis PR totals and latest PRs, per-repository commits/merged PRs/human-contributor ranks, public Dolittle merged PRs, tool releases and stars. Only public repositories are included; repository cards prefer the snapshot over the hand-entered fallbacks. Needs `GITHUB_TOKEN` or `GH_TOKEN`; locally `GITHUB_TOKEN=$(gh auth token) npm run fetch:github`.
- [`scripts/fetch-blog.mjs`](scripts/fetch-blog.mjs) writes `src/data/blog.json` from the author page on blog.cratis.io (`npm run fetch:blog`).

Snapshots refresh on hourly builds. On the visible home page, an idle-time browser refresh makes two unauthenticated public GitHub requests: merged Cratis PRs (total and feed) and public activity (the hero's latest event). Responses are cached in `sessionStorage` for five minutes; failures silently leave the build-time values. Updated figures say “live”; snapshot figures show their capture date. The terminal's `stream tail` uses the browser PR data when available. Repository ranks, commits, contributions, releases and stars remain build-time snapshots; founded repositories and client-language counts remain static facts.

The Event Modeling slice is [`src/data/eventModel.ts`](src/data/eventModel.ts), taken from [Varde](https://github.com/woksin/Varde).

The portrait is `src/assets/avatar.jpeg`. The social preview image (`public/og.png`) and `public/apple-touch-icon.png` are committed images.

## Deploy

[`.github/workflows/publish.yaml`](.github/workflows/publish.yaml) builds the site on every push to `master`, hourly at 17 minutes past the hour (to refresh the snapshots) or on a manual run, and deploys `dist/` to GitHub Pages. Pull requests run `npm run check` and `npm run build` without deploying. The custom domain is set by `public/CNAME` (`www.woksin.com`).
