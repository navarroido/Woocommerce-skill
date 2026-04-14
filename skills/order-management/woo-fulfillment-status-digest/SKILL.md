---
name: woo-fulfillment-status-digest
role: order-management
description: "Read-only: Aggregate order counts by status and flag orders overdue for processing based on a configurable SLA age threshold."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /reports/orders/totals
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-fulfillment-status-digest

## Purpose

Produce a fulfillment health snapshot of your WooCommerce store: total orders by status, orders overdue by configurable SLA thresholds, and a list of specific order IDs that need immediate attention. Read-only — no order data is modified.

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
| `processing_sla_hours` | int | no | `24` | Hours after which a "processing" order is flagged as overdue |
| `on_hold_sla_hours` | int | no | `48` | Hours after which an "on-hold" order is flagged as overdue |
| `pending_sla_hours` | int | no | `12` | Hours after which a "pending" order is flagged as overdue |
| `include_overdue_list` | bool | no | `true` | Include the list of overdue order IDs in output |
| `max_overdue_listed` | int | no | `25` | Maximum number of overdue orders to list |

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

Extract: array of `{ slug, name, total }` — provides counts for all WooCommerce order statuses.

**Step 2 — Fetch overdue processing orders**

```
GET /wp-json/wc/v3/orders
  ?status=processing
  &before=<ISO-8601 timestamp of now - processing_sla_hours>
  &per_page=100
  &page=1
  &orderby=date
  &order=asc
```

Extract per order: `id`, `number`, `date_created`, `total`, `billing.first_name`, `billing.last_name`, `billing.email`
Paginate until response length < 100 or `max_overdue_listed` is reached.

**Step 3 — Fetch overdue on-hold orders**

Same as Step 2 but `status=on-hold` and `before = now - on_hold_sla_hours`.

**Step 4 — Fetch overdue pending orders**

Same as Step 2 but `status=pending` and `before = now - pending_sla_hours`.

**Step 5 — Compute age**

For each overdue order: `age_hours = (now - date_created) / 3600`

**Step 6 — Format and emit output**

Produce the digest report (see Output Format).

## API Endpoints Used

```
GET  /wp-json/wc/v3/reports/orders/totals   — order counts by status
GET  /wp-json/wc/v3/orders                  — overdue order lists with status+date filters
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
║  SKILL: woo-fulfillment-status-digest    ║
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
║  COMPLETE: woo-fulfillment-status-digest ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-fulfillment-status-digest",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": false
}
```

## Output Format

**Human format digest:**

```
FULFILLMENT STATUS DIGEST — mystore.com — 2025-04-14 09:00 UTC

Order Counts by Status:
  ✅ Completed      1,842
  🔄 Processing       127    ⚠️  23 OVERDUE (>24h)
  ⏸  On Hold           14    ⚠️   6 OVERDUE (>48h)
  ⏳ Pending           31    ⚠️   8 OVERDUE (>12h)
  ❌ Cancelled        203
  🚫 Refunded          89
  🗑  Failed            12

Overdue Processing Orders (top 25):
  Order #  Age      Total     Customer
  ──────────────────────────────────────
  #5821    31h 22m  $142.50   Jane Smith
  #5798    28h 05m  $89.00    Bob Jones
  ...
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid or missing credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Consumer Key lacks required scope | Regenerate key with Read scope |
| `404 Not Found` | Reports endpoint unavailable | Ensure WooCommerce version ≥ 3.5.0 |
| `429 Too Many Requests` | Rate limit hit during pagination | Wait 2 seconds and retry; reduce per_page to 50 |
| Empty overdue list | No orders exceed the SLA threshold | This is normal — your fulfillment is on time |

## Best Practices

- Run this digest at the start of each fulfillment shift for an instant health check.
- Pipe the overdue order IDs into `woo-order-status-bulk-update` or `woo-bulk-order-notes` for follow-up.
- Adjust `processing_sla_hours` to match your actual shipping SLA agreement.
- Schedule this skill to run automatically (e.g., every morning) for proactive alerting.
