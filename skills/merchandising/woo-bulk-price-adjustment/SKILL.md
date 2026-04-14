---
name: woo-bulk-price-adjustment
role: merchandising
description: "Adjust prices across products or a category by fixed amount or percentage with min/max guards and dry-run preview before any changes are applied."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - GET /products/{id}
  - PUT /products/{id}
  - POST /products/batch
  - GET /products/{id}/variations
  - POST /products/{id}/variations/batch
  - GET /products/categories
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-bulk-price-adjustment

## Purpose

Adjust the `regular_price` (and optionally `sale_price`) of a filtered set of products by a percentage or fixed amount. Supports filtering by category, tag, product type, or stock status. Includes configurable minimum and maximum price guards to prevent prices going below cost or above a ceiling. Always previews the full change set before executing.

## Prerequisites

- WooCommerce store with REST API enabled (WooCommerce → Settings → Advanced → REST API)
- Consumer Key and Consumer Secret with **Read/Write** scope
- Store accessible over HTTPS
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store (e.g., `https://mystore.com`) |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `true` | Preview changes without executing mutations |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `adjustment_type` | string | yes | — | `percentage` or `fixed` |
| `adjustment_value` | number | yes | — | Amount to adjust. Positive = increase, negative = decrease. For percentage: `-10` means reduce 10%. |
| `category_id` | int | no | — | Limit to products in this category ID |
| `tag_id` | int | no | — | Limit to products with this tag ID |
| `product_type` | string | no | — | `simple`, `variable`, or omit for all |
| `min_price` | number | no | `0` | Do not set any price below this value |
| `max_price` | number | no | — | Do not set any price above this value |
| `apply_to_sale_price` | bool | no | `false` | Also adjust sale_price when set |

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

**Steps 4–5 execute irreversible price mutations.** Always run with `dry_run: true` first (the default) and verify the preview before executing live. The batch update endpoint modifies prices immediately with no undo — take a product export backup beforehand for large catalogs.

## Workflow Steps

**Step 1 — Discover category (if category_id provided)**

```
GET /wp-json/wc/v3/products/categories/{category_id}
```

Extract: `id`, `name` — used to confirm scope in the startup banner.

**Step 2 — Fetch products**

```
GET /wp-json/wc/v3/products
  ?status=publish
  &per_page=100
  &page=1
  [&category=<category_id>]
  [&tag=<tag_id>]
  [&type=<product_type>]
```

Extract per product: `id`, `name`, `type`, `sku`, `regular_price`, `sale_price`
Paginate until response length < 100.

**Step 3 — Fetch variations for variable products**

For each product where `type == "variable"`:

```
GET /wp-json/wc/v3/products/{id}/variations
  ?per_page=100&page=1
```

Extract per variation: `id`, `sku`, `regular_price`, `sale_price`
Paginate until response length < 100.

**Step 4 — Compute new prices**

For each product / variation:

```
if adjustment_type == "percentage":
  new_price = current_price * (1 + adjustment_value / 100)
else:
  new_price = current_price + adjustment_value

new_price = max(new_price, min_price)
if max_price is set:
  new_price = min(new_price, max_price)

new_price = round(new_price, 2)
```

Skip items where `current_price` is empty or `"0"` (gift cards, externally-priced).

**Step 5 — Preview or execute**

If `dry_run: true`: output the preview table (see Output Format) and stop. Do not make any PUT or POST calls.

If `dry_run: false` and user has confirmed the preview:

For simple products — batch update via:

```
POST /wp-json/wc/v3/products/batch
  Body: {
    "update": [
      { "id": <id>, "regular_price": "<new_price>" },
      ...
    ]
  }
```

For variable products — per-product variation batch:

```
POST /wp-json/wc/v3/products/{id}/variations/batch
  Body: {
    "update": [
      { "id": <variation_id>, "regular_price": "<new_price>" },
      ...
    ]
  }
```

Send in batches of 50 to stay within WooCommerce's batch limit. Emit a progress line after each batch.

## API Endpoints Used

```
GET  /wp-json/wc/v3/products/categories/{id}          — verify category exists
GET  /wp-json/wc/v3/products                           — list products with filters
GET  /wp-json/wc/v3/products/{id}                     — fetch single product
POST /wp-json/wc/v3/products/batch                    — bulk update simple product prices
GET  /wp-json/wc/v3/products/{id}/variations          — list variations for variable product
POST /wp-json/wc/v3/products/{id}/variations/batch    — bulk update variation prices
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
║  SKILL: woo-bulk-price-adjustment        ║
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
║  COMPLETE: woo-bulk-price-adjustment     ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename or "stdout">          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-bulk-price-adjustment",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path or null>",
  "dry_run": <bool>
}
```

## Output Format

**Dry-run / preview table (human format):**

```
PREVIEW — 47 products would be updated (DRY RUN)
Adjustment: -10% | Min price: $5.00 | Category: Accessories

  SKU          Name                      Current    New        Δ
  ─────────────────────────────────────────────────────────────
  ACC-001      Leather Wallet            $29.99     $26.99     -$3.00
  ACC-002      Canvas Tote               $19.99     $17.99     -$2.00
  ACC-003-S    Canvas Tote (Small)       $14.99     $13.49     -$1.50
  ...
  ─────────────────────────────────────────────────────────────
  Total products: 47 | Skipped (no price): 2 | Guarded (min): 1
```

**CSV export (when format=csv or for audit trail):**

CSV filename: `woo-bulk-price-adjustment_<YYYY-MM-DD>.csv`
Columns: `product_id`, `variation_id`, `sku`, `name`, `old_price`, `new_price`, `change_amount`, `change_pct`, `guarded`, `skipped`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid or missing credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Consumer Key lacks required scope | Regenerate key with Read/Write scope |
| `404 Not Found` | Category or product ID does not exist | Check the ID |
| `429 Too Many Requests` | Rate limit hit during pagination | Wait 2 seconds and retry; reduce per_page to 50 |
| `woocommerce_rest_*` error in body | WooCommerce validation failure | See `message` field in response JSON |
| Batch returns partial errors | Some products failed to update | Inspect the `errors` array in the batch response |

## Best Practices

- Always run with `dry_run: true` first (it's the default). Confirm the preview before going live.
- Export a WooCommerce product CSV backup before large bulk updates (WooCommerce → Products → Export).
- Use `category_id` or `tag_id` to narrow scope — avoid updating entire catalogs in a single run.
- Set `min_price` to your cost floor to avoid pricing products below cost.
- For sale prices: only set `apply_to_sale_price: true` intentionally — sale prices usually need separate management.
