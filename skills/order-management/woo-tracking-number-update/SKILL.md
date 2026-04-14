---
name: woo-tracking-number-update
role: order-management
description: "Set or update tracking number and shipping provider meta on WooCommerce fulfilled orders with dry-run preview."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders/{id}
  - PUT /orders/{id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-tracking-number-update

## Purpose

Set or update tracking number and shipping provider information on WooCommerce orders, stored as `meta_data` fields compatible with popular tracking plugins (WooCommerce Shipment Tracking, TrackShip, AfterShip). Optionally add a customer-visible note with tracking details and transition the order to `completed` status.

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
| `tracking_updates` | array | yes | — | List of `{ "order_id": N, "tracking_number": "...", "provider": "UPS" }` |
| `mark_completed` | bool | no | `false` | Also set order status to completed |
| `add_customer_note` | bool | no | `true` | Add customer-visible note with tracking details |
| `meta_key_tracking_number` | string | no | `_wc_shipment_tracking_items` | Meta key for tracking number (plugin-specific) |

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

**Step 2 writes tracking data and optionally changes order status.** If `mark_completed: true`, this triggers a completion email. If `add_customer_note: true`, customers receive a note email. Always run with `dry_run: true` first.

## Workflow Steps

**Step 1 — Fetch each order**

```
GET /wp-json/wc/v3/orders/{order_id}
```

Verify order exists and is in `processing` status. Extract current `meta_data`.

**Step 2 — Preview or execute**

If `dry_run: true`: list orders and proposed tracking data. Stop.

If `dry_run: false` and confirmed:

```
PUT /wp-json/wc/v3/orders/{id}
  Body: {
    "meta_data": [
      { "key": "_wc_shipment_tracking_items", "value": <tracking_payload> }
    ],
    "status": "completed"  // if mark_completed: true
  }
```

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders/{id}   — fetch order details
PUT  /wp-json/wc/v3/orders/{id}   — write tracking meta and optional status
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
║  SKILL: woo-tracking-number-update       ║
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
║  COMPLETE: woo-tracking-number-update    ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-tracking-number-update",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: table of order number, customer email, tracking number, provider, and whether status was changed.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `404 Not Found` | Order ID does not exist | Verify order ID |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first.
- Check the `meta_key_tracking_number` field matches your installed tracking plugin's expected meta key.
- If your store uses AfterShip or TrackShip plugin, confirm the meta key format required by that plugin.
- Use `mark_completed: true` only when your warehouse confirms dispatch — this triggers the customer completion email.
