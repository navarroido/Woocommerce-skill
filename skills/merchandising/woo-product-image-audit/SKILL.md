---
name: woo-product-image-audit
role: merchandising
description: "Read-only: Identify products with no images, fewer images than threshold, or images missing alt text."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-product-image-audit

## Purpose

Scan all WooCommerce products to identify those missing product images, with fewer than a minimum image count, or with images that have empty alt text. Exports a gap report for the media team to address. Read-only — no products or images are modified.

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
| `min_images` | int | no | `1` | Minimum number of images required |
| `require_alt_text` | bool | no | `true` | Flag images with empty alt attribute |
| `category_id` | int | no | — | Limit audit to this category |
| `status` | string | no | `publish` | Product status to audit |

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

**Step 1 — Fetch products**

```
GET /wp-json/wc/v3/products?status=<status>&per_page=100&page=1
  [&category=<category_id>]
```

Extract per product: `id`, `name`, `sku`, `images[].id`, `images[].src`, `images[].alt`
Paginate until response length < 100.

**Step 2 — Evaluate each product**

For each product:
- Count total images
- Flag if `len(images) == 0` → missing all images
- Flag if `len(images) < min_images` → below minimum
- Flag images where `alt == ""` if `require_alt_text: true`

**Step 3 — Sort by severity and export**

Severity order: no images > below minimum > missing alt text.

## API Endpoints Used

```
GET  /wp-json/wc/v3/products   — product list with image data
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
║  SKILL: woo-product-image-audit          ║
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
║  COMPLETE: woo-product-image-audit       ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-product-image-audit",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-product-image-audit_<YYYY-MM-DD>.csv`
Columns: `product_id`, `sku`, `name`, `image_count`, `missing_images`, `below_minimum`, `images_missing_alt`, `issue_summary`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Run after bulk product imports to catch products with no images assigned.
- For SEO: all images should have descriptive alt text for accessibility and image search indexing.
- Prioritize products with zero images — they have the highest conversion impact.
