#!/usr/bin/env node
// Usage: node scripts/check-cast-json.mjs [dist/cast.json] [local Cast v2 schema]
// CI uses the published schema; a local path also supports unpublished schema versions.
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schemaUrl = 'https://unpkg.com/@cratis/cast/cast-json.schema.json';
const [profilePath = 'dist/cast.json', schemaPath] = process.argv.slice(2);

async function loadSchema() {
  if (schemaPath) return JSON.parse(await readFile(schemaPath, 'utf8'));
  const response = await fetch(schemaUrl, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Cast v2 schema: ${response.status} from ${schemaUrl}`);
  return response.json();
}

function https(url) {
  assert.equal(new URL(url).protocol, 'https:', `Expected an absolute https URL: ${url}`);
}

// JSON Schema's URI format alone does not constrain links to https.
function checkLinks(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['$schema', 'url', 'photo', 'orgUrl', 'repo', 'starlightBlogAuthor', 'rss'].includes(key)) {
      https(child);
    } else if (key === 'links') {
      Object.values(child).forEach(https);
    } else if (key === 'sources' && child.every((source) => typeof source === 'string')) {
      child.forEach(https);
    } else {
      checkLinks(child);
    }
  }
}

const raw = await readFile(profilePath);
assert(raw.byteLength < 1_000_000, 'cast.json must be smaller than 1 MB');
const profile = JSON.parse(raw.toString('utf8'));
const schema = await loadSchema();
assert.equal(schema.properties?.castJsonVersion?.const, 2, 'Expected the Cast v2 schema');
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
assert(validate(profile), ajv.errorsText(validate.errors, { separator: '\n' }));
assert.equal(profile.handle, 'woksin');
assert.equal(profile.profile.cast.person.handle, profile.handle);
assert.equal(profile.profile.github.login, profile.handle);
assert(!('verification' in profile) && !('tier' in profile), 'Do not claim a tier');
assert(!('tier' in profile.profile.cast), 'Do not claim a tier');
checkLinks(profile);
const photo = new URL(profile.profile.cast.person.photo);
assert.equal(photo.origin, new URL(profile.profile.cast.site.url).origin);
await access(join(dirname(profilePath), photo.pathname));
console.log(`Cast v2 profile valid: ${raw.byteLength} bytes, ${profile.profile.cast.career.events.length} career events, ${profile.profile.cast.projects.length} projects.`);
