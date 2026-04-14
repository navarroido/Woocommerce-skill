---
name: woo-marketing-consent-report
role: customer-ops
description: "Read-only: Export customers with marketing opt-in status from user meta for email list compliance and GDPR auditing."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /customers
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-marketing-consent-report

## Purpose

Export a list of WooCommerce customers with their marketing consent status, as stored in user meta (typically by WooCommerce's built-in marketing consent checkbox or a GDPR plugin). Useful for email list compliance, GDPR/CCPA auditing, and suppression list management. Read-only.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key with **Read** scope
- A marketing consent meta field must be set on customer records (e.g., via checkout checkbox or GDPR plugin)
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | No effect — read-only skill |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `consent_meta_key` | string | no | `marketing_optin` | The meta_data key storing consent status |
| `opted_in_value` | string | no | `yes` | The meta value that means opted-in |
| `filter` | string | no | `all` | Export `all`, `opted_in`, or `opted_out` |

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

Extract: `id`, `email`, `first_name`, `last_name`, `date_created`, `meta_data`

**Step 2 — Extract consent status**

For each customer: find `meta_data` entry where `key == consent_meta_key`.
Set `opted_in = (meta_value == opted_in_value)`.

Customers with no consent meta entry are treated as `unknown`.

**Step 3 — Filter and export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/customers   — all customers with meta_data
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
║  SKILL: woo-marketing-consent-report     ║
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
║  COMPLETE: woo-marketing-consent-report  ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-marketing-consent-report",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-marketing-consent-report_<YYYY-MM-DD>.csv`
Columns: `customer_id`, `email`, `first_name`, `last_name`, `consent_status`, `consent_date`, `date_registered`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |
| All customers show `unknown` | Meta key not found | Verify `consent_meta_key` matches your plugin's key |

## Best Practices

- Check your GDPR plugin or WooCommerce consent settings for the correct `consent_meta_key` value.
- Upload the `opted_out` list to your ESP as a suppression list to prevent unsolicited emails.
- Run before every bulk email campaign to ensure your send list uses up-to-date consent data.
