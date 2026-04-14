---
name: woo-customer-acquisition-trend
role: analytics
description: "Read-only: Track new customer registrations by month and compute first-order conversion rate."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /customers
  - GET /orders
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-customer-acquisition-trend

## Purpose

Track the rate of new customer account registrations over time and compute what percentage of new registrations convert to a first completed order. Identifies growth trends and registration-to-purchase drop-off. Read-only.

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
| `group_by` | string | no | `month` | Granularity: `week` or `month` |

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

**Step 1 — Fetch new customers in range**

```
GET /wp-json/wc/v3/customers
  ?role=customer&orderby=registered_date&order=asc&after=<date_after>&before=<date_before>&per_page=100&page=1
```

Extract: `id`, `date_created`, `orders_count`.

**Step 2 — Group registrations by period**

Group customer `date_created` by `group_by` period (month or week). Count registrations per period.

**Step 3 — Compute first-order conversion**

For each registered customer: if `orders_count >= 1`, they converted. Sum converters per registration period.

```
conversion_rate = converters / registrations * 100
```

**Step 4 — Export trend series**

## API Endpoints Used

```
GET  /wp-json/wc/v3/customers   — new registrations with orders_count
GET  /wp-json/wc/v3/orders      — first-order dates for timing analysis
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
║  SKILL: woo-customer-acquisition-trend   ║
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
║  COMPLETE: woo-customer-acquisition-trend║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-customer-acquisition-trend",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-customer-acquisition-trend_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`
Columns: `period`, `new_registrations`, `first_order_converters`, `conversion_rate_pct`, `non_converters`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Guest checkout orders are not included in customer registrations — this metric reflects registered account holders only.
- Sudden drops in conversion rate often correlate with checkout friction changes — compare with `woo-conversion-funnel-report` for the same period.
- Pair with `woo-customer-cohort-analysis` to track long-term retention of each acquisition cohort.
