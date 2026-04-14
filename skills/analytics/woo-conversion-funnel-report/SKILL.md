---
name: woo-conversion-funnel-report
role: analytics
description: "Read-only: Compute pending/on-hold/completed order ratios to surface checkout conversion insights."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /reports/orders/totals
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-conversion-funnel-report

## Purpose

Analyse WooCommerce order status distribution to infer checkout funnel health. Computes the ratio of pending, on-hold, processing, completed, cancelled, and failed orders to identify where buyers drop off. Read-only.

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

**Step 1 — Fetch order totals by status**

```
GET /wp-json/wc/v3/reports/orders/totals
```

Returns count per status slug: `pending`, `processing`, `on-hold`, `completed`, `cancelled`, `refunded`, `failed`.

**Step 2 — Fetch date-filtered order counts**

For each status in the funnel, query:
```
GET /wp-json/wc/v3/orders?status=<status>&after=<date_after>T00:00:00Z&before=<date_before>T23:59:59Z&per_page=1
```

Use `X-WP-Total` header for the count (avoids fetching full order data).

**Step 3 — Compute funnel ratios**

```
total_initiated = pending + processing + on_hold + completed + cancelled + failed
completion_rate = completed / total_initiated * 100
failure_rate    = (failed + cancelled) / total_initiated * 100
hold_rate       = on_hold / total_initiated * 100
```

**Step 4 — Export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/reports/orders/totals   — aggregate order counts by status
GET  /wp-json/wc/v3/orders                  — date-filtered counts via X-WP-Total header
```

## Pagination Strategy

WooCommerce REST API uses page/per_page pagination (not cursor-based).

For date-filtered counts, use `per_page=1` and read `X-WP-Total` from the response header — this avoids fetching all order records and minimises API calls.

## Session Tracking

Claude MUST emit the following output at each stage. This is mandatory.

STARTUP:

```
╔══════════════════════════════════════════╗
║  SKILL: woo-conversion-funnel-report     ║
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
║  COMPLETE: woo-conversion-funnel-report  ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-conversion-funnel-report",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-conversion-funnel-report_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`
Columns: `status`, `order_count`, `pct_of_total`, `completion_rate_pct`, `failure_rate_pct`, `hold_rate_pct`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- A rising `failed` ratio often points to payment gateway misconfiguration or card decline issues — cross-check with `woo-payment-gateway-status`.
- High `on-hold` ratios may indicate manual review processes that need automation.
- Run weekly to detect sudden drops in `completion_rate` which could signal a broken checkout flow.
