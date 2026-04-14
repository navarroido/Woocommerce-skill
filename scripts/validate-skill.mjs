#!/usr/bin/env node
/**
 * validate-skill.mjs
 * Validates all skills/\/**\/**\/SKILL.md files for:
 * - Required YAML frontmatter fields
 * - Valid field values (role, status)
 * - All 12 required section headers present in order
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';
import matter from 'gray-matter';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const VALID_ROLES = [
  'merchandising',
  'order-management',
  'customer-ops',
  'customer-support',
  'marketing',
  'finance',
  'store-management',
  'analytics',
];

const VALID_STATUSES = ['stable', 'beta', 'experimental'];

const REQUIRED_FRONTMATTER = [
  'name',
  'role',
  'description',
  'toolkit',
  'api_version',
  'rest_endpoints',
  'status',
  'compatibility',
];

const REQUIRED_SECTIONS = [
  '## Purpose',
  '## Prerequisites',
  '## Parameters',
  '## Authentication',
  '## Safety',
  '## Workflow Steps',
  '## API Endpoints Used',
  '## Pagination Strategy',
  '## Session Tracking',
  '## Output Format',
  '## Error Handling',
  '## Best Practices',
];

async function main() {
  const skillFiles = await glob('skills/**/**/SKILL.md', { cwd: ROOT });

  if (skillFiles.length === 0) {
    console.log('No skill files found.');
    process.exit(0);
  }

  let errors = 0;

  for (const relPath of skillFiles.sort()) {
    const filePath = path.join(ROOT, relPath);
    const raw = readFileSync(filePath, 'utf8');
    const { data: fm, content } = matter(raw);
    const fileErrors = [];

    // Check required frontmatter fields
    for (const field of REQUIRED_FRONTMATTER) {
      if (!fm[field]) {
        fileErrors.push(`Missing frontmatter field: "${field}"`);
      }
    }

    // Validate role
    if (fm.role && !VALID_ROLES.includes(fm.role)) {
      fileErrors.push(`Invalid role "${fm.role}". Must be one of: ${VALID_ROLES.join(', ')}`);
    }

    // Validate status
    if (fm.status && !VALID_STATUSES.includes(fm.status)) {
      fileErrors.push(`Invalid status "${fm.status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
    }

    // Validate name prefix
    if (fm.name && !fm.name.startsWith('woo-')) {
      fileErrors.push(`Skill name "${fm.name}" must start with "woo-"`);
    }

    // Validate rest_endpoints is a non-empty array
    if (fm.rest_endpoints !== undefined) {
      if (!Array.isArray(fm.rest_endpoints) || fm.rest_endpoints.length === 0) {
        fileErrors.push('rest_endpoints must be a non-empty array');
      }
    }

    // Check required section headers
    for (const section of REQUIRED_SECTIONS) {
      if (!content.includes(section)) {
        fileErrors.push(`Missing required section: "${section}"`);
      }
    }

    // Report
    if (fileErrors.length > 0) {
      console.error(`\n❌ ${relPath}`);
      for (const err of fileErrors) {
        console.error(`   • ${err}`);
      }
      errors += fileErrors.length;
    } else {
      console.log(`✅ ${relPath}`);
    }
  }

  console.log(`\n${skillFiles.length} skills checked.`);

  if (errors > 0) {
    console.error(`\n${errors} error(s) found. Fix above issues before committing.`);
    process.exit(1);
  } else {
    console.log('All skills are valid.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
