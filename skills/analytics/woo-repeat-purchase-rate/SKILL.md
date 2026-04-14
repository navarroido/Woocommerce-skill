---
name: woo-repeat-purchase-rate
role: analytics
description: "Read-only: Compute the percentage of customers who placed more than one order within a specified window."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /customers
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-repeat-purchase-rate

## Purpose

Measure customer loyalty by computing the repeat purchase rate — the percentage of buyers in a period who placed at least two orders. Segments by new vs. returning customer status and tracks trend over rolling windows. Read-only.

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
| `window_days` | int | no | `30` | Rolling window size for trend computation |

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

Extract: `id`, `customer_id`, `billing.email`, `date_created`.

**Step 2 — Group orders by customer**

Group by `customer_id` (use `billing.email` for guest orders as fallback key).
Count distinct orders per customer within the window.

**Step 3 — Compute repeat purchase rate**

```
repeat_customers = count(customers with order_count >= 2)
total_customers  = count(distinct customers)
repeat_rate_pct  = repeat_customers / total_customers * 100
```

**Step 4 — Compute per rolling window**

Divide date range into `window_days` windows and compute rate per window.

**Step 5 — Export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders      — order history with customer identifiers
GET  /wp-json/wc/v3/customers   — customer lifetime order count for context
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
║  SKILL: woo-repeat-purchase-rate         ║
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
║  COMPLETE: woo-repeat-purchase-rate      ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-repeat-purchase-rate",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-repeat-purchase-rate_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`
Columns: `period_start`, `period_end`, `total_customers`, `one_time_buyers`, `repeat_buyers`, `repeat_rate_pct`, `avg_orders_per_repeat_buyer`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- A repeat rate below 20% in a mature store often signals poor post-purchase engagement — consider email win-back sequences.
- Guest orders are grouped by billing email — high guest checkout rates reduce accuracy; encourage account creation.
- Pair with `woo-customer-cohort-analysis` to understand which acquisition cohorts have the highest retention.
