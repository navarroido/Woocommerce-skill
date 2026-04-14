---
name: woo-duplicate-sku-detector
role: merchandising
description: "Read-only: Detect duplicate SKUs across simple and variable products and export a conflict report."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - GET /products/{id}/variations
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-duplicate-sku-detector

## Purpose

Scan all WooCommerce products and variations for duplicate SKU values. Duplicate SKUs cause order processing errors, inventory miscounts, and reporting inconsistencies. Exports a conflict report listing every SKU that appears more than once with the product IDs sharing it. Read-only — no products are modified.

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
| `include_variations` | bool | no | `true` | Also scan variation SKUs |
| `include_drafts` | bool | no | `false` | Include draft and private products |

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

**Step 1 — Fetch all products**

```
GET /wp-json/wc/v3/products
  ?status=publish&per_page=100&page=1
  [add status=draft,private if include_drafts: true]
```

Build a map: `sku → [{ product_id, type, name }]`

**Step 2 — Fetch variation SKUs (if include_variations: true)**

For each variable product:

```
GET /wp-json/wc/v3/products/{id}/variations?per_page=100&page=1
```

Add to the same SKU map: `sku → [{ product_id, variation_id, type: "variation", name }]`

**Step 3 — Identify duplicates**

Filter the SKU map to entries where the list has more than one item and the SKU is non-empty.

**Step 4 — Sort by conflict count and export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/products                   — all products
GET  /wp-json/wc/v3/products/{id}/variations   — variation SKUs
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
║  SKILL: woo-duplicate-sku-detector       ║
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
║  COMPLETE: woo-duplicate-sku-detector    ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-duplicate-sku-detector",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-duplicate-sku-detector_<YYYY-MM-DD>.csv`
Columns: `sku`, `conflict_count`, `product_id`, `variation_id`, `product_type`, `product_name`, `product_status`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Run after every product import to catch duplicates introduced by CSV uploads.
- SKUs that are blank/empty are not flagged as duplicates — only non-empty duplicate values are reported.
- Resolve duplicates by editing the SKU in WooCommerce admin (Products → Edit).
