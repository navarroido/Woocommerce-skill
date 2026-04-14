---
name: woo-coupon-bulk-generator
role: marketing
description: "Create N unique coupon codes with configurable discount type, amount, and expiry date with dry-run preview."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - POST /coupons
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-coupon-bulk-generator

## Purpose

Generate a batch of unique WooCommerce coupon codes with configurable discount type (percentage or fixed cart), amount, expiry date, usage limit, and minimum order amount. Exports the generated codes as a CSV for distribution in email campaigns or loyalty programs.

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
| `dry_run` | bool | no | `true` | Preview generated codes without creating them |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `count` | int | yes | — | Number of unique coupon codes to generate |
| `discount_type` | string | no | `percent` | `percent`, `fixed_cart`, or `fixed_product` |
| `amount` | number | yes | — | Discount value (percent as 0–100, fixed as currency amount) |
| `expiry_date` | string | no | — | Expiry date in `YYYY-MM-DD` format |
| `usage_limit` | int | no | `1` | Times each coupon can be used total |
| `usage_limit_per_user` | int | no | `1` | Times each coupon can be used per customer |
| `minimum_amount` | number | no | — | Minimum order amount for coupon to apply |
| `code_prefix` | string | no | `PROMO` | Prefix for generated codes (e.g., `SPRING25-XXXXXXXX`) |
| `code_length` | int | no | `8` | Random suffix character length |

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

**Step 2 creates live coupon codes in WooCommerce.** Always run with `dry_run: true` first to preview the code format, amount, and count before creating. Creating coupons cannot be undone in bulk — they must be deleted individually.

## Workflow Steps

**Step 1 — Generate unique codes**

For each of `count` iterations:
- Generate a random alphanumeric suffix of `code_length` characters
- Code = `<code_prefix>-<suffix>` (uppercased)
- Ensure no duplicates within the batch (regenerate if collision)

**Step 2 — Preview or create**

If `dry_run: true`: display first 10 codes and config. Stop.

If `dry_run: false` and confirmed:

For each code:

```
POST /wp-json/wc/v3/coupons
  Body: {
    "code": "<code>",
    "discount_type": "<discount_type>",
    "amount": "<amount>",
    "date_expires": "<expiry_date>",
    "usage_limit": <usage_limit>,
    "usage_limit_per_user": <usage_limit_per_user>,
    "minimum_amount": "<minimum_amount>"
  }
```

Emit progress every 25 coupons.

## API Endpoints Used

```
POST  /wp-json/wc/v3/coupons   — create individual coupon codes
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
║  SKILL: woo-coupon-bulk-generator        ║
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
║  COMPLETE: woo-coupon-bulk-generator     ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-coupon-bulk-generator",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": <bool>
}
```

## Output Format

CSV filename: `woo-coupon-bulk-generator_<YYYY-MM-DD>.csv`
Columns: `coupon_id`, `code`, `discount_type`, `amount`, `expiry_date`, `usage_limit`, `minimum_amount`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `woocommerce_rest_coupon_code_already_exists` | Code collision with existing coupon | Increase `code_length` or change `code_prefix` |
| `429 Too Many Requests` | Rate limit during creation | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first to confirm code format before creating.
- Use a meaningful `code_prefix` that identifies the campaign (e.g., `SPRING25`, `VIP`).
- Set `expiry_date` to avoid codes being used after the campaign ends.
- Import the CSV directly into your email platform to assign one code per recipient.
