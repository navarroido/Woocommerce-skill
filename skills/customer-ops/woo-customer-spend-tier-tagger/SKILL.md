---
name: woo-customer-spend-tier-tagger
role: customer-ops
description: "Segment customers into Bronze, Silver, and Gold tiers based on lifetime total_spent and write the tier as a customer meta field."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /customers
  - PUT /customers/{id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-customer-spend-tier-tagger

## Purpose

Segment all customers by their `total_spent` value into configurable Bronze, Silver, and Gold tiers, then write the tier label as a `meta_data` field on each customer record. Useful for loyalty programs, email segmentation, and B2C personalization. Includes dry-run preview before any writes.

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
| `dry_run` | bool | no | `true` | Preview tier assignments without writing to customer records |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `silver_threshold` | number | no | `200` | Minimum total_spent (store currency) for Silver tier |
| `gold_threshold` | number | no | `1000` | Minimum total_spent (store currency) for Gold tier |
| `meta_key` | string | no | `_loyalty_tier` | The meta_data key to write on each customer |
| `bronze_label` | string | no | `Bronze` | Label written for Bronze tier customers |
| `silver_label` | string | no | `Silver` | Label written for Silver tier customers |
| `gold_label` | string | no | `Gold` | Label written for Gold tier customers |
| `role` | string | no | `customer` | WordPress user role to filter (use `all` for all roles) |

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

**Step 4 executes customer meta writes.** Always run with `dry_run: true` first (the default) and confirm the tier distribution preview before tagging live. Writing a meta field is non-destructive — re-running the skill updates the tier — but verify the threshold values match your program rules.

## Workflow Steps

**Step 1 — Fetch all customers**

```
GET /wp-json/wc/v3/customers
  ?role=<role>
  &orderby=registered_date
  &order=asc
  &per_page=100
  &page=1
```

Extract per customer: `id`, `first_name`, `last_name`, `email`, `total_spent`, `orders_count`
Paginate until response length < 100. Note total from `X-WP-Total` header.

**Step 2 — Compute tier for each customer**

```
if total_spent >= gold_threshold:
  tier = gold_label
elif total_spent >= silver_threshold:
  tier = silver_label
else:
  tier = bronze_label
```

**Step 3 — Preview**

If `dry_run: true`: output tier distribution summary and sample table, then stop.

**Step 4 — Write tier meta**

If `dry_run: false` and user has confirmed:

```
PUT /wp-json/wc/v3/customers/{id}
  Body: {
    "meta_data": [
      { "key": "<meta_key>", "value": "<tier_label>" }
    ]
  }
```

Process in batches (sequential PUTs, not batch endpoint — customer batch is not available in WC core). Emit progress after every 50 customers.

## API Endpoints Used

```
GET  /wp-json/wc/v3/customers        — list all customers with spend data
PUT  /wp-json/wc/v3/customers/{id}   — write loyalty tier meta field
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
║  SKILL: woo-customer-spend-tier-tagger   ║
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
║  COMPLETE: woo-customer-spend-tier-tagger║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename or "stdout">          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-customer-spend-tier-tagger",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path or null>",
  "dry_run": <bool>
}
```

## Output Format

**Dry-run / preview (human format):**

```
TIER PREVIEW — 1,284 customers (DRY RUN)
Thresholds: Bronze < $200 | Silver $200–$999 | Gold ≥ $1,000

  Tier     Count    % of Base    Avg Spend    Total Spend
  ──────────────────────────────────────────────────────
  🥇 Gold     84       6.5%       $2,341       $196,644
  🥈 Silver  321      25.0%         $412       $132,252
  🥉 Bronze  879      68.5%          $67        $58,893
  ──────────────────────────────────────────────────────
  Total    1,284     100.0%         $301       $387,789

Top 5 Gold customers:
  #  Email                   Total Spent   Orders
  1  alice@example.com       $8,421        47
  2  bob@example.com         $6,102        31
  ...
```

CSV filename: `woo-customer-spend-tier-tagger_<YYYY-MM-DD>.csv`
Columns: `customer_id`, `email`, `first_name`, `last_name`, `total_spent`, `orders_count`, `tier`, `meta_key`, `meta_value`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid or missing credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Consumer Key lacks Read/Write scope | Regenerate key with Read/Write scope |
| `404 Not Found` | Customer ID not found during PUT | Customer may have been deleted; skip and continue |
| `429 Too Many Requests` | Rate limit during sequential PUTs | Wait 2 seconds between batches of 50 |
| `woocommerce_rest_*` error | Validation failure | See `message` in response JSON |

## Best Practices

- Run with `dry_run: true` first (the default). Review the tier distribution before tagging.
- Export the CSV after tagging for use in your email marketing platform.
- Re-run monthly to keep tiers current as customers' spend evolves.
- Use `meta_key` consistently across skills that read loyalty tier data.
- For B2B stores: combine with `woo-b2b-customer-overview` to exclude trade accounts from consumer tiers.
