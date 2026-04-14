---
name: woo-tax-liability-summary
role: finance
description: "Read-only: Sum tax_lines by tax class and rate across completed orders for a specified period and export a tax liability report."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders
  - GET /taxes/classes
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-tax-liability-summary

## Purpose

Compute tax liability by summing `tax_lines` across all completed (and optionally refunded) orders for a specified date range. Groups results by tax rate label and rate percentage. Exports a tax liability summary suitable for accounting review or filing. Read-only — no data is modified.

## Prerequisites

- WooCommerce store with REST API enabled (WooCommerce → Settings → Advanced → REST API)
- Consumer Key and Consumer Secret with **Read** scope
- Store accessible over HTTPS
- WooCommerce tax calculation must be enabled (WooCommerce → Settings → General → Enable taxes)
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store (e.g., `https://mystore.com`) |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | No effect — this is a read-only skill |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `date_after` | string | yes | — | Start date (inclusive) in `YYYY-MM-DD` format |
| `date_before` | string | yes | — | End date (inclusive) in `YYYY-MM-DD` format |
| `include_refunded` | bool | no | `true` | Subtract tax from refunded orders |
| `statuses` | array | no | `["completed"]` | Order statuses to include (e.g., `["completed", "processing"]`) |
| `group_by` | string | no | `rate_label` | Group output by: `rate_label`, `rate_percent`, or `tax_class` |

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

Extract: `slug`, `name` — used to label tax groups in the output.

**Step 2 — Fetch completed orders in date range**

```
GET /wp-json/wc/v3/orders
  ?status=<statuses joined by comma>
  &after=<date_after>T00:00:00Z
  &before=<date_before>T23:59:59Z
  &per_page=100
  &page=1
```

Extract per order: `id`, `number`, `date_created`, `total_tax`, `tax_lines[].rate_code`, `tax_lines[].rate_id`, `tax_lines[].label`, `tax_lines[].compound`, `tax_lines[].tax_total`, `tax_lines[].shipping_tax_total`

Paginate until response length < 100.

**Step 3 — Fetch refunded orders (if include_refunded: true)**

```
GET /wp-json/wc/v3/orders
  ?status=refunded
  &after=<date_after>T00:00:00Z
  &before=<date_before>T23:59:59Z
  &per_page=100
  &page=1
```

Extract same fields. These will be subtracted from the totals.

**Step 4 — Aggregate tax by group**

For each `tax_line` in each order:

```
key = tax_line[group_by field]
totals[key].tax_total += tax_line.tax_total
totals[key].shipping_tax += tax_line.shipping_tax_total
totals[key].order_count += 1
```

If the order is `refunded`: subtract instead of add.

**Step 5 — Compute totals**

```
grand_total_tax = sum of all totals[key].tax_total + shipping_tax
```

**Step 6 — Format and export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/taxes/classes   — list tax classes for labeling
GET  /wp-json/wc/v3/orders          — completed orders with date range filter
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
║  SKILL: woo-tax-liability-summary        ║
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
║  COMPLETE: woo-tax-liability-summary     ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-tax-liability-summary",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

**Human format summary:**

```
TAX LIABILITY SUMMARY — mystore.com
Period: 2025-01-01 to 2025-03-31 (Q1 2025)
Orders included: 1,284 completed | 89 refunded (subtracted)

  Tax Rate                Rate %   Product Tax   Shipping Tax   Total
  ─────────────────────────────────────────────────────────────────────
  Standard Rate (US-CA)   10.25%   $12,841.22    $1,203.11    $14,044.33
  Reduced Rate             5.00%    $1,204.88       $98.21     $1,303.09
  Zero Rate                0.00%        $0.00        $0.00         $0.00
  ─────────────────────────────────────────────────────────────────────
  TOTAL                            $14,046.10    $1,301.32    $15,347.42

  Net Revenue (excl. tax):   $142,183.51
  Effective Tax Rate:              10.79%
```

CSV filename: `woo-tax-liability-summary_<YYYY-MM-DD>_<YYYY-MM-DD>.csv`
Columns: `rate_code`, `rate_label`, `rate_percent`, `tax_class`, `order_count`, `product_tax_total`, `shipping_tax_total`, `total_tax`, `refund_tax_subtracted`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid or missing credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Consumer Key lacks Read scope | Regenerate key with Read scope |
| `429 Too Many Requests` | Rate limit during pagination | Wait 2 seconds and retry |
| Empty result | No completed orders in date range | Check dates and order statuses |
| Zero tax totals | Tax is not enabled or not configured | Enable in WooCommerce → Settings → General |

## Best Practices

- Always specify both `date_after` and `date_before` aligned to your accounting period (Q1, month, year).
- Set `include_refunded: true` (the default) for accurate net tax liability — gross minus refund adjustments.
- Cross-reference with WooCommerce's built-in Tax Report (WooCommerce → Reports → Taxes) for spot-checks.
- For multi-currency stores: all values are in the store's base currency as stored in WooCommerce.
- Provide the CSV to your accountant rather than the raw API data — the summary format maps to common tax filing requirements.
