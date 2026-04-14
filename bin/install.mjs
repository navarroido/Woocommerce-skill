#!/usr/bin/env node
/**
 * bin/install.mjs
 *
 * Standalone installer for WooCommerce AI Skills.
 * Copies skill files to the correct locations for each supported agent platform.
 *
 * Usage:
 *   npx github:navarroido/Woocommerce-skill/bin/install.mjs
 *   node bin/install.mjs [--platform <platform>] [--target <dir>]
 *
 * Platforms: claude | cursor | cline | copilot | gemini | all (default: all)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_ROOT = path.resolve(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
const platformArg = args[args.indexOf('--platform') + 1] || 'all';
const targetArg = args[args.indexOf('--target') + 1] || process.cwd();

const PLATFORMS = {
  claude: {
    name: 'Claude Code',
    description: 'Installs via .claude-plugin/plugin.json',
    install: installClaude,
  },
  cursor: {
    name: 'Cursor',
    description: 'Copies skills as .mdc rules to .cursor/rules/',
    install: installCursor,
  },
  cline: {
    name: 'Cline',
    description: 'Appends skill summaries to .clinerules',
    install: installCline,
  },
  copilot: {
    name: 'GitHub Copilot',
    description: 'Appends skill index to .github/copilot-instructions.md',
    install: installCopilot,
  },
  gemini: {
    name: 'Gemini CLI',
    description: 'Writes skill catalog to GEMINI.md',
    install: installGemini,
  },
};

function log(msg) {
  process.stdout.write(msg + '\n');
}

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function loadSkills() {
  const manifestPath = path.join(SKILLS_ROOT, 'skills.json');
  if (existsSync(manifestPath)) {
    return JSON.parse(readFileSync(manifestPath, 'utf8')).skills;
  }
  // Fallback: discover from file system
  const files = await glob('skills/**/**/SKILL.md', { cwd: SKILLS_ROOT });
  return files.map((f) => ({ name: path.basename(path.dirname(f)), path: f }));
}

function buildSkillIndex(skills) {
  const byRole = {};
  for (const skill of skills) {
    if (!byRole[skill.role]) byRole[skill.role] = [];
    byRole[skill.role].push(skill);
  }
  let out = '## WooCommerce AI Skills\n\n';
  out += `${skills.length} skills across ${Object.keys(byRole).length} categories.\n\n`;
  for (const [role, roleSkills] of Object.entries(byRole)) {
    out += `### ${role}\n`;
    for (const s of roleSkills) {
      out += `- **${s.name}** — ${s.description}\n`;
    }
    out += '\n';
  }
  return out;
}

async function installClaude(target, skills) {
  const pluginSrc = path.join(SKILLS_ROOT, '.claude-plugin', 'plugin.json');
  const pluginDest = path.join(target, '.claude-plugin');
  ensureDir(pluginDest);
  copyFileSync(pluginSrc, path.join(pluginDest, 'plugin.json'));

  // Copy skill files
  for (const skill of skills) {
    const src = path.join(SKILLS_ROOT, skill.path);
    const dest = path.join(target, skill.path);
    ensureDir(path.dirname(dest));
    copyFileSync(src, dest);
  }
  log(`  ✅ Claude Code: copied plugin.json + ${skills.length} skill files`);
  log(`     Run: /plugin install . (from ${target})`);
}

async function installCursor(target, skills) {
  const rulesDir = path.join(target, '.cursor', 'rules');
  ensureDir(rulesDir);

  for (const skill of skills) {
    const src = path.join(SKILLS_ROOT, skill.path);
    const content = readFileSync(src, 'utf8');
    const dest = path.join(rulesDir, `${skill.name}.mdc`);
    writeFileSync(dest, `---\ndescription: ${skill.description}\n---\n\n${content}`);
  }
  log(`  ✅ Cursor: wrote ${skills.length} .mdc files to .cursor/rules/`);
}

async function installCline(target, skills) {
  const clinerules = path.join(target, '.clinerules');
  const index = buildSkillIndex(skills);
  const header = `\n\n<!-- WooCommerce AI Skills (auto-installed) -->\n`;
  const existing = existsSync(clinerules) ? readFileSync(clinerules, 'utf8') : '';
  writeFileSync(clinerules, existing + header + index);
  log(`  ✅ Cline: appended skill index to .clinerules`);
}

async function installCopilot(target, skills) {
  const dir = path.join(target, '.github');
  ensureDir(dir);
  const dest = path.join(dir, 'copilot-instructions.md');
  const index = buildSkillIndex(skills);
  const header = `\n\n<!-- WooCommerce AI Skills (auto-installed) -->\n`;
  const existing = existsSync(dest) ? readFileSync(dest, 'utf8') : '';
  writeFileSync(dest, existing + header + index);
  log(`  ✅ Copilot: appended skill index to .github/copilot-instructions.md`);
}

async function installGemini(target, skills) {
  const dest = path.join(target, 'GEMINI.md');
  const index = buildSkillIndex(skills);
  const header = `# WooCommerce AI Skills\n\nInstalled via navarroido/Woocommerce-skill\n\n`;
  const existing = existsSync(dest) ? readFileSync(dest, 'utf8') : '';
  writeFileSync(dest, existing ? existing + '\n\n' + index : header + index);
  log(`  ✅ Gemini CLI: wrote skill catalog to GEMINI.md`);
}

async function main() {
  log('');
  log('╔══════════════════════════════════════════╗');
  log('║   WooCommerce AI Skills — Installer      ║');
  log('║   navarroido/Woocommerce-skill           ║');
  log('╚══════════════════════════════════════════╝');
  log('');
  log(`Target directory : ${targetArg}`);
  log(`Platform(s)      : ${platformArg}`);
  log('');

  const skills = await loadSkills();
  log(`Found ${skills.length} skills.\n`);

  const toInstall =
    platformArg === 'all'
      ? Object.entries(PLATFORMS)
      : Object.entries(PLATFORMS).filter(([k]) => k === platformArg);

  if (toInstall.length === 0) {
    log(`Unknown platform: "${platformArg}". Valid options: ${Object.keys(PLATFORMS).join(', ')}, all`);
    process.exit(1);
  }

  for (const [, platform] of toInstall) {
    log(`Installing for ${platform.name}...`);
    await platform.install(targetArg, skills);
  }

  log('');
  log('Installation complete.');
  log('');
  log('Next steps:');
  log('  1. Set environment variables in your agent session:');
  log('       WC_STORE_URL=https://mystore.com');
  log('       WC_CONSUMER_KEY=ck_...');
  log('       WC_CONSUMER_SECRET=cs_...');
  log('  2. Generate API keys at: WooCommerce → Settings → Advanced → REST API');
  log('  3. Ask your agent: "Show me the top 20 products by revenue this month"');
  log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
