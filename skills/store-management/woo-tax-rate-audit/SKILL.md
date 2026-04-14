---
name: woo-tax-rate-audit
role: store-management
description: "Read-only: List tax rates by class and country, identify gaps and duplicates."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /taxes
  - GET /taxes/classes
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-tax-rate-audit

## Purpose

Enumerate all WooCommerce tax rates across every tax class and country, identify duplicate rates for the same country/class combination, and flag missing rates for countries where you have customers. Read-only.

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
| `flag_duplicates` | bool | no | `true` | Flag country+class combinations with more than one rate |

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

**Step 1 — Fetch tax classes**

```
GET /wp-json/wc/v3/taxes/classes
```

Returns array of `{ slug, name }`. Standard classes: standard, reduced-rate, zero-rate.

**Step 2 — Fetch all tax rates per class**

For each class slug:
```
GET /wp-json/wc/v3/taxes?class=<slug>&per_page=100&page=1
```

Extract: `id`, `country`, `state`, `rate`, `name`, `priority`, `compound`, `shipping`, `class`.

**Step 3 — Detect duplicates**

Group rates by `(class, country, state)`. Flag groups with `count > 1` as duplicates.

**Step 4 — Export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/taxes/classes   — list all tax classes
GET  /wp-json/wc/v3/taxes           — rates per class
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
║  SKILL: woo-tax-rate-audit               ║
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
║  COMPLETE: woo-tax-rate-audit            ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-tax-rate-audit",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-tax-rate-audit_<YYYY-MM-DD>.csv`
Columns: `tax_id`, `class`, `country`, `state`, `rate_pct`, `name`, `priority`, `compound`, `applies_to_shipping`, `duplicate_flag`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Duplicate rates for the same country+class can cause double taxation — resolve by removing lower-priority entries.
- Verify `applies_to_shipping = true` for standard rates in jurisdictions that tax shipping.
- Cross-reference against `/reports/taxes` after a period close to confirm rates are collecting as expected.
