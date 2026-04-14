---
name: woo-abandoned-cart-recovery
role: marketing
description: "Read-only: Query WooCommerce pending orders older than a configurable threshold and export a re-engagement list for abandoned cart recovery campaigns."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-abandoned-cart-recovery

## Purpose

Identify WooCommerce orders in `pending` status that are older than a configurable age threshold — these represent potential abandoned checkouts where payment was not completed. Export a list with customer email, cart value, and items for use in re-engagement email campaigns. Read-only — no orders are modified.

Note: Native WooCommerce does not expose shopping cart sessions via REST API. This skill uses `pending` orders as a proxy for abandoned checkouts, which is accurate for stores where WooCommerce creates the order before payment (the default checkout behavior).

## Prerequisites

- WooCommerce store with REST API enabled (WooCommerce → Settings → Advanced → REST API)
- Consumer Key and Consumer Secret with **Read** scope
- Store accessible over HTTPS
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store (e.g., `https://mystore.com`) |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | No effect — this is a read-only skill |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `min_age_hours` | int | no | `1` | Minimum hours old for an order to be included |
| `max_age_hours` | int | no | `72` | Maximum hours old — exclude very stale orders |
| `min_cart_value` | number | no | `0` | Minimum order total to include |
| `exclude_guest` | bool | no | `false` | Exclude guest (non-registered) checkouts |
| `max_results` | int | no | `500` | Maximum orders to include in export |

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

**Step 1 — Fetch pending orders within the age window**

```
GET /wp-json/wc/v3/orders
  ?status=pending
  &after=<ISO-8601 timestamp of now - max_age_hours>
  &before=<ISO-8601 timestamp of now - min_age_hours>
  &per_page=100
  &page=1
  &orderby=date
  &order=desc
```

Extract per order: `id`, `number`, `date_created`, `total`, `total_tax`, `customer_id`, `billing.first_name`, `billing.last_name`, `billing.email`, `billing.phone`, `line_items[].name`, `line_items[].quantity`, `line_items[].total`

Paginate until response length < 100 or `max_results` is reached.

**Step 2 — Filter by min_cart_value and exclude_guest**

For each order:
- Skip if `total < min_cart_value`
- Skip if `exclude_guest: true` and `customer_id == 0`

**Step 3 — Enrich with item summary**

For each order, build a comma-separated item list: `"Product A (x2), Product B (x1)"`

**Step 4 — Compute age**

`age_hours = (now - date_created) / 3600`

**Step 5 — Output and export**

Emit summary counts and export CSV (see Output Format).

## API Endpoints Used

```
GET  /wp-json/wc/v3/orders   — fetch pending orders with date range and status filter
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
║  SKILL: woo-abandoned-cart-recovery      ║
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
║  COMPLETE: woo-abandoned-cart-recovery   ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-abandoned-cart-recovery",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

**Summary (human format):**

```
ABANDONED CART RECOVERY — mystore.com
Window: 1h – 72h ago | Min value: $0 | 2025-04-14

  Total pending orders found:   83
  After filters (value/guest):  71
  Total potential recovery:     $8,421.50
  Average cart value:           $118.61

  Age Distribution:
    1–12h:   42 orders   $4,810
    12–24h:  19 orders   $2,200
    24–72h:  10 orders   $1,411

  Top 5 by cart value:
    #5901  $542.00  jane@example.com   2h 14m ago
    #5888  $398.50  bob@example.com    5h 02m ago
    ...

  Exported: woo-abandoned-cart-recovery_2025-04-14.csv (71 rows)
```

CSV filename: `woo-abandoned-cart-recovery_<YYYY-MM-DD>.csv`
Columns: `order_id`, `order_number`, `date_created`, `age_hours`, `customer_id`, `first_name`, `last_name`, `email`, `phone`, `total`, `items_summary`, `is_guest`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid or missing credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Consumer Key lacks Read scope | Regenerate key with Read scope |
| `429 Too Many Requests` | Rate limit hit during pagination | Wait 2 seconds and retry; reduce per_page to 50 |
| Empty result | No pending orders in window | Adjust `min_age_hours` / `max_age_hours` |

## Best Practices

- Start with `min_age_hours: 1` and `max_age_hours: 24` to focus on the highest-intent window.
- Import the CSV into your email platform (Klaviyo, Mailchimp, etc.) for automated cart recovery flows.
- Run daily and deduplicate against already-contacted emails in your CRM.
- For stores using WooCommerce Cart Abandonment Recovery plugin: that plugin has its own cart session data — this skill complements it with order-level data.
- Segment by `is_guest` and `total` to prioritize high-value registered customers first.
