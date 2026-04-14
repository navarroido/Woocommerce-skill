---
name: woo-revenue-by-period
role: finance
description: "Read-only: Aggregate gross revenue, refunds, and net revenue by day, week, or month using WooCommerce reports."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /reports/sales
  - GET /orders
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-revenue-by-period

## Purpose

Generate a revenue summary report for WooCommerce aggregated by day, week, or month. Combines the `/reports/sales` endpoint with order-level data for accurate gross revenue, total refunds, and net revenue calculations. Useful for financial reporting, board updates, and trend analysis. Read-only.

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
| `group_by` | string | no | `month` | Granularity: `day`, `week`, or `month` |
| `include_taxes` | bool | no | `false` | Include tax_total in revenue figure |

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

**Step 1 — Fetch WooCommerce sales report**

```
GET /wp-json/wc/v3/reports/sales
  ?period=custom&date_min=<date_after>&date_max=<date_before>
```

Extract: `total_sales`, `net_sales`, `total_orders`, `total_refunds`, `total_tax`, `total_shipping`

**Step 2 — Fetch orders for period breakdown**

```
GET /wp-json/wc/v3/orders
  ?status=completed&after=<date_after>T00:00:00Z&before=<date_before>T23:59:59Z&per_page=100&page=1
```

Group `total` by `group_by` period (day/week/month of `date_created`).

**Step 3 — Fetch refunds in same period**

```
GET /wp-json/wc/v3/orders?status=refunded&after=...&before=...&per_page=100&page=1
```

Subtract from period totals.

**Step 4 — Format and export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/reports/sales   — aggregate sales report
GET  /wp-json/wc/v3/orders          — order-level detail for period breakdown
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
║  SKILL: woo-revenue-by-period            ║
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
║  COMPLETE: woo-revenue-by-period         ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-revenue-by-period",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-revenue-by-period_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`
Columns: `period`, `orders`, `gross_revenue`, `refunds`, `net_revenue`, `tax_total`, `shipping_total`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |
| Empty result | No completed orders in range | Verify date range and order statuses |

## Best Practices

- Use `group_by: month` for monthly P&L reports and `group_by: day` for short-term trend analysis.
- Always specify `date_after` and `date_before` aligned to full periods (e.g., full months) for clean comparisons.
- Compare to the same period in the prior year for YoY growth analysis.
