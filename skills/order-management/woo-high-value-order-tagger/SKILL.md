---
name: woo-high-value-order-tagger
role: order-management
description: "Tag orders above a configurable total threshold with a custom meta field for priority handling with dry-run preview."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - PUT /orders/{id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-high-value-order-tagger

## Purpose

Identify WooCommerce orders above a configurable total threshold and write a priority meta field to each, enabling downstream automation (priority pick queues, VIP customer alerts, or special packaging workflows). Can target new incoming orders or backfill existing orders. Includes dry-run preview.

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
| `threshold` | number | yes | — | Order total above which an order is tagged |
| `meta_key` | string | no | `_priority_order` | Meta key to write on high-value orders |
| `meta_value` | string | no | `high_value` | Value to write for the meta key |
| `filter_status` | string | no | `processing` | Order status to scan |
| `filter_date_after` | string | no | — | Only orders after this date (`YYYY-MM-DD`) |
| `skip_already_tagged` | bool | no | `true` | Skip orders already having the meta key set |

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

**Step 3 writes meta_data to orders.** Always run with `dry_run: true` first (the default). This operation is additive and does not change order status or amounts.

## Workflow Steps

**Step 1 — Fetch orders above threshold**

```
GET /wp-json/wc/v3/orders
  ?status=<filter_status>&per_page=100&page=1
  [&after=<filter_date_after>]
```

Filter: keep orders where `total >= threshold`.
If `skip_already_tagged: true`, also filter out orders where `meta_data` contains `meta_key`.

**Step 2 — Preview or execute**

If `dry_run: true`: list qualifying orders. Stop.

If `dry_run: false` and confirmed:

```
PUT /wp-json/wc/v3/orders/{id}
  Body: {
    "meta_data": [{ "key": "<meta_key>", "value": "<meta_value>" }]
  }
```

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders         — filtered order list
PUT  /wp-json/wc/v3/orders/{id}    — write priority meta field
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
║  SKILL: woo-high-value-order-tagger      ║
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
║  COMPLETE: woo-high-value-order-tagger   ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-high-value-order-tagger",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: table of order number, customer, total, and tag applied.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first.
- Set `threshold` based on your store's average order value and margin targets (e.g., 2× AOV).
- Use `skip_already_tagged: true` to safely re-run on the same date without duplicating tags.
- Combine with a WooCommerce webhook to trigger real-time VIP alerts for new high-value orders.
