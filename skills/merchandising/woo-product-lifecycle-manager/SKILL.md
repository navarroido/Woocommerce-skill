---
name: woo-product-lifecycle-manager
role: merchandising
description: "Move products between draft, pending, private, and publish statuses in bulk based on age or sales thresholds with dry-run preview."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - PUT /products/{id}
  - GET /orders
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-product-lifecycle-manager

## Purpose

Automate WooCommerce product lifecycle transitions: archive slow-moving products to draft, publish pending products that meet criteria, or move discontinued items to private status. Filters by product age, days since last sale, or zero-sale count. Includes dry-run preview before any status changes.

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
| `source_status` | string | yes | — | Current product status: `publish`, `draft`, `pending`, `private` |
| `target_status` | string | yes | — | New status to apply |
| `filter_no_sales_days` | int | no | — | Only include products with no sales in last N days |
| `filter_min_age_days` | int | no | — | Only include products created at least N days ago |
| `category_id` | int | no | — | Limit to this category |

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

**Step 3 changes product visibility.** Drafting or privatizing published products removes them from the storefront immediately. Always run with `dry_run: true` first (the default). Verify the product list carefully.

## Workflow Steps

**Step 1 — Fetch products in source_status**

```
GET /wp-json/wc/v3/products
  ?status=<source_status>&per_page=100&page=1
  [&category=<category_id>]
```

Filter client-side by `date_created` for `filter_min_age_days`.

**Step 2 — Check sales for each product (if filter_no_sales_days set)**

```
GET /wp-json/wc/v3/orders
  ?status=completed&after=<now - filter_no_sales_days days>&per_page=100&page=1
```

Build set of product IDs with recent sales. Exclude these from the transition list.

**Step 3 — Preview or execute**

If `dry_run: true`: output transition preview table and stop.

If `dry_run: false` and confirmed:

```
PUT /wp-json/wc/v3/products/{id}
  Body: { "status": "<target_status>" }
```

## API Endpoints Used

```
GET  /wp-json/wc/v3/products         — products in source status
GET  /wp-json/wc/v3/orders           — sales check for filter_no_sales_days
PUT  /wp-json/wc/v3/products/{id}    — update product status
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
║  SKILL: woo-product-lifecycle-manager    ║
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
║  COMPLETE: woo-product-lifecycle-manager ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-product-lifecycle-manager",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: table listing product ID, name, current status, new status, and filter criteria matched.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first (the default). Unpublishing products is immediately visible to customers.
- Use `filter_no_sales_days: 180` to archive products that genuinely haven't sold recently.
- Set `filter_min_age_days: 30` to avoid archiving newly-listed products that need time to gain traction.
