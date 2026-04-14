---
name: woo-product-cross-sell-analysis
role: analytics
description: "Read-only: Identify products most frequently purchased together in the same order."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /products
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-product-cross-sell-analysis

## Purpose

Analyse WooCommerce completed orders to find product pairs that appear together most frequently. Surfaces natural cross-sell and bundle opportunities based on real purchase behavior. Read-only.

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
| `min_co_occurrences` | int | no | `5` | Only report pairs appearing together at least this many times |
| `top_n` | int | no | `20` | Number of top product pairs to return |

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

**Step 1 — Fetch completed orders in range**

```
GET /wp-json/wc/v3/orders
  ?status=completed&after=<date_after>T00:00:00Z&before=<date_before>T23:59:59Z&per_page=100&page=1
```

For each order, extract the list of `product_id` values from `line_items`.

**Step 2 — Build co-occurrence matrix**

For each order with 2+ line items, generate all unique product ID pairs (combinations, not permutations). Increment the pair's counter.

```
for each order:
  product_ids = [item.product_id for item in order.line_items]
  for each pair (A, B) where A < B:
    co_occurrence[A][B] += 1
```

**Step 3 — Filter and rank**

Filter pairs with `count < min_co_occurrences`. Sort descending by co-occurrence count. Take top `top_n`.

**Step 4 — Enrich with product names**

```
GET /wp-json/wc/v3/products?include=<id1,id2,...>&per_page=100
```

Map product IDs to names.

**Step 5 — Export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders     — line items for co-occurrence analysis
GET  /wp-json/wc/v3/products   — product names for enrichment
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
║  SKILL: woo-product-cross-sell-analysis  ║
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
║  COMPLETE: woo-product-cross-sell-analysis║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-product-cross-sell-analysis",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-product-cross-sell-analysis_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`
Columns: `product_a_id`, `product_a_name`, `product_b_id`, `product_b_name`, `co_occurrence_count`, `product_a_total_orders`, `product_b_total_orders`, `lift`

Where `lift = co_occurrence / (product_a_total_orders * product_b_total_orders / total_orders)` — values > 1 indicate stronger-than-random association.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |
| Low pair counts | Date range too short or low order volume | Extend `date_after`/`date_before` range |

## Best Practices

- Use `lift > 1.5` as the threshold for actionable cross-sell pairs — high co-occurrence alone can reflect popular products, not true affinity.
- Feed top pairs into WooCommerce product cross-sells via the product editor to surface recommendations at cart.
- Run quarterly — purchase patterns shift with seasonal inventory changes.
