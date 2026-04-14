---
name: woo-address-correction
role: customer-support
description: "Update billing or shipping address fields on a WooCommerce order with a private audit note."
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /orders/{id}
  - PUT /orders/{id}
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# woo-address-correction

## Purpose

Update the billing and/or shipping address on a WooCommerce order at the request of a customer. Adds a private audit note recording what was changed, by whom, and when. For use by customer support agents correcting addresses before fulfillment.

## Prerequisites

- WooCommerce store with REST API enabled
- Consumer Key with **Read/Write** scope
- Order must still be in `processing` or `on-hold` status (not yet shipped)
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `store_url` | string | yes | — | Base URL of the WooCommerce store |
| `consumer_key` | string | yes | — | WooCommerce REST API consumer key (`ck_...`) |
| `consumer_secret` | string | yes | — | WooCommerce REST API consumer secret (`cs_...`) |
| `dry_run` | bool | no | `true` | Preview without executing |
| `format` | string | no | `human` | Output format: `human` or `json` |
| `order_id` | int | yes | — | WooCommerce order ID |
| `address_type` | string | no | `shipping` | Which address to update: `shipping`, `billing`, or `both` |
| `new_address` | object | yes | — | Address fields: `first_name`, `last_name`, `address_1`, `address_2`, `city`, `state`, `postcode`, `country` |
| `correction_reason` | string | no | `Customer request` | Reason logged in private note |

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

**Step 2 modifies order address data.** Always run with `dry_run: true` first (the default). Verify the new address fields before applying. Note: if the order has already been handed to the carrier, contact the carrier directly as well.

## Workflow Steps

**Step 1 — Fetch order**

```
GET /wp-json/wc/v3/orders/{order_id}
```

Extract current address fields for comparison.

**Step 2 — Preview or execute**

If `dry_run: true`: show old vs. new address diff. Stop.

If `dry_run: false` and confirmed:

```
PUT /wp-json/wc/v3/orders/{order_id}
  Body: {
    "shipping": { <new_address fields> },    // if address_type is shipping or both
    "billing":  { <new_address fields> }     // if address_type is billing or both
  }
```

Then add a private note:

```
POST /wp-json/wc/v3/orders/{order_id}/notes
  Body: {
    "note": "Address corrected by support | Reason: <correction_reason> | <ISO-8601>\nOld: <old> | New: <new>",
    "customer_note": false
  }
```

## API Endpoints Used

```
GET   /wp-json/wc/v3/orders/{id}         — fetch current address
PUT   /wp-json/wc/v3/orders/{id}         — update address fields
POST  /wp-json/wc/v3/orders/{id}/notes   — add audit note
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
║  SKILL: woo-address-correction           ║
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
║  COMPLETE: woo-address-correction        ║
║  RECORDS PROCESSED: 1                    ║
║  OUTPUT: stdout                          ║
╚══════════════════════════════════════════╝
```

COMPLETION (json format):

```json
{
  "skill": "woo-address-correction",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": 1,
  "output_file": null,
  "dry_run": <bool>
}
```

## Output Format

Human format: side-by-side diff of old address fields and new address fields.

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `401 Unauthorized` | Invalid credentials | Verify consumer_key and consumer_secret |
| `403 Forbidden` | Key lacks Read/Write scope | Regenerate with Read/Write scope |
| `404 Not Found` | Order ID does not exist | Confirm the order ID |
| Order already shipped | Status is completed | Contact the carrier to redirect; WooCommerce address is for record only |

## Best Practices

- Always run with `dry_run: true` first. Show the customer the address diff before confirming.
- Always add a `correction_reason` for the audit trail.
- If the order is already `completed`, correct the address in WooCommerce for record-keeping but also notify the carrier directly.
