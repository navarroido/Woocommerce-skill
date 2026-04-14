#!/usr/bin/env node
/**
 * validate-api-index.mjs
 * Cross-checks REST endpoints in skill frontmatter against docs/rest-api-index.md.
 * Reports:
 *   - Endpoints used in skills but not registered in the index (missing)
 *   - Endpoints registered in the index but used in no skill (orphan)
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';
import matter from 'gray-matter';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Parse a rest_endpoints frontmatter entry like "GET /products/{id}"
 * into a normalized key "GET /wp-json/wc/v3/products/{id}"
 */
function normalizeEndpoint(ep) {
  const trimmed = ep.trim();
  // If it already has the full path prefix, keep as-is
  if (trimmed.includes('/wp-json/wc/v3/')) return trimmed;
  // Otherwise prepend the namespace
  const [method, ...pathParts] = trimmed.split(/\s+/);
  const p = pathParts.join('');
  return `${method} /wp-json/wc/v3${p.startsWith('/') ? '' : '/'}${p}`;
}

/**
 * Parse the endpoint registry table from docs/rest-api-index.md.
 * Returns a Set of "METHOD /wp-json/wc/v3/path" strings.
 */
function parseIndex(indexPath) {
  const raw = readFileSync(indexPath, 'utf8');
  const registered = new Set();

  for (const line of raw.split('\n')) {
    // Table rows look like: | /wp-json/wc/v3/products | GET | ... |
    const match = line.match(/^\|\s*(\/wp-json\/wc\/v3\/[^\s|]+)\s*\|\s*([A-Z]+)\s*\|/);
    if (match) {
      const [, endpoint, method] = match;
      registered.add(`${method} ${endpoint}`);
    }
  }

  return registered;
}

async function main() {
  const indexPath = path.join(ROOT, 'docs', 'rest-api-index.md');
  const registeredEndpoints = parseIndex(indexPath);

  const skillFiles = await glob('skills/**/**/SKILL.md', { cwd: ROOT });

  const usedEndpoints = new Set();
  const skillsByEndpoint = {};

  for (const relPath of skillFiles.sort()) {
    const filePath = path.join(ROOT, relPath);
    const raw = readFileSync(filePath, 'utf8');
    const { data: fm } = matter(raw);

    if (!Array.isArray(fm.rest_endpoints)) continue;

    for (const ep of fm.rest_endpoints) {
      const normalized = normalizeEndpoint(ep);
      usedEndpoints.add(normalized);
      if (!skillsByEndpoint[normalized]) skillsByEndpoint[normalized] = [];
      skillsByEndpoint[normalized].push(relPath);
    }
  }

  let errors = 0;

  // Missing: used in skills but not in index
  const missing = [...usedEndpoints].filter((ep) => !registeredEndpoints.has(ep));
  if (missing.length > 0) {
    console.error('\n❌ Endpoints used in skills but NOT in docs/rest-api-index.md:');
    for (const ep of missing.sort()) {
      console.error(`   ${ep}`);
      console.error(`     Used by: ${skillsByEndpoint[ep].join(', ')}`);
    }
    errors += missing.length;
  }

  // Orphan: in index but no skill uses them
  const orphan = [...registeredEndpoints].filter((ep) => !usedEndpoints.has(ep));
  if (orphan.length > 0) {
    console.warn('\n⚠️  Endpoints in docs/rest-api-index.md but used in NO skill (orphans):');
    for (const ep of orphan.sort()) {
      console.warn(`   ${ep}`);
    }
  }

  if (errors === 0 && orphan.length === 0) {
    console.log(`✅ API index is consistent — ${usedEndpoints.size} endpoints verified`);
  } else if (errors === 0) {
    console.log(`✅ No missing endpoints. ${orphan.length} orphan(s) in index (non-fatal).`);
  } else {
    console.error(`\n${errors} missing endpoint(s). Add them to docs/rest-api-index.md.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
