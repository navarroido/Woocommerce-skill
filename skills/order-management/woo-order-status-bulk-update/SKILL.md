---
name: woo-order-status-bulk-update
role: order-management
description: "Move a filtered set of orders (by date, current status, or payment method) to a new status with dry-run preview."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - PUT /orders/{id}
  - POST /orders/batch
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-order-status-bulk-update

## Purpose

Transition a filtered set of WooCommerce orders from one status to another in bulk. Common uses: mark all processing orders as completed after a fulfillment batch, move stuck pending orders to cancelled, or transition on-hold orders to processing after payment confirmation. Always previews the affected order list before executing.

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
| `source_status` | string | yes | — | Current order status (e.g., `processing`, `on-hold`) |
| `target_status` | string | yes | — | New status to apply |
| `date_before` | string | no | — | Only orders created before this date (`YYYY-MM-DD`) |
| `date_after` | string | no | — | Only orders created after this date (`YYYY-MM-DD`) |
| `payment_method` | string | no | — | Filter by payment method ID (e.g., `stripe`, `paypal`) |
| `add_note` | string | no | — | Private order note to append on status change |

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

**Step 3 changes order statuses.** Status changes trigger WooCommerce hooks (emails, inventory adjustments). Always run with `dry_run: true` first. Transitioning to `completed` sends a completion email to customers.

## Workflow Steps

**Step 1 — Fetch orders matching filters**

```
GET /wp-json/wc/v3/orders
  ?status=<source_status>&per_page=100&page=1
  [&before=<date_before>]
  [&after=<date_after>]
  [&payment_method=<payment_method>]
```

Extract: `id`, `number`, `date_created`, `total`, `billing.email`, `payment_method_title`

**Step 2 — Preview or execute**

If `dry_run: true`: list orders and stop.

If `dry_run: false` and confirmed, use batch endpoint (groups of 50):

```
POST /wp-json/wc/v3/orders/batch
  Body: {
    "update": [
      { "id": <id>, "status": "<target_status>" },
      ...
    ]
  }
```

If `add_note` is set, follow with per-order note updates.

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders          — filtered order list
POST /wp-json/wc/v3/orders/batch    — bulk status update
PUT  /wp-json/wc/v3/orders/{id}     — individual note addition
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
║  SKILL: woo-order-status-bulk-update     ║
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
║  COMPLETE: woo-order-status-bulk-update  ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-order-status-bulk-update",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: table of affected orders with order number, customer, total, current status → new status.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |
| Invalid status transition | WooCommerce doesn't allow this transition | Check WooCommerce order status flow |

## Best Practices

- Always run with `dry_run: true` first (the default). Status changes trigger customer emails.
- Use `add_note` to document the reason for the bulk status change (e.g., "Bulk completed after warehouse confirmation 2025-04-14").
- Process in off-peak hours for large batches — status changes can be resource-intensive on WordPress.
