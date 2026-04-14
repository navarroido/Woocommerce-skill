---
name: woo-order-lookup-and-summary
role: customer-support
description: "Read-only: Retrieve a WooCommerce order by ID or customer email and produce a human-readable support summary."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders/{id}
  - GET /orders
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-order-lookup-and-summary

## Purpose

Retrieve full details for a WooCommerce order (by order ID or customer email) and format them as a concise support summary. Includes order status, line items, shipping, payment method, notes, and any refunds. Read-only — no data is modified.

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
| `order_id` | int | no | — | WooCommerce order ID (use this or customer_email) |
| `customer_email` | string | no | — | Customer email (returns most recent order) |

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

**Step 1 — Resolve order**

If `order_id` provided:

```
GET /wp-json/wc/v3/orders/{order_id}
```

If `customer_email` provided:

```
GET /wp-json/wc/v3/orders?search=<customer_email>&per_page=5&orderby=date&order=desc
```

Use the first (most recent) result.

**Step 2 — Fetch refunds (if any)**

```
GET /wp-json/wc/v3/orders/{id}/refunds
```

**Step 3 — Format summary**

Produce a structured human-readable summary (see Output Format).

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders/{id}          — fetch order by ID
GET  /wp-json/wc/v3/orders               — search by customer email
GET  /wp-json/wc/v3/orders/{id}/refunds  — refund details
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
║  SKILL: woo-order-lookup-and-summary     ║
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
║  COMPLETE: woo-order-lookup-and-summary  ║
║  RECORDS PROCESSED: 1                    ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-order-lookup-and-summary",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": 1,
  "output_file": null,
  "dry_run": false
}
```

## Output Format

Human format summary block:

```
ORDER SUMMARY — #5821
──────────────────────────────────────────
Customer:   Jane Smith <jane@example.com>
Status:     Processing
Date:       2025-04-12 14:32 UTC (2 days ago)
Payment:    Stripe — paid

Items:
  Leather Wallet (LW-001) × 1      $29.99
  Canvas Tote Blue/L (CT-BL-L) × 2 $39.98
                          Subtotal  $69.97
                              Tax   $6.30
                          Shipping  $0.00
                             TOTAL  $76.27

Shipping to: 123 Main St, Springfield, IL 62701, US
Method:      Flat Rate

Notes: (none)
Refunds: (none)
──────────────────────────────────────────
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `404 Not Found` | Order ID does not exist | Confirm the order ID |
| Empty search result | No orders for this email | Check email spelling; customer may have checked out as guest |

## Best Practices

- Use `order_id` when you have it — it's faster than email search.
- For guest checkouts, the `customer_email` search will still find orders placed with that email.
- The output is designed to be pasted directly into a support ticket or customer reply.
