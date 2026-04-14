---
name: woo-customer-note-bulk-annotator
role: customer-ops
description: "Append a note to multiple customers matching a role, spend range, or country filter with dry-run preview."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /customers
  - PUT /customers/{id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-customer-note-bulk-annotator

## Purpose

Append a text note to the WooCommerce customer note field (`customer_note`) for multiple customers matching a filter (role, spend range, country, or registration date). Useful for adding internal flags, account status notes, or support context in bulk. Includes dry-run preview.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key with **Read/Write** scope
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `true` | Preview without executing |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `note` | string | yes | — | Text to append to each customer's note |
| `filter_role` | string | no | — | WordPress role to filter |
| `filter_min_spend` | number | no | — | Minimum total_spent |
| `filter_max_spend` | number | no | — | Maximum total_spent |
| `filter_country` | string | no | — | Two-letter billing country code |
| `append_mode` | bool | no | `true` | If true, append to existing note; if false, overwrite |

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

**Step 3 writes to customer records.** Always run with `dry_run: true` first (the default). If `append_mode: false`, existing customer notes are overwritten.

## Workflow Steps

**Step 1 — Fetch filtered customers**

```
GET /wp-json/wc/v3/customers?per_page=100&page=1
  [&role=<filter_role>]
  [&country=<filter_country>]
```

Filter client-side by `total_spent` range. Extract: `id`, `email`, `customer_note`

**Step 2 — Compute new note**

If `append_mode: true`: `new_note = existing_note + "\n" + note + " [" + date + "]"`
If `append_mode: false`: `new_note = note`

**Step 3 — Preview or execute**

If `dry_run: true`: list customers. Stop.

If `dry_run: false` and confirmed:

```
PUT /wp-json/wc/v3/customers/{id}
  Body: { "customer_note": "<new_note>" }
```

## API Endpoints Used

```
GET  /wp-json/wc/v3/customers        — filtered customer list
PUT  /wp-json/wc/v3/customers/{id}   — write updated note
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
║  SKILL: woo-customer-note-bulk-annotator ║
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
║  COMPLETE: woo-customer-note-bulk-anno.  ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-customer-note-bulk-annotator",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: count of customers to annotate and the first 10 email addresses.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first.
- Use `append_mode: true` (the default) to preserve existing notes.
- Include the date in your note text for a built-in audit trail.
