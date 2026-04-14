---
name: woo-b2b-customer-overview
role: customer-ops
description: "Read-only: Export customers with a B2B role or meta_data flag including order count, lifetime spend, and last order date."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /customers
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-b2b-customer-overview

## Purpose

Export a structured overview of B2B customers in WooCommerce — identified by custom WordPress role (e.g., `wholesale_customer`, `b2b`) or by a meta field flag. Includes order count, lifetime spend, last order date, and company name. Read-only.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key with **Read** scope
- B2B customers must be identifiable by WordPress role or meta_data key
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | No effect — read-only skill |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `b2b_role` | string | no | `wholesale_customer` | WordPress user role identifying B2B customers |
| `b2b_meta_key` | string | no | — | Alternative: meta_data key that flags B2B customers |
| `min_orders` | int | no | `1` | Minimum order count to include |

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

**Step 1 — Fetch B2B customers by role**

```
GET /wp-json/wc/v3/customers?role=<b2b_role>&per_page=100&page=1
```

If `b2b_meta_key` is set instead: fetch all customers and filter client-side by meta_data.

Extract: `id`, `first_name`, `last_name`, `email`, `billing.company`, `orders_count`, `total_spent`, `date_created`, `meta_data`

**Step 2 — Filter by min_orders and sort by total_spent descending**

**Step 3 — Export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/customers   — B2B customer list filtered by role
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
║  SKILL: woo-b2b-customer-overview        ║
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
║  COMPLETE: woo-b2b-customer-overview     ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-b2b-customer-overview",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-b2b-customer-overview_<YYYY-MM-DD>.csv`
Columns: `customer_id`, `company`, `first_name`, `last_name`, `email`, `role`, `orders_count`, `total_spent`, `date_created`, `last_order_date`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |
| Empty result | No customers with specified role | Verify the WordPress role name (case-sensitive) |

## Best Practices

- Verify your B2B role name exactly — WordPress roles are case-sensitive.
- For stores using B2B plugins (WooCommerce B2B, Wholesale Suite): check the plugin's documentation for the correct role slug.
- Use the CSV for account manager territory assignments or CRM import.
