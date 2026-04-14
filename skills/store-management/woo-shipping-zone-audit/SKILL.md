---
name: woo-shipping-zone-audit
role: store-management
description: "Read-only: List all shipping zones with their methods and rates, flag zones with no active methods configured, and identify gaps in geographic coverage."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /shipping/zones
  - GET /shipping/zones/{id}/methods
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-shipping-zone-audit

## Purpose

Audit the WooCommerce shipping configuration by enumerating all shipping zones, their assigned methods, and method settings. Flags zones with no active methods (which cause customers in those regions to see "No shipping options available") and highlights inconsistencies. Read-only — no configuration is changed.

## Prerequisites

- WooCommerce store with REST API enabled (WooCommerce → Settings → Advanced → REST API)
- Consumer Key and Consumer Secret with **Read** scope
- Store accessible over HTTPS
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store (e.g., `https://mystore.com`) |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `false` | No effect — this is a read-only skill |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `flag_empty_zones` | bool | no | `true` | Highlight zones with zero active methods |
| `include_rest_of_world` | bool | no | `true` | Include the WooCommerce "Rest of World" fallback zone |

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

**Step 1 — Fetch all shipping zones**

```
GET /wp-json/wc/v3/shipping/zones
```

Extract per zone: `id`, `name`, `order`
WooCommerce always returns all zones (no pagination needed for zones).

**Step 2 — Fetch methods for each zone**

For each zone:

```
GET /wp-json/wc/v3/shipping/zones/{zone_id}/methods
```

Extract per method: `instance_id`, `title`, `order`, `enabled`, `method_id`, `method_title`, `settings` (cost, title, tax_status, requires)

**Step 3 — Classify each zone**

For each zone:
- Count total methods
- Count enabled methods
- Flag if `enabled_methods == 0` (no active shipping option)
- Extract cost from flat_rate settings if present

**Step 4 — Identify the Rest of World zone**

WooCommerce uses zone ID `0` for "Rest of World". Note its methods — if it has none, any customer outside defined zones will see no shipping options.

**Step 5 — Format and emit report**

## API Endpoints Used

```
GET  /wp-json/wc/v3/shipping/zones             — list all shipping zones
GET  /wp-json/wc/v3/shipping/zones/{id}/methods — methods for each zone
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

Maximum per_page is 100 for most endpoints. Shipping zones endpoints return all records without pagination, but apply the standard loop pattern for safety.
The X-WP-Total and X-WP-TotalPages response headers report totals.
Always read X-WP-TotalPages on the first request to estimate job size.

## Session Tracking

Claude MUST emit the following output at each stage. This is mandatory.

STARTUP:

```
╔══════════════════════════════════════════╗
║  SKILL: woo-shipping-zone-audit          ║
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
║  COMPLETE: woo-shipping-zone-audit       ║
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-shipping-zone-audit",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": null,
  "dry_run": false
}
```

## Output Format

**Human format report:**

```
SHIPPING ZONE AUDIT — mystore.com — 2025-04-14

  Zones: 5 total | 1 ⚠️ with no active methods

  Zone                   Methods (Enabled/Total)   Status
  ──────────────────────────────────────────────────────
  United States          3 / 3                     ✅ OK
    ├─ Free Shipping      (enabled, min order $50)
    ├─ Flat Rate          (enabled, $7.99)
    └─ Local Pickup       (enabled, $0.00)
  Canada                 2 / 2                     ✅ OK
    ├─ Flat Rate          (enabled, $12.99)
    └─ Free Shipping      (enabled, min order $100)
  Europe                 0 / 1                     ⚠️ NO ACTIVE METHODS
    └─ Flat Rate          (DISABLED, $19.99)
  Australia              1 / 1                     ✅ OK
    └─ Flat Rate          (enabled, $24.99)
  Rest of World          1 / 1                     ✅ OK
    └─ Flat Rate          (enabled, $29.99)

  ⚠️  ACTION REQUIRED: "Europe" zone has no enabled shipping methods.
     Customers in Europe will see "No shipping options available" at checkout.
     Fix: WooCommerce → Settings → Shipping → Europe → Enable a method.
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid or missing credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Consumer Key lacks Read scope | Regenerate key with Read scope |
| `404 on /shipping/zones` | Shipping not enabled | Enable WooCommerce shipping (WooCommerce → Settings → Shipping) |
| Empty zones list | No shipping zones configured | Add zones at WooCommerce → Settings → Shipping |

## Best Practices

- Run this audit whenever you add a new shipping zone or change zone locations.
- Check the "Rest of World" zone (zone 0) — if it has no methods, customers in unlisted countries see no shipping options.
- Disabled methods count as "configured but inactive" — investigate why they are disabled before removing them.
- After any WooCommerce or shipping plugin update, re-run this audit to catch configuration regressions.
- For stores using WooCommerce Shipping (label printing service): those methods appear as `woocommerce_shipping` method_id entries.
