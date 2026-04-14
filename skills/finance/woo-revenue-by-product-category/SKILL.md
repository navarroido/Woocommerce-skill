---
name: woo-revenue-by-product-category
role: finance
description: "Read-only: Break down net revenue contribution by WooCommerce product category for a specified period."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /products
  - GET /products/categories
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-revenue-by-product-category

## Purpose

Compute net revenue (gross minus refunds) per WooCommerce product category for a specified date range. Identifies which categories are driving the most revenue and which are underperforming. Read-only.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key with **Read** scope
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | No effect — read-only skill |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `date_after` | string | yes | — | Start date (`YYYY-MM-DD`) |
| `date_before` | string | yes | — | End date (`YYYY-MM-DD`) |

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

Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

**Step 1 — Build product → category map**

```
GET /wp-json/wc/v3/products?status=publish&per_page=100&page=1
GET /wp-json/wc/v3/products/categories?per_page=100&page=1
```

Map each `product_id` to its category IDs and names.

**Step 2 — Fetch completed orders in range**

```
GET /wp-json/wc/v3/orders
  ?status=completed&after=<date_after>T00:00:00Z&before=<date_before>T23:59:59Z&per_page=100&page=1
```

For each order's `line_items`: add `line_item.total` to each of the product's categories.

**Step 3 — Subtract refunds**

Same process for `status=refunded` orders.

**Step 4 — Sort by net revenue and export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders                — order line items for revenue
GET  /wp-json/wc/v3/products              — product to category mapping
GET  /wp-json/wc/v3/products/categories   — category names
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
║  SKILL: woo-revenue-by-product-category  ║
║  STORE: <store_url>                      ║
║  TIME:  <ISO-8601 UTC>                   ║
║  MODE:  READ-ONLY                        ║
╚══════════════════════════════════════════╝
```

PER-OPERATION (emit after each API call batch):

```
[N/TOTAL] <METHOD> <endpoint> → <result_count> records | params: <key>=<val>
```

COMPLETION (human format):

```
╔══════════════════════════════════════════╗
║  COMPLETE: woo-revenue-by-product-cat.   ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-revenue-by-product-category",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-revenue-by-product-category_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`
Columns: `category_id`, `category_name`, `units_sold`, `gross_revenue`, `refunds`, `net_revenue`, `revenue_share_pct`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Products assigned to multiple categories appear in revenue for each — note that category totals may not sum to overall store total.
- Use this report for quarterly category performance reviews and catalog investment planning.
- Compare category share % year-over-year to detect strategic shifts in customer purchasing patterns.
