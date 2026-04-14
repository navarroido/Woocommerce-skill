---
name: woo-return-initiation
role: customer-support
description: "Update order status to returned/refunded and log a timestamped note with return reason."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders/{id}
  - PUT /orders/{id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-return-initiation

## Purpose

Mark a WooCommerce order as returned by updating its status to `refunded` (or a custom return status) and adding a timestamped private note with the return reason and method. Use this for in-store returns, mail-back returns, or any non-API-refund return scenario. For financial refunds, use `woo-refund-and-reorder` instead.

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
| `order_id` | int | yes | — | WooCommerce order ID |
| `return_reason` | string | yes | — | Reason for the return (stored in order note) |
| `return_method` | string | no | `mail` | Return method: `mail`, `in_store`, `courier` |
| `target_status` | string | no | `refunded` | Status to set: `refunded` or a custom status slug |
| `restock_items` | bool | no | `false` | Return stock quantities for returned items |

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

**Step 2 changes order status.** Always run with `dry_run: true` first. Setting `restock_items: true` restores stock — only do this if the returned items are resaleable.

## Workflow Steps

**Step 1 — Fetch order**

```
GET /wp-json/wc/v3/orders/{order_id}
```

Validate status is `completed` or `processing` (returns initiate from these states).

**Step 2 — Preview or execute**

If `dry_run: true`: display order summary and proposed status change. Stop.

If `dry_run: false` and confirmed:

```
PUT /wp-json/wc/v3/orders/{order_id}
  Body: {
    "status": "<target_status>",
    "meta_data": [
      { "key": "_return_reason", "value": "<return_reason>" },
      { "key": "_return_method", "value": "<return_method>" },
      { "key": "_return_initiated_at", "value": "<ISO-8601>" }
    ]
  }
```

Then add a private order note:

```
POST /wp-json/wc/v3/orders/{order_id}/notes
  Body: {
    "note": "Return initiated: <return_reason> | Method: <return_method> | <ISO-8601>",
    "customer_note": false
  }
```

## API Endpoints Used

```
GET   /wp-json/wc/v3/orders/{id}         — fetch order details
PUT   /wp-json/wc/v3/orders/{id}         — update status and meta
POST  /wp-json/wc/v3/orders/{id}/notes   — add return note
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
║  SKILL: woo-return-initiation            ║
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
║  COMPLETE: woo-return-initiation         ║
║  RECORDS PROCESSED: 1                    ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-return-initiation",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": 1,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: order summary with current status, proposed status, return reason, and method.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `404 Not Found` | Order ID does not exist | Confirm the order ID |
| Invalid status | Order already cancelled or refunded | Verify current order status |

## Best Practices

- Always run with `dry_run: true` first.
- For orders where a financial refund is also needed: use `woo-refund-and-reorder` which handles the payment gateway refund.
- Set `restock_items: true` only after physically inspecting returned goods.
