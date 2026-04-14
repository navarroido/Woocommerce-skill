#!/usr/bin/env node
/**
 * build-manifest.mjs
 * Generates skills.json — the root-level manifest consumed by the installer
 * (bin/install.mjs) and by the `npx skills add` CLI.
 *
 * Run:  node scripts/build-manifest.mjs
 * Output: skills.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import matter from 'gray-matter';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const skillFiles = (await glob('skills/**/**/SKILL.md', { cwd: ROOT })).sort();

  const skills = skillFiles.map((relPath) => {
    const filePath = path.join(ROOT, relPath);
    const raw = readFileSync(filePath, 'utf8');
    const { data: fm } = matter(raw);

    const endpoints = fm.rest_endpoints || [];
    const isMutating = endpoints.some((e) =>
      /^(POST|PUT|PATCH|DELETE)\s/i.test(e)
    );

    return {
      name: fm.name,
      role: fm.role,
      description: fm.description,
      api_version: fm.api_version || 'wc/v3',
      rest_endpoints: endpoints,
      status: fm.status,
      compatibility: fm.compatibility,
      mutating: isMutating,
      path: relPath,
    };
  });

  const manifest = {
    schema_version: '1.0',
    name: 'woocommerce-ai-skills',
    repository: 'navarroido/Woocommerce-skill',
    install_command: 'npx skills add navarroido/Woocommerce-skill',
    api: 'WooCommerce REST API v3',
    base_url_pattern: '/wp-json/wc/v3/',
    total: skills.length,
    generated_at: new Date().toISOString(),
    skills,
  };

  const outPath = path.join(ROOT, 'skills.json');
  writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`✅ skills.json written — ${skills.length} skills`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
