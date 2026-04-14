---
name: woo-customer-cohort-analysis
role: customer-ops
description: "Read-only: Group customers by registration month and compute cohort purchase rates, order counts, and lifetime value."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /customers
  - GET /orders
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-customer-cohort-analysis

## Purpose

Group WooCommerce customers by the month they registered, then compute the percentage who made a second purchase (retention), their average order count, and cumulative lifetime value (LTV) per cohort. Exports a cohort table for growth analysis and marketing attribution. Read-only.

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
| `months_back` | int | no | `12` | How many months of cohorts to analyze |
| `min_cohort_size` | int | no | `5` | Exclude cohorts smaller than this count |

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
GET /wp-json/wc/v3/customers
  ?orderby=registered_date&order=asc&per_page=100&page=1
```

Extract: `id`, `date_created`, `orders_count`, `total_spent`

**Step 2 — Group by registration month**

For each customer: `cohort = YYYY-MM of date_created`

**Step 3 — Compute cohort metrics**

For each cohort:
- `customer_count` — total customers registered that month
- `repeat_buyers` — customers with `orders_count >= 2`
- `retention_rate` — `repeat_buyers / customer_count * 100`
- `avg_orders` — average `orders_count` per cohort member
- `avg_ltv` — average `total_spent` per cohort member
- `total_revenue` — sum of `total_spent` for cohort

**Step 4 — Export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/customers   — customer list with spend and order data
GET  /wp-json/wc/v3/orders      — supplementary order history if needed
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
║  SKILL: woo-customer-cohort-analysis     ║
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
║  COMPLETE: woo-customer-cohort-analysis  ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-customer-cohort-analysis",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-customer-cohort-analysis_<YYYY-MM-DD>.csv`
Columns: `cohort_month`, `customer_count`, `repeat_buyers`, `retention_rate_pct`, `avg_order_count`, `avg_ltv`, `total_cohort_revenue`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |
| Small cohorts excluded | Cohorts below min_cohort_size | Reduce `min_cohort_size` or extend `months_back` |

## Best Practices

- Compare cohort retention rates over time to measure the impact of post-purchase email campaigns.
- Use `avg_ltv` by cohort to identify which acquisition channels produce the highest-value customers.
- Run quarterly to track how customer quality trends are evolving.
