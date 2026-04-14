---
name: woo-seo-metadata-audit
role: merchandising
description: "Read-only: Scan products and categories for missing or short SEO titles and meta descriptions and export a prioritized gap report."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - GET /products/categories
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-seo-metadata-audit

## Purpose

Identify WooCommerce products and categories missing SEO meta titles or meta descriptions, or where these fields are shorter than recommended lengths. Exports a prioritized gap report for SEO improvement. Checks for Yoast SEO, RankMath, and All in One SEO field naming conventions stored in `meta_data`. Read-only — no data is modified.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key with **Read** scope
- An SEO plugin (Yoast, RankMath, or AIOSEO) is recommended but not required
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | No effect — read-only skill |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `min_title_chars` | int | no | `30` | Minimum SEO title length |
| `max_title_chars` | int | no | `60` | Maximum SEO title length (flag if over) |
| `min_description_chars` | int | no | `120` | Minimum meta description length |
| `max_description_chars` | int | no | `160` | Maximum meta description length |
| `include_categories` | bool | no | `true` | Also audit product categories |
| `seo_plugin` | string | no | `yoast` | SEO plugin: `yoast`, `rankmath`, or `aioseo` |

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

**Step 1 — Fetch all published products**

```
GET /wp-json/wc/v3/products?status=publish&per_page=100&page=1
```

Extract: `id`, `name`, `sku`, `meta_data`

**Step 2 — Extract SEO meta from meta_data**

SEO field key names by plugin:

| Plugin | Title key | Description key |
|--------|-----------|-----------------|
| Yoast | `_yoast_wpseo_title` | `_yoast_wpseo_metadesc` |
| RankMath | `rank_math_title` | `rank_math_description` |
| AIOSEO | `_aioseo_title` | `_aioseo_description` |

Fall back to the product `name` as title and `short_description` as description if SEO fields are absent.

**Step 3 — Score each product**

Flag if:
- SEO title is absent or length < `min_title_chars`
- SEO title length > `max_title_chars`
- SEO description is absent or length < `min_description_chars`
- SEO description length > `max_description_chars`

**Step 4 — Audit categories (if include_categories: true)**

```
GET /wp-json/wc/v3/products/categories?per_page=100&page=1
```

Apply same scoring to category `name` and `description` fields.

**Step 5 — Sort and export**

Sort by number of issues descending.

## API Endpoints Used

```
GET  /wp-json/wc/v3/products              — product list with meta_data
GET  /wp-json/wc/v3/products/categories   — category list
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
║  SKILL: woo-seo-metadata-audit           ║
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
║  COMPLETE: woo-seo-metadata-audit        ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-seo-metadata-audit",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-seo-metadata-audit_<YYYY-MM-DD>.csv`
Columns: `type`, `id`, `sku`, `name`, `seo_title`, `seo_title_length`, `seo_description`, `seo_description_length`, `title_issue`, `description_issue`, `issue_count`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |
| No SEO meta found | SEO plugin not installed or fields not set | Install Yoast/RankMath and set meta on products |

## Best Practices

- Set `seo_plugin` to match the plugin installed on your store for accurate field extraction.
- Prioritize products with zero SEO meta set over those with short meta — missing fields have more impact.
- Run monthly as part of an SEO maintenance routine.
- Combine with `woo-product-data-completeness-score` for a full catalog quality check.
