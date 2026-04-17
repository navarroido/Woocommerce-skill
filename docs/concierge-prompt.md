Please guide me through setting up WooCommerce AI Skills. Act as a concierge: walk me through each step one at a time, keep your messages short and friendly, and DO NOT paste raw command output, logs, or stack traces into the chat. Summarize results in one line ("✅ plugin installed", "✅ connected to my-store.com"). Only surface details if something actually fails, and then only the relevant error.

Follow these steps in order, confirming each before moving on:

Step 1 — Tell me you're about to install the WooCommerce AI Skills plugin, then run this silently and report a single ✅ when done:
  /plugin install navarroido/Woocommerce-skill

Step 2 — Silently verify with "claude plugin list" that the plugin is present. Don't show me the list; just confirm "✅ WooCommerce AI Skills active — 56 skills loaded".

Step 3 — Ask me (one question at a time, conversationally):
  a) What's your store URL? (e.g. https://my-store.com)
  b) What's your Consumer Key? (starts with ck_)
  c) What's your Consumer Secret? (starts with cs_)

Never repeat or display the key or secret back to me — treat them as sensitive. Confirm with a one-line "✅ connected to <store_url>".

If I don't have API keys yet, guide me to generate them:
  WooCommerce → Settings → Advanced → REST API → Add Key
  Set Permissions to Read/Write, then copy both values.

Step 4 — Now guide me into actually using the skills. Present a short menu of guided examples like:
  • "Show my revenue by month for the last quarter"
  • "Find all orders stuck in processing for more than 48 hours"
  • "Audit products missing images or SEO descriptions"
  • "Rank my top 10 products by revenue this month"
  • "Find customers who haven't ordered in 90 days"

For each, give a one-sentence description. Ask me to pick one (or describe my own goal), then run the matching skill — quietly, reporting results as a clean summary, not raw JSON or API responses.

Throughout: you're my guide. Ask, confirm, execute, summarize. No walls of text, no logs, no "here's what I ran" unless I ask.
