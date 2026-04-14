# Skill File Format Reference

Every skill lives at `skills/<category>/woo-<slug>/SKILL.md`. This document defines the complete format.

---

## YAML Frontmatter

The frontmatter block opens and closes the file:

```yaml
---
name: woo-<slug>
role: <category>
description: "<one sentence — prefix 'Read-only:' for non-mutating skills>"
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - PUT /products/{id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---
```

### Field Reference

| Field | Type | Required | Allowed Values |
|-------|------|----------|----------------|
| `name` | string | yes | `woo-<kebab-case-slug>` |
| `role` | string | yes | `merchandising`, `order-management`, `customer-ops`, `customer-support`, `marketing`, `finance`, `store-management`, `analytics` |
| `description` | string | yes | One sentence. Prefix with `Read-only:` for non-mutating skills. |
| `toolkit` | string | yes | Always: `woocommerce-rest-api, woocommerce-rest-execution` |
| `api_version` | string | yes | Always: `"wc/v3"` |
| `rest_endpoints` | array | yes | List of `METHOD /path` strings. All must be registered in `docs/rest-api-index.md`. |
| `status` | string | yes | `stable`, `beta`, `experimental` |
| `compatibility` | string | yes | Always: `Claude Code, Cursor, Cline, Codex, Gemini CLI` |

---

## Required Section Headers

The markdown body must contain all 12 section headers in this exact order:

```
## Purpose
## Prerequisites
## Parameters
## Authentication
## Safety
## Workflow Steps
## API Endpoints Used
## Pagination Strategy
## Session Tracking
## Output Format
## Error Handling
## Best Practices
```

The `scripts/validate-skill.mjs` script enforces this. PRs will fail CI if any section is missing.

---

## Section Content Reference

### `## Purpose`

One paragraph stating the business problem this skill solves and whether it is read-only or mutating.

Example:
> Identify all WooCommerce products with stock_quantity below a configurable threshold and export a reorder sheet grouped by supplier. Read-only — no product data is modified.

### `## Prerequisites`

Bulleted list of requirements:

```markdown
- WooCommerce store with REST API enabled (WooCommerce → Settings → Advanced → REST API)
- Consumer Key and Consumer Secret with **Read** scope (or **Read/Write** for mutating skills)
- Store accessible over HTTPS
- Minimum WooCommerce version: 3.5.0
```

### `## Parameters`

Table format. Start with the four standard parameters, then add skill-specific ones:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store (e.g., `https://mystore.com`) |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | Preview changes without executing mutations |
| `format` | string | no | `human` | Output format: `human` or `json` |

### `## Authentication`

Copy this standard block verbatim, then add any skill-specific notes:

```markdown
WooCommerce uses OAuth 1.0a for HTTP and Basic Auth over HTTPS.

For HTTPS stores (recommended):
  Authorization: Basic base64(consumer_key:consumer_secret)

For HTTP stores (development only):
  Use OAuth 1.0a — include oauth_consumer_key, oauth_nonce, oauth_signature,
  oauth_signature_method=HMAC-SHA1, oauth_timestamp, oauth_version=1.0

Never log or output consumer_key or consumer_secret values.

See docs/AUTHENTICATION.md for full setup instructions.
```

### `## Safety`

For mutating skills:
> **Steps N–M execute irreversible mutations.** Always run with `dry_run: true` first and verify the preview before executing live.

For read-only skills:
> Read-only skill — no mutations are executed. Safe to run at any time.

### `## Workflow Steps`

Numbered steps. Each step specifies:

```markdown
**Step 1 — Fetch products**
GET /wp-json/wc/v3/products
  ?status=publish&per_page=100&page=1
Extract: id, name, sku, regular_price, stock_quantity
Continue paginating until response length < per_page.
```

### `## API Endpoints Used`

List format, one endpoint per line:

```markdown
GET  /wp-json/wc/v3/products               — fetch product list with filters
PUT  /wp-json/wc/v3/products/{id}          — update regular_price and sale_price
GET  /wp-json/wc/v3/products/{id}/variations — fetch variants for variable products
POST /wp-json/wc/v3/products/batch         — bulk update multiple products
```

### `## Pagination Strategy`

Copy this standard block verbatim for every skill:

```markdown
WooCommerce REST API uses page/per_page pagination (not cursor-based).

Standard pattern:
  page = 1
  while True:
    response = GET /endpoint?per_page=100&page=page
    process(response)
    if len(response) < 100: break
    page += 1

Maximum per_page is 100 for most endpoints.
The X-WP-Total and X-WP-TotalPages response headers report totals.
Always read X-WP-TotalPages on the first request to estimate job size.
```

### `## Session Tracking`

Copy this block verbatim (replace `<skill-name>` with the skill's name):

```markdown
Claude MUST emit the following output at each stage. This is mandatory.

STARTUP:
╔══════════════════════════════════════════╗
║  SKILL: <skill-name>                     ║
║  STORE: <store_url>                      ║
║  TIME:  <ISO-8601 UTC>                   ║
║  MODE:  <DRY RUN | LIVE>                 ║
╚══════════════════════════════════════════╝

PER-OPERATION (emit after each API call batch):
[N/TOTAL] <METHOD> <endpoint> → <result_count> records | params: <key>=<val>

COMPLETION (human format):
╔══════════════════════════════════════════╗
║  COMPLETE: <skill-name>                  ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename or "stdout">          ║
╚══════════════════════════════════════════╝

COMPLETION (json format):
{
  "skill": "<name>",
  "store": "<url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path or null>",
  "dry_run": <bool>
}
```

### `## Output Format`

For human format: describe the ASCII table or bordered summary.

For data-export skills: specify the CSV filename pattern and columns:

```markdown
CSV filename: woo-<slug>_<YYYY-MM-DD>.csv
Columns: product_id, sku, name, category, current_price, new_price, change_pct
```

### `## Error Handling`

Standard table (add skill-specific rows after):

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid or missing credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Consumer Key lacks required scope | Regenerate key with Read/Write scope |
| `404 Not Found` | Resource ID does not exist | Check the ID; resource may have been deleted |
| `429 Too Many Requests` | Rate limit hit during pagination | Wait 2 seconds and retry; reduce per_page to 50 |
| `woocommerce_rest_*` error in body | WooCommerce validation failure | See `message` field in response JSON |

### `## Best Practices`

Three to five bullets. Always include the dry_run bullet for mutating skills:

```markdown
- Run with `dry_run: true` first and verify the preview before executing live.
- Use the `category` parameter to limit scope and reduce API calls.
- Export results to CSV for review before bulk updates.
```

---

## Annotated Example

See `skills/merchandising/woo-bulk-price-adjustment/SKILL.md` for a complete, annotated example following this format.
