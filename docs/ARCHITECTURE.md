# Architecture

## Design Principles

1. **REST-first** — Every skill uses the WooCommerce REST API (`/wp-json/wc/v3/`). No direct database access, no WP-CLI, no custom plugins required.
2. **Platform-agnostic** — Skills are plain markdown files. They work in Claude, Cursor, Cline, Copilot, Gemini CLI, Codex, or any LLM with file context.
3. **Dry-run mandatory** — Every mutating skill must implement `dry_run: true` mode that previews changes without executing them.
4. **Confirmation before mutation** — Agents must present a preview and receive explicit user confirmation before any PUT, POST, or DELETE call.
5. **Credential safety** — Skills never log, display, or store Consumer Key / Consumer Secret values.
6. **Standard pagination** — All skills use the same `per_page=100 + page loop` pattern with `X-WP-TotalPages` header.

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    LLM Platform                          │
│   (Claude Code / Cursor / Cline / Copilot / Gemini)     │
└─────────────────────┬───────────────────────────────────┘
                      │ reads skills via plugin/context injection
┌─────────────────────▼───────────────────────────────────┐
│              WooCommerce AI Skills                        │
│                                                          │
│   CLAUDE.md ──► dispatcher / master prompt               │
│   skills/<category>/woo-<slug>/SKILL.md                 │
│       ├── YAML frontmatter (metadata)                    │
│       └── Markdown body (workflow instructions)          │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API calls
┌─────────────────────▼───────────────────────────────────┐
│         WooCommerce Store (self-hosted WordPress)         │
│   /wp-json/wc/v3/products                                │
│   /wp-json/wc/v3/orders                                  │
│   /wp-json/wc/v3/customers                               │
│   /wp-json/wc/v3/coupons                                 │
│   /wp-json/wc/v3/reports/...                             │
│   ... (see docs/rest-api-index.md for full list)         │
└──────────────────────────────────────────────────────────┘
```

---

## Directory Structure Rationale

### `skills/<category>/woo-<slug>/SKILL.md`

Each skill is its own directory containing one file. This allows:
- Future addition of skill-level assets (examples, test fixtures)
- Clean git blame and diff per skill
- Easy glob patterns for tooling (`skills/**/**/SKILL.md`)

The `woo-` prefix on all skill slugs distinguishes them from potential future WordPress-specific skills and makes skill names self-identifying in context files.

### `docs/`

Human-readable documentation for contributors and users. The `rest-api-index.md` serves double duty: human reference and machine-validated registry (via `scripts/validate-api-index.mjs`).

### `scripts/`

Node.js ES module scripts (`.mjs`) for CI and development tooling. No build step required — Node 18+ runs them directly.

### `.claude-plugin/plugin.json`

The Claude Code plugin manifest. When a user runs `/plugin install navarroido/Woocommerce-skill`, Claude Code reads this file to discover skill directories.

### `CLAUDE.md`

The master dispatcher prompt loaded by Claude Code when the plugin is active. Defines the operational protocol, credential setup, dry-run requirements, and example invocations.

---

## Skill Lifecycle

```
pnpm scaffold
    │
    ▼
skills/<category>/woo-<slug>/SKILL.md  (generated from template)
    │
    ▼
Author fills in:
  - YAML frontmatter (role, description, rest_endpoints, etc.)
  - All 12 required section headers
  - Workflow steps with exact endpoint + param details
  - Error handling table
    │
    ▼
Update docs/rest-api-index.md  (add any new endpoints used)
    │
    ▼
pnpm validate  (frontmatter schema + section headers check)
pnpm lint      (markdownlint)
    │
    ▼
Test against WooCommerce dev store
    │
    ▼
PR → Review → Merge
    │
    ▼
pnpm build:catalog  (regenerates CATALOG.md)
```

---

## Script Architecture

| Script | Purpose |
|--------|---------|
| `scripts/validate-skill.mjs` | Reads all `skills/**/**/SKILL.md`. Parses YAML frontmatter with `gray-matter`. Asserts required fields and 12 required section headers. Exits non-zero on failure. |
| `scripts/lint-skills.mjs` | Runs `markdownlint` against all skill files using `.markdownlint.json` config. |
| `scripts/build-catalog.mjs` | Reads all skills via `glob` + `gray-matter`. Groups by `role`. Writes `CATALOG.md` with tables per category including mutation flag. |
| `scripts/validate-api-index.mjs` | Cross-checks endpoints in skill frontmatter against `docs/rest-api-index.md`. Reports missing registrations and orphan entries. |
| `scripts/scaffold.sh` | Interactive shell script. Prompts for category, slug, description, and mutation flag. Creates the skill directory and pre-filled `SKILL.md`. |

---

## Design Principles vs. Other AI Skill Systems

WooCommerce AI Skills follows the same structural pattern adopted by other AI skill collections for e-commerce platforms, adapted for WooCommerce's REST API and WordPress hosting model.

| Aspect | Generic AI Skills Pattern | WooCommerce AI Skills |
|--------|--------------------------|----------------------|
| API type | Varies (GraphQL or REST) | REST (`/wp-json/wc/v3/`) |
| Endpoint registry | Operations index file | `docs/rest-api-index.md` |
| Auth mechanism | Platform CLI or token | Consumer Key + Secret (env vars) |
| Pagination | Cursor-based or offset | `per_page=100` + `page` loop |
| Dry-run | `dry_run: true` parameter | Same |
| Session tracking | Mandatory ASCII banners | Same |
| Distribution | `npx skills add <repo>` | `npx skills add navarroido/Woocommerce-skill` |
| Claude Code | Plugin manifest | Same structure |
| Skill count | Varies | 56 skills / 8 categories |

The frontmatter field naming, Session Tracking section content, and distribution mechanics are consistent with the broader `npx skills add` ecosystem, making it straightforward for contributors to author WooCommerce skills.
