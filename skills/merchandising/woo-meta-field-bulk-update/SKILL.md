---
name: woo-meta-field-bulk-update
role: merchandising
description: "Add or update a WooCommerce meta_data field across a filtered product set with dry-run preview."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - PUT /products/{id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-meta-field-bulk-update

## Purpose

Set or update a single `meta_data` key-value pair across a bulk-filtered set of WooCommerce products. Useful for adding custom fields (warranty period, supplier code, origin country) or updating plugin-specific meta values in bulk. Includes dry-run preview before any updates.

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
| `dry_run` | bool | no | `true` | Preview changes without executing |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `meta_key` | string | yes | — | The meta_data key to set (e.g., `_supplier_code`) |
| `meta_value` | string | yes | — | The value to set for the key |
| `filter_category_id` | int | no | — | Limit to products in this category |
| `filter_tag_id` | int | no | — | Limit to products with this tag |
| `filter_status` | string | no | `publish` | Product status to filter |
| `only_if_missing` | bool | no | `false` | Only write if the key doesn't already have a value |

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

**Step 3 writes meta_data fields.** Always run with `dry_run: true` first (the default). Overwriting existing meta values may affect plugin behavior — confirm the `meta_key` is correct before proceeding.

## Workflow Steps

**Step 1 — Fetch filtered products**

```
GET /wp-json/wc/v3/products
  ?status=<filter_status>&per_page=100&page=1
  [&category=<filter_category_id>]
  [&tag=<filter_tag_id>]
```

Extract: `id`, `name`, `sku`, `meta_data`

**Step 2 — Evaluate meta_data**

For each product, check if `meta_key` already exists in `meta_data`.
If `only_if_missing: true`, skip products where the key already has a value.

**Step 3 — Preview or execute**

If `dry_run: true`: output preview table and stop.

If `dry_run: false` and confirmed:

```
PUT /wp-json/wc/v3/products/{id}
  Body: { "meta_data": [{ "key": "<meta_key>", "value": "<meta_value>" }] }
```

## API Endpoints Used

```
GET  /wp-json/wc/v3/products         — filtered product list
PUT  /wp-json/wc/v3/products/{id}    — write meta_data field
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
║  SKILL: woo-meta-field-bulk-update       ║
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
║  COMPLETE: woo-meta-field-bulk-update    ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-meta-field-bulk-update",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: table of product ID, SKU, name, previous meta value, and new value.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first (the default).
- Use `only_if_missing: true` to safely add a field without overwriting existing values.
- Prefix custom meta keys with an underscore (`_`) to mark them as hidden in standard WP admin views.
- Document all custom meta keys used across skills in your team's catalog operations guide.
