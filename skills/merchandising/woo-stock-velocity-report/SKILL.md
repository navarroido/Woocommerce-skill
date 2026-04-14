---
name: woo-stock-velocity-report
role: merchandising
description: "Read-only: Compute units-sold-per-day per SKU over a rolling window and flag fast-movers and slow-movers."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /products
  - GET /reports/top_sellers
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-stock-velocity-report

## Purpose

Compute stock velocity (units sold per day) for every SKU over a configurable rolling window. Flags fast-movers at risk of stockout and slow-movers consuming storage space. Combines current stock levels with velocity to project days-of-stock-remaining for each product. Read-only — no data is modified.

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
| `lookback_days` | int | no | `30` | Rolling window for velocity calculation |
| `fast_mover_threshold` | number | no | `2.0` | Units/day above which a product is flagged as fast-mover |
| `slow_mover_threshold` | number | no | `0.1` | Units/day below which a product is flagged as slow-mover |
| `low_days_of_stock` | int | no | `14` | Days of stock remaining below which product is flagged critical |
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

**Step 1 — Fetch completed orders in the lookback window**

```
GET /wp-json/wc/v3/orders
  ?status=completed&after=<now - lookback_days>&per_page=100&page=1
```

Aggregate units sold per `product_id` from `line_items`.

**Step 2 — Fetch current stock for all products**

```
GET /wp-json/wc/v3/products?status=publish&per_page=100&page=1
```

Extract: `id`, `name`, `sku`, `stock_quantity`, `manage_stock`

**Step 3 — Compute velocity**

For each product:

```
velocity = units_sold / lookback_days  (units per day)
days_of_stock = stock_quantity / velocity  (if velocity > 0, else ∞)
```

**Step 4 — Classify and export**

Classify as: `FAST` (velocity > fast_mover_threshold), `SLOW` (< slow_mover_threshold), `NORMAL`
Flag `CRITICAL` if `days_of_stock < low_days_of_stock`.

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders              — sales data for velocity calc
GET  /wp-json/wc/v3/products            — current stock levels
GET  /wp-json/wc/v3/reports/top_sellers — supplementary ranking data
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
║  SKILL: woo-stock-velocity-report        ║
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
║  COMPLETE: woo-stock-velocity-report     ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-stock-velocity-report",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-stock-velocity-report_<YYYY-MM-DD>.csv`
Columns: `product_id`, `sku`, `name`, `category`, `units_sold`, `lookback_days`, `velocity_per_day`, `stock_quantity`, `days_of_stock`, `classification`, `critical`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Run weekly to track velocity changes, especially during promotions or seasonal peaks.
- Use `critical` flag to trigger immediate reorder — these products will stock out before your lead time.
- Combine `SLOW` classification output with `woo-dead-stock-identifier` for comprehensive clearance planning.
