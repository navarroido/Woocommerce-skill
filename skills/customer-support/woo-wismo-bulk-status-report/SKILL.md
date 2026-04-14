---
name: woo-wismo-bulk-status-report
role: customer-support
description: "Read-only: Find all unfulfilled orders older than N days and export a WISMO (Where Is My Order) CSV for proactive customer communication."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-wismo-bulk-status-report

## Purpose

Export all WooCommerce orders in `processing` or `on-hold` status that are older than a configurable threshold — these are orders customers are most likely to contact support about ("Where Is My Order?"). Provides a ready-made list for proactive outreach or support queue prioritization. Read-only.

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
| `min_age_days` | int | no | `3` | Minimum order age in days to include |
| `statuses` | array | no | `["processing", "on-hold"]` | Order statuses to check |
| `max_results` | int | no | `500` | Maximum orders to include in export |

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

**Step 1 — Fetch unfulfilled orders older than threshold**

```
GET /wp-json/wc/v3/orders
  ?status=processing,on-hold
  &before=<ISO-8601 of now - min_age_days>
  &per_page=100&page=1
  &orderby=date&order=asc
```

Extract: `id`, `number`, `date_created`, `total`, `billing`, `shipping`, `line_items[].name`, `meta_data` (check for tracking number)

**Step 2 — Compute age and check for tracking**

For each order: `age_days = (now - date_created) / 86400`
Check `meta_data` for tracking number keys.

**Step 3 — Export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders   — unfulfilled orders with date and status filter
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
║  SKILL: woo-wismo-bulk-status-report     ║
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
║  COMPLETE: woo-wismo-bulk-status-report  ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-wismo-bulk-status-report",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-wismo-bulk-status-report_<YYYY-MM-DD>.csv`
Columns: `order_id`, `order_number`, `date_created`, `age_days`, `status`, `customer_name`, `email`, `phone`, `total`, `items_summary`, `has_tracking`, `tracking_number`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Run daily and triage the oldest orders first — customers who've been waiting longest are most likely to escalate.
- For orders with tracking numbers already set: filter them out for the "no tracking" priority queue.
- Pair with `woo-bulk-order-notes` to add update notes to affected orders after investigating.
