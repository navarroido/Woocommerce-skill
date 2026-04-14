---
name: woo-dead-stock-identifier
role: merchandising
description: "Read-only: Find products with zero sales in the last N days but positive stock — candidates for markdown, clearance, or removal."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - GET /orders
  - GET /reports/top_sellers
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-dead-stock-identifier

## Purpose

Identify WooCommerce products that have had no sales in a configurable lookback window but still carry positive stock. These dead-stock items tie up capital and warehouse space. The report exports a prioritized list by inventory value (stock × price) to help prioritize clearance action. Read-only — no products are modified.

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
| `lookback_days` | int | no | `90` | Days with no sales to flag as dead stock |
| `min_stock` | int | no | `1` | Minimum stock quantity to include |
| `min_inventory_value` | number | no | `0` | Minimum stock value (stock × price) to include |
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

Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

**Step 1 — Fetch all published products with stock**

```
GET /wp-json/wc/v3/products?status=publish&stock_status=instock&per_page=100&page=1
```

Build a set of all product IDs with stock > 0.

**Step 2 — Fetch products sold in the lookback window**

```
GET /wp-json/wc/v3/orders
  ?status=completed&after=<now - lookback_days>&per_page=100&page=1
```

Extract all `product_id` values from `line_items`. Build a set of "sold product IDs."

**Step 3 — Compute dead stock**

Dead stock = products in Step 1 set that are NOT in the Step 2 sold set.

**Step 4 — Compute inventory value and sort**

For each dead-stock product: `inventory_value = stock_quantity × regular_price`
Sort descending by `inventory_value`.

## API Endpoints Used

```
GET  /wp-json/wc/v3/products           — all in-stock products
GET  /wp-json/wc/v3/orders             — completed orders in lookback window
GET  /wp-json/wc/v3/reports/top_sellers — supplementary sales data
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
║  SKILL: woo-dead-stock-identifier        ║
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
║  COMPLETE: woo-dead-stock-identifier     ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-dead-stock-identifier",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-dead-stock-identifier_<YYYY-MM-DD>.csv`
Columns: `product_id`, `sku`, `name`, `category`, `stock_quantity`, `regular_price`, `inventory_value`, `days_since_last_sale`, `date_created`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit during order scan | Wait 2 seconds and retry |
| Large lookback window | Too many orders to scan | Reduce `lookback_days` or run in off-peak hours |

## Best Practices

- Use `lookback_days: 90` as a starting point; seasonal products may need `180` or `365`.
- Sort the export by `inventory_value` descending to prioritize high-capital items first.
- Follow up with `woo-bulk-price-adjustment` to apply clearance discounts to identified items.
- For seasonal catalogs: run before and after the selling season to catch unsold inventory.
