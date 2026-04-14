---
name: woo-inventory-adjustment
role: merchandising
description: "Set or increment stock quantities for one or many SKUs via the REST API with dry-run preview before any stock changes are applied."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
  - PUT /products/{id}
  - GET /products/{id}/variations
  - PUT /products/{id}/variations/{variation_id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-inventory-adjustment

## Purpose

Directly set or increment/decrement stock quantities for one or many WooCommerce products or variations identified by SKU or product ID. Useful for manual stock corrections, receiving shipments, or bulk adjustments after a physical stocktake. Includes dry-run preview before any changes are applied.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key and Consumer Secret with **Read/Write** scope
- Store accessible over HTTPS
- Stock management must be enabled per-product (`manage_stock: true`)
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `true` | Preview changes without executing |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `adjustments` | array | yes | — | List of `{ "sku": "SKU-001", "mode": "set", "quantity": 50 }` or `{ "sku": "SKU-001", "mode": "increment", "quantity": 10 }` |
| `mode` | string | no | `set` | Default mode: `set` (absolute) or `increment` (relative) |

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

**Step 3 writes stock quantities directly.** Always run with `dry_run: true` first (the default). Verify the before/after quantities in the preview — incorrect quantities affect order fulfillment and overselling protection.

## Workflow Steps

**Step 1 — Resolve SKUs to product/variation IDs**

```
GET /wp-json/wc/v3/products?sku=<sku>&per_page=10
```

If not found as a simple product, check variations:

```
GET /wp-json/wc/v3/products?per_page=100&page=1
```

Then for variable products:

```
GET /wp-json/wc/v3/products/{id}/variations?sku=<sku>&per_page=10
```

Extract: `id`, `sku`, `stock_quantity`, `manage_stock`, `type`

**Step 2 — Compute new quantities**

For each adjustment entry:
- `mode: set` → `new_qty = quantity`
- `mode: increment` → `new_qty = current_stock_quantity + quantity`

Flag any item where `manage_stock == false` (stock not tracked — cannot be adjusted via API).

**Step 3 — Preview or execute**

If `dry_run: true`: emit the before/after table and stop.

If `dry_run: false` and confirmed:

For simple products:

```
PUT /wp-json/wc/v3/products/{id}
  Body: { "stock_quantity": <new_qty> }
```

For variations:

```
PUT /wp-json/wc/v3/products/{product_id}/variations/{variation_id}
  Body: { "stock_quantity": <new_qty> }
```

## API Endpoints Used

```
GET  /wp-json/wc/v3/products                                  — resolve SKU to product ID
GET  /wp-json/wc/v3/products/{id}/variations                  — resolve SKU to variation ID
PUT  /wp-json/wc/v3/products/{id}                             — update simple product stock
PUT  /wp-json/wc/v3/products/{id}/variations/{variation_id}   — update variation stock
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
║  SKILL: woo-inventory-adjustment         ║
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
║  COMPLETE: woo-inventory-adjustment      ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename or "stdout">          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-inventory-adjustment",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path or null>",
  "dry_run": <bool>
}
```

## Output Format

Preview / completion table (human format):

```
INVENTORY ADJUSTMENT PREVIEW (DRY RUN)

  SKU          Product              Before   Mode        After
  ──────────────────────────────────────────────────────────
  LW-001       Leather Wallet         12     set 50        50
  CT-BL-L      Canvas Tote Blue/L      8     +20           28
  SS-M         Silver Sunglasses M     0     set 30        30
  ──────────────────────────────────────────────────────────
  ⚠️  SKU-999: not found — skipped
```

CSV filename: `woo-inventory-adjustment_<YYYY-MM-DD>.csv`
Columns: `product_id`, `variation_id`, `sku`, `name`, `old_quantity`, `mode`, `adjustment_value`, `new_quantity`, `manage_stock`, `skipped`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| SKU not found | SKU does not exist in catalog | Verify SKU spelling; check both products and variations |
| `manage_stock: false` | Product not tracking stock | Enable stock management per product in WooCommerce admin |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first (the default). Confirm before/after quantities carefully.
- For large stocktakes, prepare the `adjustments` array as a CSV and convert to JSON before passing.
- After adjustment, verify in WooCommerce admin (Products → Stock) that quantities are correct.
- Enable stock management on all products before using this skill — products with `manage_stock: false` cannot be adjusted.
