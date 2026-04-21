# WooCommerce AI Skills

> Community-maintained AI agent skills for operating WooCommerce stores — products, orders, customers, coupons, finance, and more.

[![npm version](https://img.shields.io/npm/v/woocommerce-ai-skills?color=7f54b3&label=npm)](https://www.npmjs.com/package/woocommerce-ai-skills)
[![npm downloads](https://img.shields.io/npm/dm/woocommerce-ai-skills?color=7f54b3)](https://www.npmjs.com/package/woocommerce-ai-skills)
[![Skills](https://img.shields.io/badge/skills-56-7f54b3)](https://agenticwoo.dev/catalog)
[![License](https://img.shields.io/github/license/navarroido/Woocommerce-skill)](./LICENSE)
[![Validate](https://img.shields.io/github/actions/workflow/status/navarroido/Woocommerce-skill/validate.yml?label=validate)](https://github.com/navarroido/Woocommerce-skill/actions/workflows/validate.yml)
[![Website](https://img.shields.io/badge/website-agenticwoo.dev-blue)](https://agenticwoo.dev)
[![skills.sh](https://img.shields.io/badge/skills.sh-listed-brightgreen)](https://agentskill.sh/navarroido/Woocommerce-skill)

**Website:** [agenticwoo.dev](https://agenticwoo.dev) · **npm:** [woocommerce-ai-skills](https://www.npmjs.com/package/woocommerce-ai-skills) · **skills.sh:** [navarroido/Woocommerce-skill](https://agentskill.sh/navarroido/Woocommerce-skill)

---

## What Is This?

WooCommerce AI Skills is a collection of markdown-based workflow files that teach any AI agent (Claude, Cursor, Cline, Copilot, Gemini CLI, Codex) how to operate a WooCommerce store via the REST API.

Each skill is a single markdown file with YAML frontmatter that describes:
- What the skill does
- Which WooCommerce REST endpoints it uses
- Step-by-step instructions for the agent
- Dry-run preview before any mutations
- Authentication requirements

---

## Install

### For Claude Code
```
/plugin install navarroido/Woocommerce-skill
```

### For GitHub Copilot (via gh CLI)
```bash
gh skill install navarroido/Woocommerce-skill
```

### For all other agents (Cursor, Cline, Gemini CLI, Codex)
```bash
npx skills add navarroido/Woocommerce-skill
```

Full documentation at **[agenticwoo.dev](https://agenticwoo.dev)**

---

## Quick Start

After installing, connect to your store:

```
store_url: https://mystore.com
consumer_key: ck_xxxxxxxxxxxxxxxxxxxx
consumer_secret: cs_xxxxxxxxxxxxxxxxxxxx
```

Generate API keys at: **WooCommerce → Settings → Advanced → REST API → Add Key**

Then ask your agent:
- "Adjust all products in the Accessories category down 10%"
- "Show me all orders stuck in processing for more than 3 days"
- "Find customers who haven't ordered in 90 days for a win-back campaign"
- "Generate 50 unique coupon codes for 15% off, expires end of month"
- "Audit all products missing SEO descriptions"

---

## Skill Categories

| Category | Skills | Description |
|----------|--------|-------------|
| [merchandising](./skills/merchandising/) | 15 | Products, pricing, inventory, SEO, images |
| [order-management](./skills/order-management/) | 8 | Orders, fulfillment, tracking, cancellations |
| [customer-ops](./skills/customer-ops/) | 6 | Segmentation, LTV tiers, B2B, duplicates |
| [customer-support](./skills/customer-support/) | 5 | Refunds, returns, WISMO, address corrections |
| [marketing](./skills/marketing/) | 5 | Coupons, abandoned cart, win-back, loyalty |
| [finance](./skills/finance/) | 7 | Revenue, tax, AOV, refund rate, shipping cost |
| [store-management](./skills/store-management/) | 5 | Shipping zones, tax rates, gateways, webhooks |
| [analytics](./skills/analytics/) | 5 | Top products, repeat purchase, cross-sell |

**Total: 56 skills**

See [CATALOG.md](./CATALOG.md) for the full skill list with descriptions.

---

## How Skills Work

Each skill follows a 4-phase execution model:

1. **Query** — Fetch data from WooCommerce REST API (`/wp-json/wc/v3/`)
2. **Preview** — Compute planned changes, output preview (dry_run mode)
3. **Confirm** — Agent requests user approval before any mutations
4. **Report** — Document exactly what changed, export CSV if applicable

**All mutating skills default to dry_run: true on first run.**

---

## Authentication

WooCommerce uses Consumer Key / Consumer Secret authentication.

Set these environment variables for your agent session:
```bash
WC_STORE_URL=https://mystore.com
WC_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxx
WC_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxx
```

See [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md) for full setup instructions.

---

## Platform Compatibility

| Platform | Install Method | Context File |
|----------|---------------|--------------|
| Claude Code | `/plugin install navarroido/Woocommerce-skill` | Plugin manifest |
| GitHub Copilot | `gh skill install navarroido/Woocommerce-skill` | Copilot context |
| Cursor | `npx skills add navarroido/Woocommerce-skill` | `.cursor/rules/*.mdc` |
| Cline | `npx skills add navarroido/Woocommerce-skill` | `.clinerules` |
| Gemini CLI | `npx skills add navarroido/Woocommerce-skill` | `GEMINI.md` |
| Codex | `npx skills add navarroido/Woocommerce-skill` | Context injection |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md).

To scaffold a new skill:
```bash
pnpm scaffold
```

---

## Project Status

- [x] Architecture and skill format defined
- [x] Full 56-skill catalog (all categories complete)
- [x] Automated catalog generation (`pnpm build:catalog`)
- [x] skills.json manifest for NPX distribution (`pnpm build:manifest`)
- [x] CI validation pipeline (GitHub Actions: validate + lint on every PR)
- [x] NPX installer (`bin/install.mjs` — supports Claude, Cursor, Cline, Copilot, Gemini)
- [x] Documentation website at [agenticwoo.dev](https://agenticwoo.dev)
- [x] Published to npm as [woocommerce-ai-skills](https://www.npmjs.com/package/woocommerce-ai-skills)
- [x] Published to GitHub Copilot skills system (`gh skill install navarroido/Woocommerce-skill`)
- [x] Listed on [skills.sh](https://agentskill.sh/navarroido/Woocommerce-skill)

See [PLAN.md](./PLAN.md) for the full roadmap.

---

## License

MIT — see [LICENSE](./LICENSE)
