---
name: woo-payment-gateway-status
role: store-management
description: "Read-only: Query all enabled payment gateways and their configuration status."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /payment_gateways
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-payment-gateway-status

## Purpose

List all WooCommerce payment gateways — enabled and disabled — with their configuration details. Identifies gateways in test/sandbox mode, missing API credentials, or incorrect ordering. Read-only.

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
| `enabled_only` | bool | no | `false` | Report only enabled gateways |

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

**Step 1 — Fetch all payment gateways**

```
GET /wp-json/wc/v3/payment_gateways
```

Returns array of gateway objects. Extract: `id`, `title`, `description`, `order`, `enabled`, `method_title`, `method_description`, `settings`.

**Step 2 — Parse settings for test mode and credentials**

For each gateway, inspect `settings` object:
- Look for keys containing `testmode`, `sandbox`, `test` — flag if enabled
- Look for credential keys (`api_key`, `client_id`, `publishable_key`) — flag if empty

**Step 3 — Build status table**

For each gateway:
- `status`: enabled / disabled
- `mode`: live / test / unknown
- `credentials_set`: true / false (based on non-empty credential fields)
- `order`: display order integer

**Step 4 — Export**

## API Endpoints Used

```
GET  /wp-json/wc/v3/payment_gateways   — gateway list and configuration
```

## Pagination Strategy

The `/payment_gateways` endpoint returns all gateways in a single response (no pagination required). No per_page/page parameters are needed.

## Session Tracking

Claude MUST emit the following output at each stage. This is mandatory.

STARTUP:

```
╔══════════════════════════════════════════╗
║  SKILL: woo-payment-gateway-status       ║
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
║  COMPLETE: woo-payment-gateway-status    ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-payment-gateway-status",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-payment-gateway-status_<YYYY-MM-DD>.csv`
Columns: `gateway_id`, `title`, `enabled`, `mode`, `credentials_set`, `display_order`, `method_title`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Run before go-live to confirm no gateway is in test/sandbox mode on production.
- Verify at least one enabled gateway has `credentials_set: true` — an enabled gateway with empty credentials will silently fail at checkout.
- Review `display_order` — the first enabled gateway is the default at checkout.
