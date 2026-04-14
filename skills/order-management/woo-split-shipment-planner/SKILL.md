---
name: woo-split-shipment-planner
role: order-management
description: "Read-only: Identify orders with mixed in-stock and backordered items to plan split shipments."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /products
  - GET /products/{id}/variations
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-split-shipment-planner

## Purpose

Find WooCommerce processing orders that contain a mix of in-stock and out-of-stock/backordered items. For each such order, identify which items can ship now versus which must wait. Exports a split-shipment plan so fulfillment teams can send partial shipments immediately. Read-only — no orders are modified.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key with **Read** scope
- Stock management must be enabled per product
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | No effect — read-only skill |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `order_status` | string | no | `processing` | Order status to scan |

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

**Step 1 — Fetch processing orders**

```
GET /wp-json/wc/v3/orders?status=<order_status>&per_page=100&page=1
```

Extract per order: `id`, `number`, `line_items[].product_id`, `line_items[].variation_id`, `line_items[].quantity`, `line_items[].name`

**Step 2 — Fetch current stock for each product/variation in line items**

For each unique `product_id`:

```
GET /wp-json/wc/v3/products/{id}
```

For variation IDs:

```
GET /wp-json/wc/v3/products/{id}/variations/{variation_id}
```

Extract: `stock_quantity`, `stock_status`, `manage_stock`

**Step 3 — Classify each order**

For each order: compare line item quantities against available stock.
- Items where `stock_quantity >= line_item.quantity` → can ship now
- Items where `stock_quantity < line_item.quantity` → backorder

Flag orders with at least one shippable and one non-shippable item as split-shipment candidates.

**Step 4 — Export plan**

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders                              — processing orders
GET  /wp-json/wc/v3/products/{id}                       — product stock
GET  /wp-json/wc/v3/products/{id}/variations            — variation stock
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
║  SKILL: woo-split-shipment-planner       ║
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
║  COMPLETE: woo-split-shipment-planner    ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-split-shipment-planner",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-split-shipment-planner_<YYYY-MM-DD>.csv`
Columns: `order_id`, `order_number`, `customer_email`, `product_id`, `variation_id`, `product_name`, `ordered_qty`, `in_stock_qty`, `can_ship_now`, `backorder_qty`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Run daily during high-volume periods to proactively identify partial fulfillment opportunities.
- Share the export with your fulfillment team grouped by order number.
- Contact customers before splitting — some prefer to wait for a complete shipment.
