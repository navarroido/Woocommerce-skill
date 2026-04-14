---
name: woo-top-product-performance
role: analytics
description: "Read-only: Rank products by units sold, net revenue, and refund rate over a configurable period and export a performance report."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /reports/top_sellers
  - GET /orders
  - GET /products
  - GET /products/categories
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-top-product-performance

## Purpose

Produce a ranked performance report for your WooCommerce products over a configurable date range. Combines the `/reports/top_sellers` endpoint with order-level data to compute units sold, gross revenue, refunds, and net revenue per product. Optionally breaks down performance by product category. Read-only — no data is modified.

## Prerequisites

- WooCommerce store with REST API enabled (WooCommerce → Settings → Advanced → REST API)
- Consumer Key and Consumer Secret with **Read** scope
- Store accessible over HTTPS
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store (e.g., `https://mystore.com`) |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | No effect — this is a read-only skill |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `date_after` | string | yes | — | Start date in `YYYY-MM-DD` format |
| `date_before` | string | yes | — | End date in `YYYY-MM-DD` format |
| `top_n` | int | no | `20` | Number of top products to include in the report |
| `rank_by` | string | no | `revenue` | Ranking metric: `revenue`, `units`, or `refund_rate` |
| `include_categories` | bool | no | `true` | Include product category in the output |
| `min_units` | int | no | `1` | Minimum units sold to include a product |

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

**Step 1 — Fetch top sellers report**

```
GET /wp-json/wc/v3/reports/top_sellers
  ?period=custom
  &date_min=<date_after>
  &date_max=<date_before>
```

Extract per entry: `product_id`, `product_name`, `quantity` (units sold)

Note: The top_sellers report returns up to 12 products by default. For broader coverage proceed to Step 2.

**Step 2 — Fetch completed orders in range**

```
GET /wp-json/wc/v3/orders
  ?status=completed
  &after=<date_after>T00:00:00Z
  &before=<date_before>T23:59:59Z
  &per_page=100
  &page=1
```

Extract per order: `id`, `line_items[].product_id`, `line_items[].name`, `line_items[].quantity`, `line_items[].total`, `line_items[].sku`

Paginate until response length < 100.

**Step 3 — Aggregate revenue and units per product**

```
for each order:
  for each line_item:
    product_data[product_id].units += quantity
    product_data[product_id].gross_revenue += line_item.total
    product_data[product_id].name = name
    product_data[product_id].sku = sku
```

**Step 4 — Fetch refund data**

```
GET /wp-json/wc/v3/orders
  ?status=refunded
  &after=<date_after>T00:00:00Z
  &before=<date_before>T23:59:59Z
  &per_page=100
  &page=1
```

For each refunded order's line_items: subtract refunded units and amounts.

**Step 5 — Fetch category names (if include_categories: true)**

```
GET /wp-json/wc/v3/products/categories?per_page=100&page=1
```

Build a lookup map: `category_id → name`

Then for each top product, fetch its categories:

```
GET /wp-json/wc/v3/products/{product_id}
```

Extract: `categories[].id`

**Step 6 — Rank and format**

Sort products by `rank_by` metric. Take top `top_n`. Compute refund_rate as `refund_units / (units + refund_units) * 100`.

## API Endpoints Used

```
GET  /wp-json/wc/v3/reports/top_sellers    — initial top sellers by units
GET  /wp-json/wc/v3/orders                 — completed orders for revenue aggregation
GET  /wp-json/wc/v3/products               — product details for category lookup
GET  /wp-json/wc/v3/products/categories    — category name lookup
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
║  SKILL: woo-top-product-performance      ║
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
║  COMPLETE: woo-top-product-performance   ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-top-product-performance",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

**Human format report:**

```
TOP PRODUCT PERFORMANCE — mystore.com
Period: 2025-01-01 to 2025-03-31 | Ranked by: Revenue | Top 20

  #   SKU          Product Name              Category       Units   Revenue      Refunds   Net Rev    Refund%
  ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  1   LW-001       Leather Wallet            Accessories    412     $12,347.88   $410.00   $11,937.88   3.3%
  2   CT-BL-L      Canvas Tote Blue/Large    Bags           381      $7,619.19   $190.00    $7,429.19   2.5%
  3   SS-M         Silver Sunglasses (M)     Accessories    298      $7,151.98   $715.20    $6,436.78  10.0%
  ...
  ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  Total (top 20)                                          4,821    $182,441.20  $8,120.30  $174,320.90   4.5%
```

CSV filename: `woo-top-product-performance_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`
Columns: `rank`, `product_id`, `sku`, `name`, `category`, `units_sold`, `gross_revenue`, `refund_amount`, `net_revenue`, `refund_rate_pct`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid or missing credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Consumer Key lacks Read scope | Regenerate key with Read scope |
| `429 Too Many Requests` | Rate limit during order pagination | Wait 2 seconds and retry |
| Empty result | No completed orders in date range | Check date parameters; ensure orders have `completed` status |
| `reports/top_sellers` returns < top_n | Not enough unique products sold | Normal — result set is smaller than requested top_n |

## Best Practices

- Use `rank_by: refund_rate` to identify problematic products that need investigation.
- For monthly business reviews, run with a full calendar month window and export the CSV.
- Cross-reference high-refund-rate products with `woo-product-data-completeness-score` — poor descriptions often correlate with returns.
- For variable products: units and revenue are aggregated at the parent product level, not per variation.
- Compare quarters using two separate runs to track product performance trends.
