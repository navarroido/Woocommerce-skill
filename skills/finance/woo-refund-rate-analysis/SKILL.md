---
name: woo-refund-rate-analysis
role: finance
description: "Read-only: Compute refund rate by product, category, or period from order and refund data."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /orders/{id}/refunds
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-refund-rate-analysis

## Purpose

Compute refund rates for WooCommerce orders segmented by product, product category, or time period. Identifies products with abnormally high return rates that warrant quality investigation. Read-only.

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
| `group_by` | string | no | `product` | Group by: `product`, `category`, or `period` |
| `high_rate_threshold` | number | no | `10` | Refund rate % above which to flag as high |

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

**Step 1 — Fetch completed orders**

```
GET /wp-json/wc/v3/orders
  ?status=completed&after=<date_after>T00:00:00Z&before=<date_before>T23:59:59Z&per_page=100&page=1
```

Aggregate units sold and revenue per `product_id` from `line_items`.

**Step 2 — Fetch refunded orders**

```
GET /wp-json/wc/v3/orders
  ?status=refunded&after=<date_after>T00:00:00Z&before=<date_before>T23:59:59Z&per_page=100&page=1
```

Aggregate refunded units and amounts per `product_id` from `line_items`.

**Step 3 — Compute rates**

```
refund_rate = refunded_units / (sold_units + refunded_units) * 100
```

Flag products where `refund_rate > high_rate_threshold`.

**Step 4 — Export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders                — completed and refunded order scan
GET  /wp-json/wc/v3/orders/{id}/refunds   — detailed refund line items
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
║  SKILL: woo-refund-rate-analysis         ║
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
║  COMPLETE: woo-refund-rate-analysis      ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-refund-rate-analysis",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-refund-rate-analysis_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`
Columns: `group_key`, `name`, `units_sold`, `units_refunded`, `refund_rate_pct`, `gross_revenue`, `refund_amount`, `net_revenue`, `flagged`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Investigate high-rate products for quality issues, misleading descriptions, or sizing problems.
- Use `group_by: period` to detect if a spike in refund rate correlates with a specific batch or promotion.
- Pair with `woo-product-data-completeness-score` — incomplete descriptions often correlate with high refund rates.
