---
name: woo-product-tag-bulk-update
role: merchandising
description: "Add or remove tags from a filtered set of products (by category, price range, or stock status) with dry-run preview."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - PUT /products/{id}
  - GET /products/tags
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-product-tag-bulk-update

## Purpose

Add or remove one or more tags from a bulk-filtered set of WooCommerce products. Filters include category, price range, stock status, or existing tags. Useful for tagging seasonal collections, sale items, or featured products in bulk. Includes dry-run preview before any products are updated.

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
| `dry_run` | bool | no | `true` | Preview changes without executing |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `action` | string | yes | — | `add` or `remove` |
| `tag_ids` | array | yes | — | List of tag IDs to add or remove |
| `filter_category_id` | int | no | — | Limit to products in this category |
| `filter_tag_id` | int | no | — | Limit to products with this existing tag |
| `filter_min_price` | number | no | — | Minimum regular_price |
| `filter_max_price` | number | no | — | Maximum regular_price |
| `filter_stock_status` | string | no | — | `instock`, `outofstock`, or `onbackorder` |

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

**Step 3 updates product tags on multiple products.** Always run with `dry_run: true` first (the default). Verify the product list in the preview before applying.

## Workflow Steps

**Step 1 — Resolve tag names**

```
GET /wp-json/wc/v3/products/tags?per_page=100&page=1
```

Build tag ID → name lookup for display in preview.

**Step 2 — Fetch filtered products**

```
GET /wp-json/wc/v3/products
  ?status=publish&per_page=100&page=1
  [&category=<filter_category_id>]
  [&tag=<filter_tag_id>]
  [&stock_status=<filter_stock_status>]
```

Filter client-side by price range if specified.
Extract per product: `id`, `name`, `sku`, `tags`

**Step 3 — Preview or update tags**

Compute new tag list:
- `add`: merge `tag_ids` into existing tags (avoid duplicates)
- `remove`: subtract `tag_ids` from existing tags

If `dry_run: true`: output preview table and stop.

If `dry_run: false` and confirmed:

```
PUT /wp-json/wc/v3/products/{id}
  Body: { "tags": [{ "id": <tag_id> }, ...] }
```

## API Endpoints Used

```
GET  /wp-json/wc/v3/products/tags    — resolve tag IDs to names
GET  /wp-json/wc/v3/products         — fetch filtered product set
PUT  /wp-json/wc/v3/products/{id}    — update product tags
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
║  SKILL: woo-product-tag-bulk-update      ║
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
║  COMPLETE: woo-product-tag-bulk-update   ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-product-tag-bulk-update",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: a table listing each product, its current tags, and the new tag set.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `404 Not Found` | Tag ID does not exist | Verify tag IDs via WooCommerce → Products → Tags |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first (the default). Confirm the product list before applying.
- Use tag IDs (not names) in `tag_ids` — fetch them from WooCommerce → Products → Tags.
- For adding seasonal tags: schedule this skill at the start of the season; use `remove` at the end.
