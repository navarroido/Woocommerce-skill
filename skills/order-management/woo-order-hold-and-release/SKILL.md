---
name: woo-order-hold-and-release
role: order-management
description: "Set orders to on-hold status with a timestamped note and bulk-release them back to processing when ready."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - PUT /orders/{id}
  - POST /orders/batch
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-order-hold-and-release

## Purpose

Place a set of WooCommerce orders into `on-hold` status (with a timestamped reason note) or bulk-release them back to `processing`. Common uses: hold orders pending fraud review, payment verification, or stock availability, then release them when cleared. Includes dry-run preview.

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
| `action` | string | yes | — | `hold` or `release` |
| `order_ids` | array | no | — | Specific order IDs (if not using filters) |
| `filter_status` | string | no | `processing` | For `hold`: filter orders in this status |
| `hold_reason` | string | no | `Order held for review` | Reason added as private note |
| `release_target_status` | string | no | `processing` | Status to set when releasing held orders |

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

**Step 3 changes order status.** Always run with `dry_run: true` first (the default). Review the affected order list before holding or releasing.

## Workflow Steps

**Step 1 — Resolve order list**

If `order_ids` provided: fetch each directly.

Otherwise:

```
GET /wp-json/wc/v3/orders?status=<filter_status>&per_page=100&page=1
```

For `action: release`: fetch orders with `status=on-hold`.

**Step 2 — Preview or execute**

If `dry_run: true`: list orders. Stop.

If `dry_run: false` and confirmed, use batch:

```
POST /wp-json/wc/v3/orders/batch
  Body: {
    "update": [
      { "id": <id>, "status": "on-hold" }  // for hold
      // OR
      { "id": <id>, "status": "<release_target_status>" }  // for release
    ]
  }
```

## API Endpoints Used

```
GET   /wp-json/wc/v3/orders          — filtered order list
POST  /wp-json/wc/v3/orders/batch    — bulk status update
PUT   /wp-json/wc/v3/orders/{id}     — add hold reason note
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
║  SKILL: woo-order-hold-and-release       ║
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
║  COMPLETE: woo-order-hold-and-release    ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-order-hold-and-release",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: table of order number, customer, total, and new status.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first.
- Include a specific `hold_reason` for audit purposes (e.g., "Held pending fraud review 2025-04-14").
- Pair with `woo-fulfillment-status-digest` to monitor how many orders are accumulating in on-hold.
