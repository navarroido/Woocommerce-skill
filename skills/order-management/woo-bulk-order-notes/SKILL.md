---
name: woo-bulk-order-notes
role: order-management
description: "Append a private or customer-visible note to multiple orders matching a status, date, or payment method filter."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - POST /orders/{id}/notes
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-bulk-order-notes

## Purpose

Append an order note — either private (staff-only) or customer-visible — to a filtered set of WooCommerce orders. Useful for documenting batch fulfillment actions, adding tracking information templates, or communicating delays to customers on affected orders.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key with **Read/Write** scope
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `true` | Preview without executing |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `note` | string | yes | — | The note text to append |
| `customer_note` | bool | no | `false` | If true, note is visible to customers and sends email |
| `filter_status` | string | no | — | Filter orders by status |
| `filter_date_after` | string | no | — | Orders created after (`YYYY-MM-DD`) |
| `filter_date_before` | string | no | — | Orders created before (`YYYY-MM-DD`) |
| `filter_payment_method` | string | no | — | Filter by payment method ID |

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

**Step 3 adds notes to orders.** If `customer_note: true`, customers receive an email notification for each note added. Always run with `dry_run: true` first to confirm the affected order count before triggering customer emails.

## Workflow Steps

**Step 1 — Fetch filtered orders**

```
GET /wp-json/wc/v3/orders
  ?per_page=100&page=1
  [&status=<filter_status>]
  [&after=<filter_date_after>]
  [&before=<filter_date_before>]
  [&payment_method=<filter_payment_method>]
```

Extract: `id`, `number`, `billing.email`

**Step 2 — Preview or execute**

If `dry_run: true`: list orders and stop.

If `dry_run: false` and confirmed:

```
POST /wp-json/wc/v3/orders/{id}/notes
  Body: {
    "note": "<note>",
    "customer_note": <customer_note>
  }
```

Sequentially per order. Emit progress after every 20.

## API Endpoints Used

```
GET   /wp-json/wc/v3/orders            — filtered order list
POST  /wp-json/wc/v3/orders/{id}/notes — create note on each order
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
║  SKILL: woo-bulk-order-notes             ║
║  STORE: <store_url>                      ║
║  TIME:  <ISO-8601 UTC>                   ║
║  MODE:  <DRY RUN | LIVE>                 ║
╚══════════════════════════════════════════╝
```

PER-OPERATION (emit after each API call batch):

```
[N/TOTAL] <METHOD> <endpoint> → <result_count> records | params: <key>=<val>
```

COMPLETION (human format):

```
╔══════════════════════════════════════════╗
║  COMPLETE: woo-bulk-order-notes          ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-bulk-order-notes",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: count of orders to receive notes, first 10 order numbers, and the note text to be added.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first. `customer_note: true` triggers customer emails for every order.
- Use private notes (`customer_note: false`) for internal documentation and customer notes only for communications.
- Include the date and operator name in the note for audit trail (e.g., "Fulfillment batch 2025-04-14 — dispatched via DHL").
