#!/usr/bin/env bash
# scaffold.sh — Interactive skill scaffolding tool
# Usage: pnpm scaffold  OR  bash scripts/scaffold.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT/docs/skill-template.md"

CATEGORIES=(
  "merchandising"
  "order-management"
  "customer-ops"
  "customer-support"
  "marketing"
  "finance"
  "store-management"
  "analytics"
)

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   WooCommerce AI Skills — Scaffolding    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Step 1: Choose category
echo "Choose a category:"
for i in "${!CATEGORIES[@]}"; do
  printf "  %d) %s\n" "$((i+1))" "${CATEGORIES[$i]}"
done

echo ""
read -rp "Category number: " cat_num

if ! [[ "$cat_num" =~ ^[1-8]$ ]]; then
  echo "Invalid choice. Must be 1–8."
  exit 1
fi

CATEGORY="${CATEGORIES[$((cat_num-1))]}"

# Step 2: Skill slug
echo ""
read -rp "Skill slug (kebab-case, no 'woo-' prefix — e.g. 'low-stock-restock-alert'): " SLUG

if ! [[ "$SLUG" =~ ^[a-z][a-z0-9-]+$ ]]; then
  echo "Invalid slug. Use lowercase letters, numbers, and hyphens only."
  exit 1
fi

FULL_NAME="woo-$SLUG"
SKILL_DIR="$ROOT/skills/$CATEGORY/$FULL_NAME"

if [[ -d "$SKILL_DIR" ]]; then
  echo "Skill '$FULL_NAME' already exists in $CATEGORY/. Aborting."
  exit 1
fi

# Step 3: Description
echo ""
read -rp "One-sentence description: " DESCRIPTION

# Step 4: Mutation
echo ""
read -rp "Does this skill mutate data? (y/n): " MUTATES

if [[ "$MUTATES" == "y" || "$MUTATES" == "Y" ]]; then
  SAFETY_TEXT="**Steps N–M execute irreversible mutations.** Always run with \`dry_run: true\` first and verify the preview before executing live."
else
  DESCRIPTION="Read-only: $DESCRIPTION"
  SAFETY_TEXT="Read-only skill — no mutations are executed. Safe to run at any time."
fi

# Create skill directory and file
mkdir -p "$SKILL_DIR"
SKILL_FILE="$SKILL_DIR/SKILL.md"

cat > "$SKILL_FILE" << SKILLEOF
---
name: $FULL_NAME
role: $CATEGORY
description: "$DESCRIPTION"
toolkit: woocommerce-rest-api, woocommerce-rest-execution
api_version: "wc/v3"
rest_endpoints:
  - GET /products
status: stable
compatibility: Claude Code, Cursor, Cline, Codex, Gemini CLI
---

# $FULL_NAME

## Purpose

$DESCRIPTION

<!-- Expand this paragraph with the full business context. -->

## Prerequisites

