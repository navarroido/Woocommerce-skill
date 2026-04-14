---
name: woo-customer-win-back
role: marketing
description: "Read-only: Identify customers who haven't ordered in N days and export with last-order context for win-back campaigns."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /customers
  - GET /orders
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-customer-win-back

## Purpose

Identify WooCommerce customers who have not placed an order in a configurable number of days and export them with their last purchase details for re-engagement campaigns. Segments by LTV tier to prioritize high-value lapsed customers. Read-only.

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
| `inactive_days` | int | no | `90` | Customers with no order in this many days |
| `min_orders` | int | no | `1` | Minimum historical order count to include |
| `min_spend` | number | no | `0` | Minimum lifetime spend to include |
| `max_inactive_days` | int | no | `365` | Exclude customers inactive longer than this (likely churned for good) |

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

Filter: `orders_count >= min_orders` and `total_spent >= min_spend`.

**Step 2 — Find each customer's last order date**

```
GET /wp-json/wc/v3/orders
  ?customer=<customer_id>&per_page=1&orderby=date&order=desc&status=completed
```

Extract `date_created` of the first result as `last_order_date`.

**Step 3 — Filter by inactivity window**

Keep customers where: `inactive_days <= days_since_last_order <= max_inactive_days`.

**Step 4 — Sort by total_spent descending and export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/customers   — customer list
GET  /wp-json/wc/v3/orders      — last order date per customer
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
║  SKILL: woo-customer-win-back            ║
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
║  COMPLETE: woo-customer-win-back         ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-customer-win-back",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-customer-win-back_<YYYY-MM-DD>.csv`
Columns: `customer_id`, `email`, `first_name`, `last_name`, `total_spent`, `orders_count`, `last_order_date`, `days_inactive`, `last_order_total`, `last_order_items`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds; reduce per_page |
| Slow execution | One API call per customer for last order | Normal for large customer bases — runs in batches |

## Best Practices

- Prioritize customers by `total_spent` — high-LTV lapsed customers have the most win-back potential.
- Use `inactive_days: 90` as your standard win-back window; test `60` for higher-frequency categories.
- Personalize the win-back email with `last_order_items` for higher conversion rates.
- Exclude customers who are already in an active cart abandonment flow.
