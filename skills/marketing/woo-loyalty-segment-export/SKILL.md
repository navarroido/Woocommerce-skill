---
name: woo-loyalty-segment-export
role: marketing
description: "Read-only: Export customers meeting spend or order-count thresholds for loyalty program enrollment."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /customers
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-loyalty-segment-export

## Purpose

Export WooCommerce customers who meet configurable spend or order-count thresholds for loyalty program enrollment. Segments into tiers and exports a clean list for import into a loyalty platform (LoyaltyLion, Smile.io, Yotpo Loyalty, etc.) or email platform. Read-only.

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
| `min_spend` | number | no | `100` | Minimum lifetime spend for enrollment |
| `min_orders` | int | no | `2` | Minimum order count for enrollment |
| `tier_definitions` | array | no | — | Optional: `[{ "name": "Gold", "min_spend": 1000 }, ...]` |
| `exclude_role` | string | no | — | Exclude customers with this role (e.g., `wholesale_customer`) |

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

**Step 1 — Fetch all customers**

```
GET /wp-json/wc/v3/customers?per_page=100&page=1
```

Filter: `total_spent >= min_spend` AND `orders_count >= min_orders`.
Exclude customers with `exclude_role` if set.

**Step 2 — Assign tiers (if tier_definitions provided)**

For each qualifying customer, assign the highest tier where `total_spent >= tier.min_spend`.

**Step 3 — Sort and export**

Sort by `total_spent` descending.

## API Endpoints Used

```
GET  /wp-json/wc/v3/customers   — customer list with spend data
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
║  SKILL: woo-loyalty-segment-export       ║
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
║  COMPLETE: woo-loyalty-segment-export    ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-loyalty-segment-export",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-loyalty-segment-export_<YYYY-MM-DD>.csv`
Columns: `customer_id`, `email`, `first_name`, `last_name`, `total_spent`, `orders_count`, `tier`, `date_registered`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Run before launching a loyalty program to seed the initial enrolled member list.
- Run monthly to identify newly-qualified customers who should be enrolled.
- Exclude wholesale/B2B customers from consumer loyalty programs using `exclude_role`.
