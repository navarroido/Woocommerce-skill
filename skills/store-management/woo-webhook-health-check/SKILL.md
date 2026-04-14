---
name: woo-webhook-health-check
role: store-management
description: "Read-only: List all webhooks with delivery URL, status, and failure count."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /webhooks
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-webhook-health-check

## Purpose

List all registered WooCommerce webhooks and report their delivery URL, current status, failure count, and last delivery date. Identifies paused or failing webhooks that may be disrupting integrations. Read-only.

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
| `failure_threshold` | int | no | `3` | Flag webhooks with failure_count >= this value |

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

**Step 1 — Fetch all webhooks**

```
GET /wp-json/wc/v3/webhooks?per_page=100&page=1
```

Extract: `id`, `name`, `status`, `topic`, `delivery_url`, `failure_count`, `date_created`, `date_modified`.

**Step 2 — Flag unhealthy webhooks**

For each webhook:
- `status = paused` → flagged (WC auto-pauses after 5 consecutive failures)
- `failure_count >= failure_threshold` → flagged
- `status = disabled` → note as intentionally disabled

**Step 3 — Export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/webhooks   — webhook list with failure counts and status
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
║  SKILL: woo-webhook-health-check         ║
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
║  COMPLETE: woo-webhook-health-check      ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-webhook-health-check",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-webhook-health-check_<YYYY-MM-DD>.csv`
Columns: `webhook_id`, `name`, `topic`, `status`, `delivery_url`, `failure_count`, `flagged`, `date_created`, `date_modified`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- WooCommerce automatically pauses a webhook after 5 consecutive delivery failures — a `paused` status always indicates a delivery problem requiring investigation.
- Verify `delivery_url` endpoints are reachable from your server; local/ngrok URLs from development often persist in production.
- Re-enable paused webhooks only after fixing the receiving endpoint — use `woo-settings-export` to confirm the endpoint host is reachable.
