# Contributing Guide

## Environment Setup

Requirements:
- Node.js 18.0.0+
- pnpm 9.15.0+
- A WooCommerce store (local or staging) for testing

```bash
git clone https://github.com/navarroido/Woocommerce-skill.git
cd Woocommerce-skill
pnpm install
```

---

## Scaffolding a New Skill

```bash
pnpm scaffold
```

The scaffold script will prompt you for:
1. **Category** — choose from the 8 categories
2. **Skill slug** — kebab-case, no `woo-` prefix (it's added automatically)
3. **Description** — one sentence describing what the skill does
4. **Mutation?** — yes/no (affects the Safety section wording)

This creates: `skills/<category>/woo-<slug>/SKILL.md`

---

## Completing the Skill

Fill in every section. Refer to [SKILL-FORMAT.md](./SKILL-FORMAT.md) for the complete field reference and annotated example.

Key things to get right:
- **`rest_endpoints` frontmatter** — list every endpoint the skill calls
- **`## Workflow Steps`** — be specific: exact endpoint, exact query params, exact fields extracted
- **`## Pagination Strategy`** — copy the standard block verbatim
- **`## Session Tracking`** — copy the standard block verbatim
- **`dry_run` implementation** — mutating skills must compute the plan without executing when `dry_run: true`

---

## Updating `docs/rest-api-index.md`

Every REST endpoint referenced in your skill's `rest_endpoints` frontmatter must be registered in `docs/rest-api-index.md`. Add a row to the table:

```markdown
| /wp-json/wc/v3/products/{id} | PUT | Read/Write | woo-bulk-price-adjustment, woo-your-new-skill |
```

---

## Running Validation

Both must pass before opening a PR:

```bash
pnpm validate   # checks frontmatter schema and 12 required section headers
pnpm lint       # markdownlint on all skill files
```

---

## Smoke Testing

Test your skill against a real WooCommerce dev store:

1. Set env vars: `WC_STORE_URL`, `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`
2. Run the skill in your agent with `dry_run: true` first
3. Verify the preview output is accurate
4. Run live and verify the changes in WooCommerce admin

Use WooCommerce's built-in test data (WooCommerce → Status → Tools → Create test data) for a safe sandbox.

---

## Branch Naming

```
skill/<category>/<slug>
```

Examples:
- `skill/merchandising/woo-inventory-adjustment`
- `skill/finance/woo-refund-rate-analysis`
- `skill/analytics/woo-repeat-purchase-rate`

---

## Pull Request Checklist

- [ ] `pnpm validate` passes
- [ ] `pnpm lint` passes
- [ ] All 12 required section headers present
- [ ] `rest_endpoints` frontmatter matches what the skill actually calls
- [ ] New endpoints added to `docs/rest-api-index.md`
- [ ] `dry_run: true` tested on a WooCommerce dev store
- [ ] `dry_run: false` tested and verified
- [ ] No credentials or store URLs hardcoded in the skill file
- [ ] PR description includes which WooCommerce version tested against

---

## Maintainer Review

Maintainers will check:
1. API correctness (do the endpoints and params actually work?)
2. Safety (does dry_run actually prevent mutations?)
3. Completeness (all 12 sections, all standard boilerplate blocks)
4. Clarity (can a non-expert follow the Workflow Steps?)

Reviews typically take 2–5 business days.
