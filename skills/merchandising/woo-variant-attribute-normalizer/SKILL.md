---
name: woo-variant-attribute-normalizer
role: merchandising
description: "Read-only: Find product variations where attribute values are inconsistently cased or spelled, and export a normalization report."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - GET /products/{id}/variations
  - GET /products/attributes
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-variant-attribute-normalizer

## Purpose

Identify WooCommerce variable products where variation attribute values are inconsistently cased or spelled — e.g., "Blue", "blue", "BLUE" used interchangeably for the same color attribute. These inconsistencies break filtering, cause duplicate options in the product page, and create inventory reporting errors. Exports a normalization report. Read-only — no data is modified.

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
| `case_sensitive` | bool | no | `true` | Flag case-only differences (e.g. "Blue" vs "blue") |
| `category_id` | int | no | — | Limit to products in this category |

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

**Step 1 — Fetch all variable products**

```
GET /wp-json/wc/v3/products?type=variable&status=publish&per_page=100&page=1
```

**Step 2 — Fetch variations for each variable product**

```
GET /wp-json/wc/v3/products/{id}/variations?per_page=100&page=1
```

Extract per variation: `id`, `attributes[].name`, `attributes[].option`

**Step 3 — Detect inconsistencies per attribute**

For each product, group variation attribute values by attribute name. If `case_sensitive: true`, flag attribute names where the same normalized (lowercased, trimmed) value appears in multiple different raw forms.

**Step 4 — Export conflicts**

## API Endpoints Used

```
GET  /wp-json/wc/v3/products                   — variable products
GET  /wp-json/wc/v3/products/{id}/variations   — variation attributes
GET  /wp-json/wc/v3/products/attributes        — global attribute definitions
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
║  SKILL: woo-variant-attribute-normalizer ║
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
║  COMPLETE: woo-variant-attribute-normalizer║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-variant-attribute-normalizer",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-variant-attribute-normalizer_<YYYY-MM-DD>.csv`
Columns: `product_id`, `product_name`, `attribute_name`, `conflicting_values`, `suggested_canonical`, `variation_ids_affected`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Run after bulk variation imports — CSV imports commonly introduce casing inconsistencies.
- Resolve conflicts by editing each variation in WooCommerce admin and picking a canonical value.
- Establish a style guide for attribute values before creating new products (e.g., always use title case for colors).
