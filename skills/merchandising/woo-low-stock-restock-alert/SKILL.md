---
name: woo-low-stock-restock-alert
role: merchandising
description: "Read-only: Query products below a configurable stock threshold and export a prioritized reorder sheet grouped by category."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - GET /products/categories
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-low-stock-restock-alert

## Purpose

Identify all WooCommerce products and variations with `stock_quantity` at or below a configurable threshold and export a prioritized reorder sheet. Groups results by category for easy routing to suppliers. Read-only — no stock data is modified.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key with **Read** scope
- Store management must track stock per product (`manage_stock: true` per product)
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | No effect — read-only skill |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `threshold` | int | no | `5` | Stock quantity at or below which a product is flagged |
| `include_out_of_stock` | bool | no | `true` | Include products with stock_quantity = 0 |
| `category_id` | int | no | — | Limit to products in this category |
| `include_variations` | bool | no | `true` | Also check variations of variable products |

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

**Step 1 — Fetch products with low stock**

```
GET /wp-json/wc/v3/products
  ?stock_status=instock&manage_stock=true&per_page=100&page=1
  [&category=<category_id>]
```

Filter client-side: keep products where `stock_quantity <= threshold`.

Also fetch out-of-stock products if `include_out_of_stock: true`:

```
GET /wp-json/wc/v3/products?stock_status=outofstock&per_page=100&page=1
```

**Step 2 — Check variations (if include_variations: true)**

For each variable product in the low-stock set:

```
GET /wp-json/wc/v3/products/{id}/variations?per_page=100&page=1
```

Add variations where `manage_stock == true` and `stock_quantity <= threshold`.

**Step 3 — Fetch category names**

```
GET /wp-json/wc/v3/products/categories?per_page=100&page=1
```

Build category ID → name lookup.

**Step 4 — Sort and export**

Sort by `stock_quantity` ascending (most critical first), grouped by category.

## API Endpoints Used

```
GET  /wp-json/wc/v3/products                      — list products with stock filter
GET  /wp-json/wc/v3/products/{id}/variations      — variation stock levels
GET  /wp-json/wc/v3/products/categories           — category name lookup
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
║  SKILL: woo-low-stock-restock-alert      ║
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
║  COMPLETE: woo-low-stock-restock-alert   ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-low-stock-restock-alert",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-low-stock-restock-alert_<YYYY-MM-DD>.csv`
Columns: `product_id`, `variation_id`, `sku`, `name`, `category`, `stock_quantity`, `stock_status`, `regular_price`, `low_stock_amount`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |
| Empty result | No products below threshold | Increase `threshold` or check `manage_stock` settings |

## Best Practices

- Run daily before placing supplier orders to catch critical stock levels.
- Set `threshold` to your average daily units sold × your supplier lead time in days.
- Combine with `woo-inventory-adjustment` to post the restocked quantities after receiving.
- Export the CSV directly to your purchasing team or ERP system.
