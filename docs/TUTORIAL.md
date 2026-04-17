# WooCommerce AI Skills — User Tutorial

This guide walks you through installing and using WooCommerce AI Skills with Claude, ChatGPT, Cursor, and other AI platforms to manage your store hands-free.

---

## What You Will Be Able to Do

After following this guide you will be able to ask your AI agent things like:

- *"Show me revenue by category for Q1 2025"*
- *"Find all orders stuck in processing for more than 3 days"*
- *"Tag my top-spending customers as Gold tier"*
- *"Generate 100 unique 15%-off coupon codes expiring end of month"*
- *"Which products have a refund rate above 10%?"*

The AI will connect to your WooCommerce store, run the analysis, and return structured results — no plugin needed, no dashboard required.

---

## Prerequisites

Before you start:

1. A live WooCommerce store (version 3.5.0+)
2. REST API enabled: **WooCommerce → Settings → Advanced → REST API**
3. A Consumer Key and Consumer Secret (see [Authentication Setup](#authentication-setup))
4. An AI agent — Claude Code, Claude.ai, ChatGPT, or Cursor

---

## Step 1 — Generate Your WooCommerce API Keys

1. In your WordPress admin go to **WooCommerce → Settings → Advanced → REST API**
2. Click **Add Key**
3. Set:
   - Description: `AI Skills`
   - User: your admin user
   - Permissions: **Read** for analytics/finance skills; **Read/Write** for management skills
4. Click **Generate API Key**
5. Copy both values — you will only see the secret once:

```
Consumer key:    ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Consumer secret: cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Authentication Setup

Set these in your environment (terminal, `.env` file, or agent session):

```bash
export WC_STORE_URL="https://mystore.com"
export WC_CONSUMER_KEY="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export WC_CONSUMER_SECRET="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**Never share or commit these values.** All skills automatically redact them from output.

---

## Installation

### Claude Code (recommended)

```bash
/plugin install navarroido/Woocommerce-skill
```

That's it. Claude Code reads the skill files and knows how to operate your store.

### Cursor, Cline, GitHub Copilot, Gemini CLI

```bash
npx skills add navarroido/Woocommerce-skill
```

Or install the npm package directly:

```bash
npm install -g woocommerce-ai-skills
woo-skills-install --platform cursor   # or: cline | copilot | gemini | all
```

### ChatGPT (manual — see full guide below)

ChatGPT does not have a plugin system for external skill files, but you can use the skills directly by pasting the relevant skill into your conversation. See [Using with ChatGPT](#using-with-chatgpt).

---

## Use Case 1 — Revenue Report (Finance)

**Skill:** `woo-revenue-by-period`

### Claude Code

After installing the plugin, open Claude Code in your project and ask:

```
What was my net revenue by month for Q1 2025?
Store: https://mystore.com
```

Claude will:

1. Emit the startup banner:

```
╔══════════════════════════════════════════╗
║  SKILL: woo-revenue-by-period            ║
║  STORE: https://mystore.com              ║
║  TIME:  2025-04-17T10:00:00Z             ║
║  MODE:  READ-ONLY                        ║
╚══════════════════════════════════════════╝
```

2. Call the WooCommerce API:

```
[1/3] GET /wp-json/wc/v3/reports/sales → 1 record  | params: period=custom, date_min=2025-01-01, date_max=2025-03-31
[2/3] GET /wp-json/wc/v3/orders        → 100 records | params: status=completed, after=2025-01-01T00:00:00Z
[3/3] GET /wp-json/wc/v3/orders        → 100 records | params: status=refunded, after=2025-01-01T00:00:00Z
```

3. Return a table:

```
period      orders  gross_revenue  refunds   net_revenue
----------  ------  -------------  --------  -----------
2025-01     142     $18,420.50     $820.00   $17,600.50
2025-02     138     $17,105.00     $610.50   $16,494.50
2025-03     161     $21,340.75     $940.25   $20,400.50
```

4. Save a CSV: `woo-revenue-by-period_2025-01-01_2025-03-31.csv`

---

## Use Case 2 — Bulk Price Adjustment (Merchandising)

**Skill:** `woo-bulk-price-adjustment`

This skill writes data, so it **always runs a dry-run preview first** and asks for your confirmation before applying changes.

### Claude Code

```
Reduce all products in the "Summer Sale" category (ID 23) by 20%.
Store: https://mystore.com
```

Claude runs dry-run automatically:

```
╔══════════════════════════════════════════╗
║  SKILL: woo-bulk-price-adjustment        ║
║  STORE: https://mystore.com              ║
║  TIME:  2025-04-17T10:05:00Z             ║
║  MODE:  DRY RUN — no changes applied     ║
╚══════════════════════════════════════════╝

[1/2] GET /wp-json/wc/v3/products → 34 records | params: category=23, status=publish

DRY RUN PREVIEW — 34 products would be updated:

product_id  name                   current_price  new_price  change
----------  ---------------------  -------------  ---------  ------
1042        Linen Summer Dress     $89.00         $71.20     -20%
1043        Cotton Beach Shorts    $45.00         $36.00     -20%
1044        Straw Hat              $32.00         $25.60     -20%
... (31 more)

Total products: 34
Price range after: $20.00 — $143.20

Proceed with live update? (yes/no)
```

You reply `yes` and Claude applies the batch update:

```
[2/2] POST /wp-json/wc/v3/products/batch → 34 products updated

╔══════════════════════════════════════════╗
║  COMPLETE: woo-bulk-price-adjustment     ║
║  RECORDS PROCESSED: 34                   ║
║  OUTPUT: woo-bulk-price-adjustment_...csv║
╚══════════════════════════════════════════╝
```

---

## Use Case 3 — Fulfillment Health Check (Order Management)

**Skill:** `woo-fulfillment-status-digest`

### Claude Code

```
Show me the current fulfillment health of my store.
Flag any orders overdue for more than 48 hours.
```

Output:

```
╔══════════════════════════════════════════╗
║  SKILL: woo-fulfillment-status-digest    ║
║  STORE: https://mystore.com              ║
║  TIME:  2025-04-17T10:10:00Z             ║
║  MODE:  READ-ONLY                        ║
╚══════════════════════════════════════════╝

ORDER STATUS SUMMARY
--------------------
Status        Count   % of Total
pending         12     5.4%
processing      87    39.4%   ← 23 orders >48h overdue ⚠
on-hold         14     6.3%
completed      107    48.4%
cancelled        1     0.5%

SLA VIOLATIONS (processing >48h):
Order #5821 — placed 2025-04-14 — $234.50 — John Smith
Order #5834 — placed 2025-04-14 — $87.00  — Maria Garcia
... (21 more)

Recommendation: 23 orders need immediate attention.
```

---

## Use Case 4 — Customer Tier Tagging (Customer Ops)

**Skill:** `woo-customer-spend-tier-tagger`

This skill assigns Bronze / Silver / Gold tiers based on lifetime spend.

### Claude Code

```
Segment all customers into spend tiers:
- Bronze: $0–$500
- Silver: $500–$2000
- Gold: $2000+

Store: https://mystore.com
```

Dry-run output:

```
TIER PREVIEW (dry_run: true)

Tier     Customers  Spend Range         % of Base
-------  ---------  ------------------  ---------
Gold          48    $2,000 – $14,820     3.2%
Silver       312    $500 – $1,999        20.8%
Bronze      1,147   $1 – $499            76.0%

23 customers have $0 spend (no orders) — excluded.

Apply tier tags to all 1,507 customers? (yes/no)
```

After confirmation, Claude updates each customer via `PUT /wp-json/wc/v3/customers/{id}` and exports a CSV.

---

## Use Case 5 — Top Products Report (Analytics)

**Skill:** `woo-top-product-performance`

### Claude Code

```
Show me my top 10 products by net revenue for March 2025.
Include refund rate.
```

Output:

```
TOP 10 PRODUCTS — March 2025

Rank  Product                  Revenue     Units  Refund Rate
----  -----------------------  ----------  -----  -----------
1     Linen Summer Dress       $4,820.00   54     2.1%
2     Premium Yoga Mat         $3,240.00   81     0.0%
3     Straw Hat                $2,108.00   66     1.5%
4     Cotton Beach Shorts      $1,980.00   44     4.5%  ⚠
5     Bamboo Water Bottle      $1,745.00   99     0.0%
6     SPF 50 Sunscreen         $1,620.00   108    1.9%
7     Silk Scarf               $1,480.00   37     0.0%
8     Wicker Beach Bag         $1,320.00   33     3.0%
9     Canvas Tote              $1,180.00   59     1.7%
10    Flip Flops               $980.00     98     5.1%  ⚠

⚠ = refund rate above 3% threshold
```

---

## Using with Claude.ai (claude.ai)

Claude.ai (the web interface) does not load skill files automatically, but you can paste a skill directly into the conversation.

**Step 1** — Fetch the skill you need:

```bash
curl https://raw.githubusercontent.com/navarroido/Woocommerce-skill/main/skills/finance/woo-revenue-by-period/SKILL.md
```

**Step 2** — Start a Claude.ai conversation and paste:

```
You are a WooCommerce store management agent. Follow the skill instructions below exactly.

<skill>
[paste the SKILL.md content here]
</skill>

My store credentials:
- store_url: https://mystore.com
- consumer_key: ck_...
- consumer_secret: cs_...

Run this skill for Q1 2025 (2025-01-01 to 2025-03-31).
```

Claude will follow the workflow steps, make the API calls (if given a tool or via instructions to you to fetch URLs), and format the output exactly as specified in the skill.

---

## Using with ChatGPT

ChatGPT does not execute API calls directly, but you can use it in two ways:

### Option A — ChatGPT as Analyst (you fetch, it analyses)

1. Fetch order data from your store manually or via a script
2. Paste the JSON into ChatGPT with the skill as context

**Example prompt:**

```
You are a WooCommerce revenue analyst. I will give you raw order data.
Compute net revenue by month (gross minus refunds), group by month,
and return a table with columns: period, orders, gross_revenue, refunds, net_revenue.

Here is the data from my WooCommerce store (exported via REST API):
[paste JSON array of orders]
```

### Option B — Custom GPT with Skill System Prompt

Build a Custom GPT at [chatgpt.com/gpts/editor](https://chatgpt.com/gpts/editor) with:

**System prompt:**

```
You are a WooCommerce store management expert. You help store owners analyse
their WooCommerce data using the REST API (WC/v3).

When the user asks about revenue, use:
GET /wp-json/wc/v3/reports/sales?period=custom&date_min=YYYY-MM-DD&date_max=YYYY-MM-DD

When the user asks about orders, use:
GET /wp-json/wc/v3/orders?status=<status>&after=<date>&per_page=100&page=N

Authentication: Basic Auth — base64(consumer_key:consumer_secret)
Pagination: loop page=1,2,3... until response length < 100

Always ask for store_url, consumer_key, consumer_secret if not provided.
Never output credential values in responses.
Always show a dry-run preview before suggesting mutations.
```

**Enable:** ChatGPT Actions pointing to `https://mystore.com/wp-json/wc/v3/` with Basic Auth schema.

This makes ChatGPT call your store's API directly through Actions — no copy-pasting needed.

### Option C — OpenAI API + Skills as System Message

```python
import openai
import requests
import base64
import json

# Fetch skill content
skill_url = "https://raw.githubusercontent.com/navarroido/Woocommerce-skill/main/skills/finance/woo-revenue-by-period/SKILL.md"
skill_content = requests.get(skill_url).text

# Your store credentials
STORE_URL = "https://mystore.com"
CK = "ck_xxxxxxxxxxxxxxxxxxxx"
CS = "cs_xxxxxxxxxxxxxxxxxxxx"

# Fetch WooCommerce data
auth = base64.b64encode(f"{CK}:{CS}".encode()).decode()
headers = {"Authorization": f"Basic {auth}"}

orders = []
page = 1
while True:
    resp = requests.get(
        f"{STORE_URL}/wp-json/wc/v3/orders",
        headers=headers,
        params={
            "status": "completed",
            "after": "2025-01-01T00:00:00Z",
            "before": "2025-03-31T23:59:59Z",
            "per_page": 100,
            "page": page,
        }
    )
    batch = resp.json()
    orders.extend(batch)
    if len(batch) < 100:
        break
    page += 1

# Ask ChatGPT to analyse
client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": f"You are a WooCommerce analyst. Follow this skill:\n\n{skill_content}"
        },
        {
            "role": "user",
            "content": f"Analyse this order data and produce the revenue by period report:\n\n{json.dumps(orders[:50])}"
        }
    ]
)

print(response.choices[0].message.content)
```

---

## Using with Cursor

After running `npx skills add navarroido/Woocommerce-skill`, all 56 skills are available as `.mdc` rule files in `.cursor/rules/`.

Open any file in your project and use Cursor Chat:

```
@woo-top-product-performance
Show me top 20 products by revenue for April 2025.
Store: https://mystore.com
```

Cursor reads the skill rule and executes the workflow inline.

---

## Tips and Best Practices

### Always dry-run first

Every mutating skill (price changes, order updates, coupon creation) defaults to `dry_run: true`. Never skip the preview step — review the change list before confirming.

### Date format

Always use `YYYY-MM-DD`:

```
date_after: 2025-01-01
date_before: 2025-03-31
```

### Rate limits

If you have a large store (10,000+ orders), the agent may hit rate limits. Add this to your prompt:

```
If you hit a 429 error, wait 2 seconds and retry. Reduce per_page to 50 if needed.
```

### Combine skills

Skills work together. For example:

```
1. Run woo-revenue-by-product-category for Q1 2025
2. Then run woo-refund-rate-analysis for the same period grouped by category
3. Tell me which categories have high revenue but also high refund rates
```

### Output formats

All skills support two output formats:

```
format: human   ← readable tables (default)
format: json    ← machine-readable, for further processing
```

---

## Skill Reference Card

| Goal | Skill | Mutating |
|------|-------|----------|
| Revenue by month/week/day | `woo-revenue-by-period` | No |
| Revenue by product category | `woo-revenue-by-product-category` | No |
| Top products by revenue | `woo-top-product-performance` | No |
| Tax liability summary | `woo-tax-liability-summary` | No |
| Refund rate by product | `woo-refund-rate-analysis` | No |
| Average order value trends | `woo-average-order-value-trends` | No |
| Coupon discount impact | `woo-coupon-discount-impact` | No |
| Fulfillment health check | `woo-fulfillment-status-digest` | No |
| Orders overdue (WISMO) | `woo-wismo-bulk-status-report` | No |
| Top customer segments | `woo-customer-spend-tier-tagger` | Yes |
| Bulk price adjustment | `woo-bulk-price-adjustment` | Yes |
| Generate coupon codes | `woo-coupon-bulk-generator` | Yes |
| Process a refund | `woo-refund-and-reorder` | Yes |
| Update order status | `woo-order-status-bulk-update` | Yes |
| Audit shipping zones | `woo-shipping-zone-audit` | No |
| Check payment gateways | `woo-payment-gateway-status` | No |
| Product image audit | `woo-product-image-audit` | No |
| SEO metadata audit | `woo-seo-metadata-audit` | No |
| Low stock alert | `woo-low-stock-restock-alert` | No |

See [CATALOG.md](../CATALOG.md) for all 56 skills.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `401 Unauthorized` | Verify Consumer Key and Secret are correct and not expired |
| `403 Forbidden` | Regenerate the key with Read/Write permissions |
| `429 Too Many Requests` | Ask the agent to wait 2 seconds and retry; or reduce per_page to 50 |
| Agent doesn't follow skill steps | Paste the SKILL.md content explicitly into the conversation |
| No orders returned | Check that `date_after` / `date_before` match your store timezone |
| CSV not saved | Ask the agent: "Save the output to a CSV file in the current directory" |
