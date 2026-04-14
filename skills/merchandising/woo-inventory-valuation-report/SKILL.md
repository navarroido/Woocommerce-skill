---
name: woo-inventory-valuation-report
role: merchandising
description: "Read-only: Calculate total inventory value (stock_quantity × price) by category and export as a financial summary."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - GET /products/categories
  - GET /products/{id}/variations
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-inventory-valuation-report

## Purpose

Compute the total stock-on-hand value for your WooCommerce catalog by multiplying `stock_quantity` by `regular_price` for each product and variation. Groups results by category. Useful for balance sheet reporting, insurance valuation, and capital planning. Read-only — no data is modified.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key with **Read** scope
- Stock management must be enabled (`manage_stock: true`) per product for accurate results
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | No effect — read-only skill |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `price_field` | string | no | `regular_price` | Price to use for valuation: `regular_price` or `sale_price` |
| `include_variations` | bool | no | `true` | Include variation-level stock valuation |
| `exclude_zero_stock` | bool | no | `true` | Exclude products with zero stock |

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

**Step 1 — Fetch category names**

```
GET /wp-json/wc/v3/products/categories?per_page=100&page=1
```

Build category ID → name lookup.

**Step 2 — Fetch all products with stock**

```
GET /wp-json/wc/v3/products?status=publish&per_page=100&page=1
```

Extract: `id`, `name`, `sku`, `type`, `stock_quantity`, `regular_price`, `sale_price`, `manage_stock`, `categories`

**Step 3 — Fetch variation stock (if include_variations: true)**

For each variable product:

```
GET /wp-json/wc/v3/products/{id}/variations?per_page=100&page=1
```

Extract per variation: `id`, `sku`, `stock_quantity`, `regular_price`, `sale_price`, `manage_stock`

**Step 4 — Compute valuation**

For each product/variation where `manage_stock == true`:

```
inventory_value = stock_quantity × price_field_value
```

Skip if `exclude_zero_stock: true` and `stock_quantity <= 0`.

**Step 5 — Aggregate by category and export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/products/categories           — category name lookup
GET  /wp-json/wc/v3/products                      — product stock and price data
GET  /wp-json/wc/v3/products/{id}/variations      — variation-level stock
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
║  SKILL: woo-inventory-valuation-report   ║
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
║  COMPLETE: woo-inventory-valuation-report║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-inventory-valuation-report",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-inventory-valuation-report_<YYYY-MM-DD>.csv`
Columns: `product_id`, `variation_id`, `sku`, `name`, `category`, `stock_quantity`, `unit_price`, `inventory_value`

Human summary also shows category subtotals and grand total.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |
| Zero total value | Stock management disabled on all products | Enable `manage_stock` per product |

## Best Practices

- Run at month-end for balance sheet reporting.
- Use `price_field: regular_price` for replacement cost valuation; `sale_price` for liquidation value.
- Products with `manage_stock: false` are excluded — ensure stock management is enabled for your physical inventory.
- Cross-reference grand total against your purchase ledger quarterly.
