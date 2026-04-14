---
name: woo-coupon-discount-impact
role: finance
description: "Read-only: Quantify total discount value applied per coupon code over a specified period."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /coupons
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-coupon-discount-impact

## Purpose

Aggregate the total discount value applied by each coupon code across WooCommerce orders in a specified date range. Quantifies revenue foregone per coupon, order attach rate, and average discount per use. Read-only.

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
| `min_uses` | int | no | `1` | Only report coupons used at least this many times |

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

**Step 1 — Fetch completed orders in range**

```
GET /wp-json/wc/v3/orders
  ?status=completed&after=<date_after>T00:00:00Z&before=<date_before>T23:59:59Z&per_page=100&page=1
```

For each order, extract `coupon_lines[]`: `code`, `discount`, `discount_tax`.

**Step 2 — Fetch coupon metadata**

```
GET /wp-json/wc/v3/coupons?per_page=100&page=1
```

Enrich each coupon code with `discount_type`, `amount`, `usage_count`, `expiry_date`.

**Step 3 — Aggregate by coupon code**

For each coupon code seen in orders:
- `order_count` — distinct orders using this code
- `total_discount` — sum of `coupon_lines[].discount`
- `avg_discount_per_order` — total_discount / order_count
- `total_discount_tax` — sum of `coupon_lines[].discount_tax`

**Step 4 — Sort and export**

Sort by `total_discount` descending. Apply `min_uses` filter.

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders    — coupon_lines from completed orders
GET  /wp-json/wc/v3/coupons   — coupon metadata (type, configured amount)
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
║  SKILL: woo-coupon-discount-impact       ║
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
║  COMPLETE: woo-coupon-discount-impact    ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-coupon-discount-impact",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-coupon-discount-impact_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`
Columns: `coupon_code`, `discount_type`, `configured_amount`, `order_count`, `total_discount`, `avg_discount_per_order`, `total_discount_tax`, `usage_count_lifetime`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Compare `configured_amount` to `avg_discount_per_order` — percentage coupons on high-AOV orders can exceed intended discount budgets.
- Track `total_discount` as a percentage of gross revenue for the same period to measure overall promotional spend.
- Run monthly to detect coupon codes that are being shared or used beyond their intended audience.
