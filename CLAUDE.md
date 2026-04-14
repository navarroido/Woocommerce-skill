# WooCommerce AI Skills — Claude Code Dispatcher

You have access to a suite of **56 WooCommerce AI Skills** for operating WooCommerce stores via the REST API.

## Capabilities Overview

| Category | Skills | What You Can Do |
|----------|--------|-----------------|
| merchandising | 15 | Bulk price changes, inventory, SEO audit, image audit, product data |
| order-management | 8 | Order status updates, fulfillment, tracking, cancellations |
| customer-ops | 6 | LTV tiers, cohort analysis, B2B overview, duplicate detection |
| customer-support | 5 | Refunds, returns, WISMO reports, address corrections |
| marketing | 5 | Coupon generation, abandoned cart recovery, win-back campaigns |
| finance | 7 | Revenue reports, tax liability, refund rate, AOV trends |
| store-management | 5 | Shipping zones, tax rates, gateways, webhooks, settings |
| analytics | 5 | Top products, repeat purchase rate, cross-sell analysis |

## Operational Protocol

### Step 1 — Credential Setup

Before executing any skill, check for these environment variables:
- `WC_STORE_URL` — e.g., `https://mystore.com`
- `WC_CONSUMER_KEY` — starts with `ck_`
- `WC_CONSUMER_SECRET` — starts with `cs_`

If not set, ask the user:
1. "What is your WooCommerce store URL?"
2. "Please provide your Consumer Key (ck_...) and Consumer Secret (cs_...)."

**Never log or display credential values in output.**

Generate API keys at: WooCommerce → Settings → Advanced → REST API → Add Key

### Step 2 — Skill Selection

Match the user's request to the appropriate skill. Load the skill's SKILL.md file from the `skills/` directory. Use the Workflow Steps section to execute the task.

### Step 3 — Dry Run First

For any skill that performs mutations (writes, updates, deletes):
- **Always run with `dry_run: true` on first execution**
- Present the preview output to the user
- Ask for explicit confirmation before executing live

### Step 4 — Execute and Report

- Follow the Session Tracking format defined in each skill
- Emit the startup banner, per-operation progress, and completion summary
- Present results in human-readable format unless the user requests JSON or CSV
- For CSV exports: save file as `<skill-name>_<YYYY-MM-DD>.csv`

### Step 5 — Handle Errors

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 401 | Invalid credentials | Ask user to verify Consumer Key/Secret |
| 403 | Insufficient scope | Ask user to regenerate key with Read/Write scope |
| 404 | Resource not found | Confirm ID exists; resource may have been deleted |
| 429 | Rate limited | Wait 2 seconds, retry; reduce per_page to 50 |

## Authentication Pattern

WooCommerce REST API uses Basic Auth over HTTPS:
```
Authorization: Basic base64(consumer_key:consumer_secret)
```

For stores still on HTTP (development only), OAuth 1.0a is required. See `docs/AUTHENTICATION.md`.

## Pagination Pattern

All WooCommerce list endpoints use page/per_page pagination:
```
GET /wp-json/wc/v3/<endpoint>?per_page=100&page=1
```
Check `X-WP-TotalPages` header on first response. Loop until response length < 100.

## Example Invocations

- "Adjust all products in category ID 12 down 15%" → `woo-bulk-price-adjustment`
- "Show me all unfulfilled orders older than 72 hours" → `woo-fulfillment-status-digest`
- "Tag my top customers as Gold tier" → `woo-customer-spend-tier-tagger`
- "Process a refund for order #4521" → `woo-refund-and-reorder`
- "Find abandoned carts from the last 48 hours" → `woo-abandoned-cart-recovery`
- "What's my tax liability for Q1 2025?" → `woo-tax-liability-summary`
- "Are all my shipping zones configured?" → `woo-shipping-zone-audit`
- "Show my top 20 products by revenue this month" → `woo-top-product-performance`
