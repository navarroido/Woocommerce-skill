---
name: woo-shipping-cost-analysis
role: finance
description: "Read-only: Compare shipping_total collected from customers against configured shipping zone rates to identify pricing gaps."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /shipping/zones
  - GET /shipping/zones/{id}/methods
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-shipping-cost-analysis

## Purpose

Analyze whether the shipping revenue collected on WooCommerce orders (via `shipping_total`) aligns with your shipping zone rate configuration. Identifies zones or methods where shipping is underpriced relative to actual carrier costs, and quantifies the net shipping P&L. Read-only.

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
| `date_after` | string | yes | — | Start date (`YYYY-MM-DD`) |
| `date_before` | string | yes | — | End date (`YYYY-MM-DD`) |

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

**Step 1 — Fetch completed orders**

```
GET /wp-json/wc/v3/orders
  ?status=completed&after=<date_after>T00:00:00Z&before=<date_before>T23:59:59Z&per_page=100&page=1
```

Extract: `id`, `shipping_total`, `shipping_tax`, `shipping_lines[].method_id`, `shipping_lines[].method_title`, `shipping_address.country`

**Step 2 — Fetch shipping zones and methods**

```
GET /wp-json/wc/v3/shipping/zones
```

For each zone: `GET /wp-json/wc/v3/shipping/zones/{id}/methods`

Build map: `method_id → flat_rate cost`

**Step 3 — Aggregate by shipping method**

Group orders by `shipping_lines[].method_id`. For each group: `total_collected = sum(shipping_total)`, `order_count`, `avg_collected`.

**Step 4 — Export analysis**

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders                       — order shipping totals
GET  /wp-json/wc/v3/shipping/zones               — shipping zone list
GET  /wp-json/wc/v3/shipping/zones/{id}/methods  — rates per zone
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
║  SKILL: woo-shipping-cost-analysis       ║
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
║  COMPLETE: woo-shipping-cost-analysis    ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-shipping-cost-analysis",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-shipping-cost-analysis_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`
Columns: `method_id`, `method_title`, `order_count`, `total_shipping_collected`, `avg_shipping_per_order`, `free_shipping_orders`, `configured_flat_rate`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- High `free_shipping_orders` relative to total orders reduces average collected shipping — verify your free shipping threshold is profitable.
- Compare `avg_shipping_per_order` against your actual carrier invoice per shipment for the same period.
- Run quarterly to catch rate drift as carrier prices change.
