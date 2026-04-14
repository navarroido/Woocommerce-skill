---
name: woo-coupon-hygiene-cleanup
role: marketing
description: "Find expired, zero-use, or past-expiry coupons and batch-delete after confirmation."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /coupons
  - DELETE /coupons/{id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-coupon-hygiene-cleanup

## Purpose

Audit WooCommerce coupons for expired, never-used, or usage-exhausted codes and delete them in batch after confirmation. Reduces coupon table bloat and prevents confusion from stale codes. Includes dry-run preview listing every coupon to be deleted.

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
| `dry_run` | bool | no | `true` | Preview without deleting |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `delete_expired` | bool | no | `true` | Delete coupons past their `date_expires` |
| `delete_zero_use` | bool | no | `false` | Delete coupons that have never been used (use with caution) |
| `delete_usage_exhausted` | bool | no | `true` | Delete coupons where usage_count >= usage_limit |
| `expired_before` | string | no | `<today>` | Only delete coupons that expired before this date |
| `force_delete` | bool | no | `true` | Permanently delete (bypass trash) |

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

**Step 3 permanently deletes coupons.** Deleted coupons cannot be recovered. Always run with `dry_run: true` first (the default) and review the list carefully. Do not use `delete_zero_use: true` without verifying those coupons are not in active email campaigns.

## Workflow Steps

**Step 1 — Fetch all coupons**

```
GET /wp-json/wc/v3/coupons?per_page=100&page=1
```

Extract: `id`, `code`, `discount_type`, `amount`, `date_expires`, `usage_count`, `usage_limit`, `date_created`

**Step 2 — Classify coupons for deletion**

- Expired: `date_expires != null` and `date_expires < now` (and `< expired_before`)
- Zero-use: `usage_count == 0` (if `delete_zero_use: true`)
- Usage exhausted: `usage_limit > 0` and `usage_count >= usage_limit`

**Step 3 — Preview or delete**

If `dry_run: true`: list coupons to be deleted. Stop.

If `dry_run: false` and confirmed:

```
DELETE /wp-json/wc/v3/coupons/{id}?force=<force_delete>
```

## API Endpoints Used

```
GET     /wp-json/wc/v3/coupons        — list all coupons
DELETE  /wp-json/wc/v3/coupons/{id}   — delete individual coupon
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
║  SKILL: woo-coupon-hygiene-cleanup       ║
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
║  COMPLETE: woo-coupon-hygiene-cleanup    ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-coupon-hygiene-cleanup",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: table of coupon codes, expiry date, usage count, and deletion reason.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `429 Too Many Requests` | Rate limit during delete | Wait 2 seconds and retry |

## Best Practices

- Always run with `dry_run: true` first (the default). Deletion is permanent.
- Never enable `delete_zero_use: true` without cross-referencing active email campaigns using those codes.
- Run quarterly as routine coupon table maintenance.
