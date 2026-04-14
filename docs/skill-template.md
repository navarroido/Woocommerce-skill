---
name: woo-<slug>
role: <category>
description: "<one sentence — prefix 'Read-only:' for non-mutating skills>"
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-\<slug\>

## Purpose

\<One paragraph describing the business problem this skill solves and whether it is read-only or mutating.\>

## Prerequisites

- WooCommerce store with REST API enabled (WooCommerce → Settings → Advanced → REST API)
- Consumer Key and Consumer Secret with **Read** scope (or **Read/Write** for mutating skills)
- Store accessible over HTTPS
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store (e.g., `https://mystore.com`) |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | Preview changes without executing mutations |
| `format` | string | no | `human` | Output format: `human` or `json` |

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

\<For mutating skills:\>
**Steps N–M execute irreversible mutations.** Always run with `dry_run: true` first and verify the preview before executing live.

\<For read-only skills:\>
Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

**Step 1 — \<Action\>**

```
GET /wp-json/wc/v3/<endpoint>
  ?per_page=100&page=1
  &<filter_param>=<value>
```

Extract: `field1`, `field2`, `field3`
Continue paginating until response length < per_page.

**Step 2 — \<Action\>**

\<Describe what the agent does with the data from Step 1.\>

**Step N — \<Action (mutating)\>**

If `dry_run: true`: output a preview table and stop. Do not execute the following calls.

If `dry_run: false` and user has confirmed: proceed.

```
PUT /wp-json/wc/v3/<endpoint>/{id}
  Body: { "field": "new_value" }
```

## API Endpoints Used

```
GET  /wp-json/wc/v3/<endpoint>      — <purpose>
PUT  /wp-json/wc/v3/<endpoint>/{id} — <purpose>
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
║  SKILL: woo-<slug>                       ║
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
║  COMPLETE: woo-<slug>                    ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename or "stdout">          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-<slug>",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path or null>",
  "dry_run": <bool>
}
```

## Output Format

\<human format: describe the ASCII table or summary printed to stdout\>

\<For CSV export skills:\>

CSV filename: `woo-<slug>_<YYYY-MM-DD>.csv`
Columns: `column_1`, `column_2`, `column_3`, ...

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid or missing credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Consumer Key lacks required scope | Regenerate key with Read/Write scope |
| `404 Not Found` | Resource ID does not exist | Check the ID; resource may have been deleted |
| `429 Too Many Requests` | Rate limit hit during pagination | Wait 2 seconds and retry; reduce per_page to 50 |
| `woocommerce_rest_*` error in body | WooCommerce validation failure | See `message` field in response JSON |

## Best Practices

- Run with `dry_run: true` first and verify the preview before executing live.
- \<Skill-specific best practice 2.\>
- \<Skill-specific best practice 3.\>
