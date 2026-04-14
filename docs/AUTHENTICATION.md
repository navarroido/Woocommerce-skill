# Authentication

WooCommerce AI Skills authenticate with your store using the WooCommerce REST API's built-in authentication system.

---

## 1. Generate API Keys

1. Log in to your WordPress admin dashboard
2. Go to **WooCommerce → Settings → Advanced → REST API**
3. Click **Add Key**
4. Fill in:
   - **Description**: `AI Skills` (or any label)
   - **User**: Select a WordPress admin user
   - **Permissions**: `Read/Write` (required for mutating skills; `Read` is sufficient for report-only skills)
5. Click **Generate API Key**
6. **Copy both values immediately** — the Consumer Secret is only shown once

---

## 2. Permission Scope by Category

| Category | Required Permission |
|----------|-------------------|
| merchandising (read-only skills) | Read |
| merchandising (mutating skills) | Read/Write |
| order-management | Read/Write |
| customer-ops | Read |
| customer-support | Read/Write |
| marketing | Read/Write |
| finance | Read |
| store-management | Read |
| analytics | Read |

**Recommendation:** Generate one Read/Write key for full access. Store it in a password manager.

---

## 3. Set Environment Variables

The recommended way to pass credentials to your agent session:

```bash
export WC_STORE_URL="https://mystore.com"
export WC_CONSUMER_KEY="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export WC_CONSUMER_SECRET="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Add these to your shell profile (`.bashrc`, `.zshrc`) or your agent platform's environment variable settings.

**Never hardcode credentials in skill invocations or commit them to version control.**

---

## 4. Authentication Methods

### HTTPS Stores (Recommended)

For stores running over HTTPS, use HTTP Basic Authentication:

```
Authorization: Basic base64(consumer_key:consumer_secret)
```

Example header value:
```
Authorization: Basic Y2tfYWJjMTIz...
```

Alternatively, pass as query parameters (less secure, avoid in production):
```
GET /wp-json/wc/v3/products?consumer_key=ck_...&consumer_secret=cs_...
```

### HTTP Stores (Development Only)

For stores running over HTTP, WooCommerce requires OAuth 1.0a. The OAuth signature must include:

| Parameter | Value |
|-----------|-------|
| `oauth_consumer_key` | Your Consumer Key (`ck_...`) |
| `oauth_nonce` | Random unique string per request |
| `oauth_signature` | HMAC-SHA1 signature of the request |
| `oauth_signature_method` | `HMAC-SHA1` |
| `oauth_timestamp` | Current Unix timestamp |
| `oauth_version` | `1.0` |

HTTP stores are for local development only. Use HTTPS in production.

---

## 5. Verifying Your Credentials

Test your credentials with a simple read request:

```bash
curl -u "ck_your_key:cs_your_secret" \
  "https://mystore.com/wp-json/wc/v3/system_status"
```

A successful response returns a JSON object with WooCommerce environment details.

---

## 6. Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `401 Unauthorized` | Wrong Consumer Key or Secret | Regenerate and re-copy credentials |
| `401` on HTTP store | Basic Auth not supported on HTTP | Use OAuth 1.0a or switch to HTTPS |
| `403 Forbidden` | Key has Read-only permission | Regenerate with Read/Write scope |
| `404 Not Found` on `/wc/v3/` | REST API disabled | Enable at WooCommerce → Settings → Advanced → REST API |
| `woocommerce_rest_cannot_view` | User lacks capability | Ensure key is tied to an admin user |

---

## 7. Security Best Practices

- Rotate API keys periodically (every 90 days)
- Use separate keys for different agents/integrations
- Keep Consumer Key and Consumer Secret in a password manager, not in files
- Never share keys in Slack, email, or GitHub issues
- Revoke keys immediately if compromised (WooCommerce → Settings → Advanced → REST API → Revoke)
- Use HTTPS — never use production credentials over HTTP
