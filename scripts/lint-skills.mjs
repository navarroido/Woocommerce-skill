#!/usr/bin/env node
/**
 * lint-skills.mjs
 * Runs markdownlint on all SKILL.md files and reports issues.
 * Uses .markdownlint.json config from repo root.
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Use markdownlint if available, otherwise skip gracefully
const require = createRequire(import.meta.url);

async function runMarkdownlint(files) {
  let markdownlint;
  try {
    markdownlint = require('markdownlint');
  } catch {
    console.warn('markdownlint not installed — skipping lint. Run: pnpm install');
    return 0;
  }

  const configPath = path.join(ROOT, '.markdownlint.json');
  let config = {};
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    // Use defaults if config file not found
  }

  const options = {
    files,
    config,
  };

  return new Promise((resolve) => {
    markdownlint(options, (err, result) => {
      if (err) {
        console.error('markdownlint error:', err);
        resolve(1);
        return;
      }

      let errorCount = 0;
      for (const [file, issues] of Object.entries(result)) {
        if (issues.length === 0) continue;
        const relFile = path.relative(ROOT, file);
        console.error(`\n❌ ${relFile}`);
        for (const issue of issues) {
          console.error(`   Line ${issue.lineNumber}: [${issue.ruleNames.join('/')}] ${issue.ruleDescription}`);
          if (issue.errorDetail) {
            console.error(`     Detail: ${issue.errorDetail}`);
          }
          errorCount++;
        }
      }

      if (errorCount === 0) {
        console.log(`All ${files.length} skill files passed markdownlint.`);
      } else {
        console.error(`\n${errorCount} lint issue(s) found.`);
      }

      resolve(errorCount > 0 ? 1 : 0);
    });
  });
}

async function checkSpelling(files) {
  // Basic custom checks beyond markdownlint
  const issues = [];

  for (const file of files) {
    const raw = readFileSync(file, 'utf8');
    const relFile = path.relative(ROOT, file);

    // Check for common copy-paste errors
    if (raw.includes('shopify') || raw.includes('Shopify')) {
      issues.push(`${relFile}: Contains "Shopify" — verify this is intentional`);
    }

    // Check CSV filename pattern matches skill name
    const nameMatch = raw.match(/^name:\s*(woo-[\w-]+)/m);
    const csvMatch = raw.match(/CSV filename:\s*`(woo-[\w-]+)_/);
    if (nameMatch && csvMatch && nameMatch[1] !== csvMatch[1]) {
      issues.push(`${relFile}: CSV filename prefix "${csvMatch[1]}" does not match skill name "${nameMatch[1]}"`);
    }

    // Check startup banner contains the skill name
    const bannerMatch = raw.match(/║\s+SKILL:\s+([\w-]+)\s+║/);
    if (nameMatch && bannerMatch && bannerMatch[1] !== nameMatch[1]) {
      issues.push(`${relFile}: Session Tracking banner skill name "${bannerMatch[1]}" does not match frontmatter name "${nameMatch[1]}"`);
    }
  }

  if (issues.length > 0) {
    console.warn('\nCustom checks found warnings:');
    for (const issue of issues) {
      console.warn(`  ⚠  ${issue}`);
    }
  }

  return issues.length;
}

async function main() {
  const relPaths = await glob('skills/**/**/SKILL.md', { cwd: ROOT });

  if (relPaths.length === 0) {
    console.log('No skill files found.');
    process.exit(0);
  }

  const absPaths = relPaths.map((p) => path.join(ROOT, p));

  console.log(`Linting ${absPaths.length} skill files...\n`);

  const [lintExit, warnCount] = await Promise.all([
    runMarkdownlint(absPaths),
    checkSpelling(absPaths),
  ]);

  if (warnCount > 0) {
    console.log(`\n${warnCount} custom check warning(s). Review above.`);
  }

  process.exit(lintExit);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
