import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import avatar from '../assets/avatar.jpeg';
import { buildCastJson } from '../lib/castJson';

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('The Cast profile requires Astro’s site URL.');
  const portrait = await getImage({ src: avatar, width: 640, format: 'webp' });
  const profile = buildCastJson(new URL(portrait.src, site).href, site);
  return new Response(`${JSON.stringify(profile)}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
