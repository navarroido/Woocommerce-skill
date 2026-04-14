---
name: woo-settings-export
role: store-management
description: "Read-only: Export all WooCommerce general, tax, shipping, and checkout settings as a structured report."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /settings
  - GET /settings/{group_id}
  - GET /settings/{group_id}/{setting_id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-settings-export

## Purpose

Export all WooCommerce store settings across every settings group (general, products, tax, shipping, checkout, accounts, emails, integrations, advanced) into a structured report. Useful for change audits, environment comparisons, and pre-migration snapshots. Read-only.

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
| `groups` | string | no | `all` | Comma-separated group IDs or `all` |

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

**Step 1 — Fetch all settings groups**

```
GET /wp-json/wc/v3/settings
```

Returns array of `{ id, label, description }` for each group.

**Step 2 — Fetch settings per group**

For each group ID (or filtered by `groups` parameter):
```
GET /wp-json/wc/v3/settings/<group_id>
```

Extract: `id`, `label`, `description`, `type`, `value`, `default`, `options` (for select fields).

**Step 3 — Mask sensitive values**

Settings with `type = password` or IDs containing `key`, `secret`, `token`, `password` — mask value as `***REDACTED***`.

**Step 4 — Export grouped report**

## API Endpoints Used

```
GET  /wp-json/wc/v3/settings             — list all settings groups
GET  /wp-json/wc/v3/settings/{group_id}  — settings within a group
```

## Pagination Strategy

The `/settings` and `/settings/{group_id}` endpoints return all records in a single response. No pagination is required.

## Session Tracking

Claude MUST emit the following output at each stage. This is mandatory.

STARTUP:

```
╔══════════════════════════════════════════╗
║  SKILL: woo-settings-export              ║
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
║  COMPLETE: woo-settings-export           ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename>                      ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-settings-export",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path>",
  "dry_run": false
}
```

## Output Format

CSV filename: `woo-settings-export_<YYYY-MM-DD>.csv`
Columns: `group_id`, `group_label`, `setting_id`, `label`, `type`, `value`, `default`

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read scope | Regenerate with Read scope |
| `429 Too Many Requests` | Rate limit | Wait 2 seconds and retry |

## Best Practices

- Run before and after a WooCommerce major version upgrade to diff settings changes.
- Compare staging vs. production exports to catch environment-specific misconfiguration.
- Store the export in version control as a settings snapshot for compliance audits.
- Sensitive credential fields are always redacted in output — never commit unredacted exports.
