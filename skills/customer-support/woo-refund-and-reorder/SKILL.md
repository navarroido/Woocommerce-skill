---
name: woo-refund-and-reorder
role: customer-support
description: "Process a full or partial refund on a WooCommerce order and optionally create a replacement order for the customer."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders/{id}
  - POST /orders/{id}/refunds
  - GET /orders
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-refund-and-reorder

## Purpose

Process a full or line-item-level partial refund on a specified WooCommerce order, optionally restock the refunded items, and optionally create a replacement order. Includes a dry-run preview of the refund amount before any money movement occurs.

## Prerequisites

- WooCommerce store with REST API enabled (WooCommerce → Settings → Advanced → REST API)
- Consumer Key and Consumer Secret with **Read/Write** scope
- Store accessible over HTTPS
- Payment gateway must support API refunds (most do; cash-on-delivery does not)
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store (e.g., `https://mystore.com`) |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `true` | Preview refund amount without executing |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `order_id` | int | yes | — | WooCommerce order ID to refund |
| `refund_type` | string | no | `full` | `full` or `partial` |
| `line_items` | array | no | — | For partial refunds: `[{ "id": <line_item_id>, "quantity": N, "refund_total": "N.NN" }]` |
| `reason` | string | no | `Customer request` | Reason for the refund (added as order note) |
| `restock_items` | bool | no | `true` | Return stock quantities for refunded items |
| `create_replacement` | bool | no | `false` | Create a new order copying the original's items |
| `api_refund` | bool | no | `true` | Attempt refund via payment gateway API (vs manual) |

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

**Step 3 initiates a financial refund transaction.** This is irreversible once the gateway processes it. Always run with `dry_run: true` first (the default) and confirm the refund amount and line items. Verify the order status is `processing` or `completed` before proceeding — refunding a `cancelled` or already-`refunded` order will fail.

## Workflow Steps

**Step 1 — Fetch the order**

```
GET /wp-json/wc/v3/orders/{order_id}
```

Extract: `id`, `number`, `status`, `total`, `total_tax`, `shipping_total`, `payment_method`, `payment_method_title`, `billing`, `line_items`, `tax_lines`, `shipping_lines`, `date_created`

Validate:
- Order status must be `processing` or `completed`
- If status is `refunded` or `cancelled`, abort with a message
- `total` must be > 0

**Step 2 — Compute refund amount**

For `refund_type == "full"`:

```
refund_amount = order.total
refund_line_items = all line_items with full quantity and subtotal
```

For `refund_type == "partial"`:

```
refund_amount = sum of line_items[i].refund_total
```

Validate: `refund_amount <= order.total`

**Step 3 — Preview or execute**

If `dry_run: true`: emit the refund summary table and stop.

If `dry_run: false` and user has confirmed:

```
POST /wp-json/wc/v3/orders/{order_id}/refunds
  Body: {
    "amount": "<refund_amount>",
    "reason": "<reason>",
    "line_items": [ { "id": <id>, "quantity": N, "refund_total": "N.NN" } ],
    "restock_items": <restock_items>,
    "api_refund": <api_refund>
  }
```

**Step 4 — Create replacement order (optional)**

If `create_replacement: true` and refund succeeded:

```
POST /wp-json/wc/v3/orders
  Body: {
    "customer_id": <original.customer_id>,
    "billing": <original.billing>,
    "shipping": <original.shipping>,
    "line_items": <original.line_items mapped to product_id + quantity>,
    "payment_method": <original.payment_method>,
    "payment_method_title": <original.payment_method_title>,
    "customer_note": "Replacement for order #<original_number>"
  }
```

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders/{id}          — fetch order details
POST /wp-json/wc/v3/orders/{id}/refunds  — create the refund record
POST /wp-json/wc/v3/orders               — create replacement order (optional)
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
║  SKILL: woo-refund-and-reorder           ║
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
║  COMPLETE: woo-refund-and-reorder        ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-refund-and-reorder",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": 1,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

**Dry-run preview (human format):**

```
REFUND PREVIEW — Order #5821 (DRY RUN)

  Order:     #5821 — Jane Smith <jane@example.com>
  Status:    processing
  Created:   2025-04-12 14:32 UTC
  Payment:   Stripe (stripe)

  Refund Type: FULL
  ─────────────────────────────────────────────────
  Item                       Qty   Unit     Subtotal
  Leather Wallet              1    $29.99    $29.99
  Canvas Tote (Blue/Large)    2    $19.99    $39.98
  ─────────────────────────────────────────────────
  Subtotal:                               $69.97
  Tax:                                     $6.30
  Shipping:                                $0.00
  TOTAL REFUND:                           $76.27
  ─────────────────────────────────────────────────
  Restock items: YES
  Gateway refund: YES (Stripe)
  Reason: Damaged in transit
```

**Post-execution summary:**

```
✅ Refund processed — Order #5821
  Refund ID:     4,891
  Amount:        $76.27
  Gateway:       Stripe — transaction ID txn_3PqXm2...
  Items restocked: 3 units
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid or missing credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Consumer Key lacks Read/Write scope | Regenerate key with Read/Write scope |
| `404 Not Found` | Order ID does not exist | Confirm the order ID |
| `woocommerce_rest_invalid_order_status` | Order is not in a refundable state | Confirm order is `processing` or `completed` |
| `woocommerce_rest_refund_total_invalid` | Refund amount exceeds order total | Reduce refund amount |
| Gateway API error | Payment gateway declined the refund | Process manually via gateway dashboard |

## Best Practices

- Always run with `dry_run: true` first (the default). Confirm amount and line items before proceeding.
- For partial refunds, confirm the `line_item id` values from the order detail — these are different from product IDs.
- Set `restock_items: true` unless the items are damaged and cannot be resold.
- Add a meaningful `reason` — it appears as an order note visible in WooCommerce admin.
- For cash/cheque payment methods, set `api_refund: false` — gateway API refund will not apply.
