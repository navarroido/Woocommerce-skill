---
name: woo-average-order-value-trends
role: finance
description: "Read-only: Track average order value over rolling windows and flag statistically significant changes."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /reports/sales
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-average-order-value-trends

## Purpose

Compute average order value (AOV) for WooCommerce over a series of rolling time windows and compare periods to detect significant changes. Segments by order count ranges and payment method to surface insights. Read-only.

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
| `window_days` | int | no | `30` | Rolling window size in days |
| `change_threshold_pct` | number | no | `10` | Flag period-over-period AOV change above this % |

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

Extract: `id`, `total`, `date_created`

**Step 2 — Compute AOV per window**

Divide the date range into rolling `window_days` windows. For each window: `aov = sum(total) / count(orders)`.

**Step 3 — Compare periods and flag changes**

For each consecutive pair of windows: `change_pct = (aov_current - aov_previous) / aov_previous * 100`.
Flag if `abs(change_pct) > change_threshold_pct`.

**Step 4 — Export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders          — order totals for AOV calculation
GET  /wp-json/wc/v3/reports/sales   — aggregate check
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
║  SKILL: woo-average-order-value-trends   ║
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
║  COMPLETE: woo-average-order-value-trends║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-average-order-value-trends",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-average-order-value-trends_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`
Columns: `period_start`, `period_end`, `order_count`, `total_revenue`, `aov`, `change_pct_vs_prev`, `flagged`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |
| Too few orders per window | Window too short or low traffic | Increase `window_days` for meaningful averages |

## Best Practices

- AOV spikes often correlate with promotions — check against your marketing calendar.
- AOV drops may signal an influx of new customers with smaller first orders — segment by customer age.
- Compare monthly AOV year-over-year to account for seasonal patterns.
