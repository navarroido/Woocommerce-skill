---
name: woo-product-data-completeness-score
role: merchandising
description: "Read-only: Score each product against a required fields checklist (images, description, weight, SKU, attributes) and export a completeness gap report."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - GET /products/{id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-product-data-completeness-score

## Purpose

Audit every product in your WooCommerce catalog against a configurable completeness checklist and assign a score (0–100). Identifies products missing images, descriptions, weights, SKUs, or other required fields. Exports a prioritized gap report so merchandising teams can systematically improve catalog quality. Read-only — no products are modified.

## Prerequisites

- WooCommerce store with REST API enabled (WooCommerce → Settings → Advanced → REST API)
- Consumer Key and Consumer Secret with **Read** scope
- Store accessible over HTTPS
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | No effect — read-only skill |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `min_images` | int | no | `1` | Minimum image count for a passing score |
| `min_description_chars` | int | no | `100` | Minimum character count for description field |
| `require_sku` | bool | no | `true` | Flag products missing SKU |
| `require_weight` | bool | no | `true` | Flag products missing weight |
| `require_dimensions` | bool | no | `false` | Flag products missing length/width/height |
| `score_threshold` | int | no | `80` | Score below which a product is flagged |
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
GET /wp-json/wc/v3/products
  ?status=<status>&per_page=100&page=1
  [&category=<category_id>]
```

Extract per product: `id`, `name`, `sku`, `description`, `short_description`, `images`, `weight`, `dimensions`, `type`, `categories`, `tags`, `attributes`
Paginate until response length < 100.

**Step 2 — Score each product**

For each product, compute a completeness score (0–100) by checking:
- Has ≥ `min_images` images → 20 points
- `description` length ≥ `min_description_chars` → 20 points
- `short_description` is non-empty → 10 points
- `sku` is non-empty (if `require_sku`) → 20 points
- `weight` is non-empty (if `require_weight`) → 15 points
- `dimensions` (length/width/height) are non-empty (if `require_dimensions`) → 10 points
- Has ≥ 1 category assigned → 5 points

Flag products with score < `score_threshold`.

**Step 3 — Export report**

Sort by score ascending (lowest first). Export CSV.

## API Endpoints Used

```
GET  /wp-json/wc/v3/products           — list all products for audit
GET  /wp-json/wc/v3/products/{id}      — fetch individual product details if needed
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
║  SKILL: woo-product-data-completeness-score║
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
║  COMPLETE: woo-product-data-completeness ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-product-data-completeness-score",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-product-data-completeness-score_<YYYY-MM-DD>.csv`
Columns: `product_id`, `sku`, `name`, `score`, `has_images`, `image_count`, `has_description`, `description_chars`, `has_short_desc`, `has_sku`, `has_weight`, `has_dimensions`, `category_count`, `missing_fields`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid or missing credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Consumer Key lacks Read scope | Regenerate key with Read scope |
| `429 Too Many Requests` | Rate limit during pagination | Wait 2 seconds and retry; reduce per_page to 50 |
| Empty result | No products match filters | Check status and category_id parameters |

## Best Practices

- Run after every catalog import to catch products with missing data.
- Sort the CSV by score ascending and assign the lowest-scoring products as a weekly cleanup sprint.
- Set `min_description_chars: 200` for SEO-focused audits (100 chars is below recommended SEO length).
- Combine with `woo-seo-metadata-audit` for a full catalog quality assessment.
