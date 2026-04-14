---
name: woo-cancel-and-restock
role: order-management
description: "Cancel one or many WooCommerce orders and restore stock quantities for all line items with dry-run preview."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /orders/{id}
  - PUT /orders/{id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-cancel-and-restock

## Purpose

Cancel one or many WooCommerce orders and automatically restore the stock quantities for all line items. Useful for fraudulent orders, duplicate orders, or bulk cancellations when a product batch is unavailable. Includes dry-run preview listing all affected orders and stock restores.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key with **Read/Write** scope
- Orders must be in a cancellable state (`pending`, `on-hold`, `processing`)
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `true` | Preview without executing |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `order_ids` | array | no | — | Specific order IDs to cancel (if not using filters) |
| `filter_status` | string | no | `on-hold` | Cancel all orders with this status (if not using order_ids) |
| `filter_date_before` | string | no | — | Only orders before this date (`YYYY-MM-DD`) |
| `restock` | bool | no | `true` | Restore stock for cancelled line items |
| `cancellation_note` | string | no | `Order cancelled in bulk` | Private note added to each cancelled order |

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

**Step 3 cancels orders — this is irreversible.** Always run with `dry_run: true` first (the default). Cancellation triggers a customer cancellation email. `restock: true` returns items to inventory.

## Workflow Steps

**Step 1 — Resolve order list**

If `order_ids` provided: fetch each via `GET /wp-json/wc/v3/orders/{id}`.

If using filters:

```
GET /wp-json/wc/v3/orders
  ?status=<filter_status>&per_page=100&page=1
  [&before=<filter_date_before>]
```

Validate each: status must be `pending`, `on-hold`, or `processing`.

**Step 2 — Preview or execute**

If `dry_run: true`: list orders, total value, and stock to be restored. Stop.

If `dry_run: false` and confirmed:

```
PUT /wp-json/wc/v3/orders/{id}
  Body: { "status": "cancelled" }
```

Note: WooCommerce handles stock restock automatically when orders are cancelled if `woocommerce_manage_stock` is enabled. Set `restock: true` in the request context.

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders        — filter orders
GET  /wp-json/wc/v3/orders/{id}   — fetch specific orders
PUT  /wp-json/wc/v3/orders/{id}   — cancel order
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
║  SKILL: woo-cancel-and-restock           ║
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
║  COMPLETE: woo-cancel-and-restock        ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-cancel-and-restock",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: table of order number, customer, total, items restocked, and cancellation note.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| Invalid status | Order already completed or refunded | Cannot cancel — must refund instead |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first. Cancellations are permanent.
- For completed orders that need reversal, use `woo-refund-and-reorder` instead.
- Set a meaningful `cancellation_note` for your records (e.g., "Bulk cancel: product recall batch A").
