---
name: woo-category-reorganization
role: merchandising
description: "Reassign products between categories in bulk based on tag or meta_data filter rules with dry-run preview."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - PUT /products/{id}
  - GET /products/categories
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-category-reorganization

## Purpose

Bulk-reassign WooCommerce products to new categories based on filter rules (current category, tag, price range, or meta field value). Useful during catalog restructuring, brand migrations, or seasonal collection reorganizations. Always shows a full preview before executing any changes.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key with **Read/Write** scope
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `true` | Preview without executing |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `source_category_id` | int | yes | — | Move products currently in this category |
| `target_category_id` | int | yes | — | Destination category |
| `mode` | string | no | `add` | `add` (keep source) or `move` (remove from source) |
| `filter_tag_id` | int | no | — | Additionally filter by this tag |

## Authentication

WooCommerce uses OAuth 1.0a for HTTP and Basic Auth over HTTPS.

For HTTPS stores (recommended):

```
Authorization: Basic base64(consumer_key:consumer_secret)
```

For HTTP stores (development only): Use OAuth 1.0a — include oauth_consumer_key, oauth_nonce, oauth_signature, oauth_signature_method=HMAC-SHA1, oauth_timestamp, oauth_version=1.0

Never log or output consumer_key or consumer_secret values.

See docs/AUTHENTICATION.md for full setup instructions.

## Safety

**Step 3 modifies product category assignments.** Always run with `dry_run: true` first (the default). Verify the product list before moving — this affects storefront navigation and category page SEO.

## Workflow Steps

**Step 1 — Resolve category names**

```
GET /wp-json/wc/v3/products/categories/{source_category_id}
GET /wp-json/wc/v3/products/categories/{target_category_id}
```

**Step 2 — Fetch products in source category**

```
GET /wp-json/wc/v3/products
  ?category=<source_category_id>&status=publish&per_page=100&page=1
  [&tag=<filter_tag_id>]
```

Extract: `id`, `name`, `sku`, `categories`

**Step 3 — Preview or update**

Compute new category list for each product:
- `mode: add` → append `target_category_id`, keep `source_category_id`
- `mode: move` → replace `source_category_id` with `target_category_id`

If `dry_run: true`: output preview table and stop.

If `dry_run: false` and confirmed:

```
PUT /wp-json/wc/v3/products/{id}
  Body: { "categories": [{ "id": <cat_id> }, ...] }
```

## API Endpoints Used

```
GET  /wp-json/wc/v3/products/categories    — resolve category names
GET  /wp-json/wc/v3/products               — products in source category
PUT  /wp-json/wc/v3/products/{id}          — update category assignments
```

## Pagination Strategy

WooCommerce REST API uses page/per_page pagination (not cursor-based).

Standard pattern:

```
page = 1
while True:
  response = GET /endpoint?per_page=100&page=page
  process(response)
  if len(response) < 100: break
  page += 1
```

Maximum per_page is 100 for most endpoints.
The X-WP-Total and X-WP-TotalPages response headers report totals.
Always read X-WP-TotalPages on the first request to estimate job size.

## Session Tracking

Claude MUST emit the following output at each stage. This is mandatory.

STARTUP:

```
╔══════════════════════════════════════════╗
║  SKILL: woo-category-reorganization      ║
║  STORE: <store_url>                      ║
║  TIME:  <ISO-8601 UTC>                   ║
║  MODE:  <DRY RUN | LIVE>                 ║
╚══════════════════════════════════════════╝
```

PER-OPERATION (emit after each API call batch):

```
[N/TOTAL] <METHOD> <endpoint> → <result_count> records | params: <key>=<val>
```

COMPLETION (human format):

```
╔══════════════════════════════════════════╗
║  COMPLETE: woo-category-reorganization   ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-category-reorganization",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: table of each product, current categories, and new categories after change.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `404 Not Found` | Category ID does not exist | Verify category IDs |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first (the default).
- After reorganization, flush WooCommerce transients (WooCommerce → Status → Tools) so category counts update.
- Use `mode: add` first to verify the target category looks correct before using `mode: move`.
