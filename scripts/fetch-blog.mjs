#!/usr/bin/env node
// Captures Sindre's posts on blog.cratis.io at build time and writes src/data/blog.json.
//
// Reads his author page (and any further pages of it), so only posts that list him as an
// author are included. Never fails the build: on any error it keeps the committed snapshot.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../src/data/blog.json', import.meta.url));
const BASE = 'https://blog.cratis.io';
const AUTHOR = '/authors/sindre-alstad-wilting/';
const MAX_PAGES = 10;

const warn = (msg) => console.warn(`[fetch-blog] warning: ${msg}; keeping the committed snapshot.`);

const decode = (s) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

function parse(html) {
  const posts = [];
  for (const block of html.split('<article class="sl-blog-preview').slice(1)) {
    const href = block.match(/class="sl-blog-preview-link[^"]*" href="([^"]+)"/)?.[1];
    const title = block.match(/<h2 class="sl-blog-preview-title[^"]*">([\s\S]*?)<\/h2>/)?.[1];
    const date = block.match(/<time[^>]*datetime="([^"]+)"/)?.[1];
    if (!href || !title || !date) continue;
    const url = new URL(href, BASE);
    // Only ever link to posts on the blog itself.
    if (url.protocol !== 'https:' || url.origin !== BASE) continue;
    const minutes = Number(block.match(/(\d+) min read/)?.[1]) || undefined;
    const excerpt = block.match(/sl-blog-preview-excerpt[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
    const tags = [...block.matchAll(/class="sl-blog-tag[^"]*" href="[^"]*">([^<]+)<\/a>/g)].map((m) => decode(m[1]));
    posts.push({
      title: decode(title),
      url: url.toString(),
      date,
      minutes,
      description: decode(excerpt),
      tags,
    });
  }
  return posts;
}

async function page(path) {
  const res = await fetch(new URL(path, BASE), {
    headers: { 'user-agent': 'woksin.com-build' },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return res.text();
}

async function main() {
  const posts = [];
  for (let n = 1; n <= MAX_PAGES; n++) {
    const html = await page(n === 1 ? AUTHOR : `${AUTHOR}${n}/`);
    if (!html) break;
    const found = parse(html);
    if (!found.length) break;
    posts.push(...found);
    if (!html.includes(`${AUTHOR}${n + 1}/`)) break;
  }
  if (!posts.length) return warn('no posts found on the author page');

  const unique = [...new Map(posts.map((p) => [p.url, p])).values()].sort((a, b) => b.date.localeCompare(a.date));
  const snapshot = { fetchedAt: new Date().toISOString(), source: new URL(AUTHOR, BASE).toString(), posts: unique };
  await writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`[fetch-blog] wrote snapshot: ${unique.length} posts.`);
}

try {
  await main();
} catch (err) {
  warn(err instanceof Error ? err.message : String(err));
}