- WooCommerce store with REST API enabled (WooCommerce → Settings → Advanced → REST API)
- Consumer Key and Consumer Secret with **Read** scope (or **Read/Write** for mutating skills)
- Store accessible over HTTPS
- Minimum WooCommerce version: 3.5.0

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| \`store_url\` | string | yes | — | Base URL of the WooCommerce store (e.g., \`https://mystore.com\`) |
| \`consumer_key\` | string | yes | — | WooCommerce REST API consumer key (\`ck_...\`) |
| \`consumer_secret\` | string | yes | — | WooCommerce REST API consumer secret (\`cs_...\`) |
| \`dry_run\` | bool | no | \`false\` | Preview changes without executing mutations |
| \`format\` | string | no | \`human\` | Output format: \`human\` or \`json\` |

## Authentication

WooCommerce uses OAuth 1.0a for HTTP and Basic Auth over HTTPS.

For HTTPS stores (recommended):

\`\`\`
Authorization: Basic base64(consumer_key:consumer_secret)
\`\`\`

For HTTP stores (development only): Use OAuth 1.0a — include oauth_consumer_key, oauth_nonce, oauth_signature, oauth_signature_method=HMAC-SHA1, oauth_timestamp, oauth_version=1.0

Never log or output consumer_key or consumer_secret values.

See docs/AUTHENTICATION.md for full setup instructions.

## Safety

$SAFETY_TEXT

## Workflow Steps

**Step 1 — Fetch data**

\`\`\`
GET /wp-json/wc/v3/<endpoint>
  ?per_page=100&page=1
\`\`\`

Extract: \`id\`, \`field_1\`, \`field_2\`
Continue paginating until response length < per_page.

<!-- Add remaining steps here -->

## API Endpoints Used

\`\`\`
GET  /wp-json/wc/v3/<endpoint>      — fetch data
\`\`\`

## Pagination Strategy

WooCommerce REST API uses page/per_page pagination (not cursor-based).

Standard pattern:

\`\`\`
page = 1
while True:
  response = GET /endpoint?per_page=100&page=page
  process(response)
  if len(response) < 100: break
  page += 1
\`\`\`

Maximum per_page is 100 for most endpoints.
The X-WP-Total and X-WP-TotalPages response headers report totals.
Always read X-WP-TotalPages on the first request to estimate job size.

## Session Tracking

Claude MUST emit the following output at each stage. This is mandatory.

STARTUP:

\`\`\`
╔══════════════════════════════════════════╗
║  SKILL: $FULL_NAME
║  STORE: <store_url>                      ║
║  TIME:  <ISO-8601 UTC>                   ║
║  MODE:  <DRY RUN | LIVE>                 ║
╚══════════════════════════════════════════╝
\`\`\`

PER-OPERATION (emit after each API call batch):

\`\`\`
[N/TOTAL] <METHOD> <endpoint> → <result_count> records | params: <key>=<val>
\`\`\`

COMPLETION (human format):

\`\`\`
╔══════════════════════════════════════════╗
║  COMPLETE: $FULL_NAME
║  RECORDS PROCESSED: <n>                  ║
║  OUTPUT: <filename or "stdout">          ║
╚══════════════════════════════════════════╝
\`\`\`

COMPLETION (json format):

\`\`\`json
{
  "skill": "$FULL_NAME",
  "store": "<store_url>",
  "completed_at": "<ISO-8601>",
  "records_processed": <n>,
  "output_file": "<path or null>",
  "dry_run": <bool>
}
\`\`\`

## Output Format

<!-- Describe the human-readable output (ASCII table, summary) -->
<!-- For CSV: filename pattern is ${FULL_NAME}_<YYYY-MM-DD>.csv + list columns -->

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| \`401 Unauthorized\` | Invalid or missing credentials | Verify consumer_key and consumer_secret |
| \`403 Forbidden\` | Consumer Key lacks required scope | Regenerate key with Read/Write scope |
| \`404 Not Found\` | Resource ID does not exist | Check the ID; resource may have been deleted |
| \`429 Too Many Requests\` | Rate limit hit during pagination | Wait 2 seconds and retry; reduce per_page to 50 |
| \`woocommerce_rest_*\` error in body | WooCommerce validation failure | See \`message\` field in response JSON |

## Best Practices

- Run with \`dry_run: true\` first and verify the preview before executing live.
- <!-- Skill-specific best practice 2 -->
- <!-- Skill-specific best practice 3 -->
SKILLEOF

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ Skill scaffolded successfully!        ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  File: skills/$CATEGORY/$FULL_NAME/SKILL.md"
echo ""
echo "Next steps:"
echo "  1. Fill in the Workflow Steps section"
echo "  2. Update rest_endpoints in the frontmatter"
echo "  3. Add endpoints to docs/rest-api-index.md"
echo "  4. Run: pnpm validate && pnpm lint"
echo ""
