---
name: woo-duplicate-customer-finder
role: customer-ops
description: "Read-only: Identify customer records sharing billing_email or shipping address to flag for merge or deduplication."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /customers
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-duplicate-customer-finder

## Purpose

Scan WooCommerce customer records for duplicates: same billing email across multiple accounts, or identical shipping address across different email addresses. Exports a conflict report with customer IDs for manual review and CRM deduplication. Read-only.

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
| `match_on` | string | no | `email` | Match on: `email`, `address`, or `both` |

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

Extract: `id`, `email`, `billing.email`, `billing.address_1`, `billing.city`, `billing.postcode`, `billing.country`

**Step 2 — Build lookup maps**

- Email map: `normalized_email → [customer_ids]`
- Address map: `normalized_address_fingerprint → [customer_ids]` (fingerprint = lowercased address_1 + postcode + country)

**Step 3 — Find conflicts**

Email duplicates: map entries with > 1 customer ID.
Address duplicates: map entries with > 1 customer ID across different emails.

**Step 4 — Export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/customers   — all customer records
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
║  SKILL: woo-duplicate-customer-finder    ║
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
║  COMPLETE: woo-duplicate-customer-finder ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-duplicate-customer-finder",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-duplicate-customer-finder_<YYYY-MM-DD>.csv`
Columns: `match_type`, `match_value`, `customer_ids`, `emails`, `names`, `order_counts`, `total_spends`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Email matching catches the most common duplicates; address matching catches the same household with different emails.
- Do not delete duplicate accounts without reviewing order history on each — manually merge order counts first.
- Run after every large customer import to catch duplicates introduced by the import.
