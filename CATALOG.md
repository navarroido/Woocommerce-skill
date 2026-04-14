# WooCommerce AI Skills — Catalog

> Auto-generated on 2026-04-14 · 56 skills · 8 categories

---

## merchandising/ (15 skills)

| Skill | Description | Mutations? |
|-------|-------------|------------|
| `woo-bulk-price-adjustment` | Adjust prices across products or a category by fixed amount or percentage with min/max guards and dry-run preview before any changes are applied. | ✏️ Yes |
| `woo-category-reorganization` | Reassign products between categories in bulk based on tag or meta_data filter rules with dry-run preview. | ✏️ Yes |
| `woo-dead-stock-identifier` | Read-only: Find products with zero sales in the last N days but positive stock — candidates for markdown, clearance, or removal. | 👁️ Read-only |
| `woo-duplicate-sku-detector` | Read-only: Detect duplicate SKUs across simple and variable products and export a conflict report. | 👁️ Read-only |
| `woo-inventory-adjustment` | Set or increment stock quantities for one or many SKUs via the REST API with dry-run preview before any stock changes are applied. | ✏️ Yes |
| `woo-inventory-valuation-report` | Read-only: Calculate total inventory value (stock_quantity × price) by category and export as a financial summary. | 👁️ Read-only |
| `woo-low-stock-restock-alert` | Read-only: Query products below a configurable stock threshold and export a prioritized reorder sheet grouped by category. | 👁️ Read-only |
| `woo-meta-field-bulk-update` | Add or update a WooCommerce meta_data field across a filtered product set with dry-run preview. | ✏️ Yes |
| `woo-product-data-completeness-score` | Read-only: Score each product against a required fields checklist (images, description, weight, SKU, attributes) and export a completeness gap report. | 👁️ Read-only |
| `woo-product-image-audit` | Read-only: Identify products with no images, fewer images than threshold, or images missing alt text. | 👁️ Read-only |
| `woo-product-lifecycle-manager` | Move products between draft, pending, private, and publish statuses in bulk based on age or sales thresholds with dry-run preview. | ✏️ Yes |
| `woo-product-tag-bulk-update` | Add or remove tags from a filtered set of products (by category, price range, or stock status) with dry-run preview. | ✏️ Yes |
| `woo-seo-metadata-audit` | Read-only: Scan products and categories for missing or short SEO titles and meta descriptions and export a prioritized gap report. | 👁️ Read-only |
| `woo-stock-velocity-report` | Read-only: Compute units-sold-per-day per SKU over a rolling window and flag fast-movers and slow-movers. | 👁️ Read-only |
| `woo-variant-attribute-normalizer` | Read-only: Find product variations where attribute values are inconsistently cased or spelled, and export a normalization report. | 👁️ Read-only |

## order-management/ (8 skills)

| Skill | Description | Mutations? |
|-------|-------------|------------|
| `woo-bulk-order-notes` | Append a private or customer-visible note to multiple orders matching a status, date, or payment method filter. | ✏️ Yes |
| `woo-cancel-and-restock` | Cancel one or many WooCommerce orders and restore stock quantities for all line items with dry-run preview. | ✏️ Yes |
| `woo-fulfillment-status-digest` | Read-only: Aggregate order counts by status and flag orders overdue for processing based on a configurable SLA age threshold. | 👁️ Read-only |
| `woo-high-value-order-tagger` | Tag orders above a configurable total threshold with a custom meta field for priority handling with dry-run preview. | ✏️ Yes |
| `woo-order-hold-and-release` | Set orders to on-hold status with a timestamped note and bulk-release them back to processing when ready. | ✏️ Yes |
| `woo-order-status-bulk-update` | Move a filtered set of orders (by date, current status, or payment method) to a new status with dry-run preview. | ✏️ Yes |
| `woo-split-shipment-planner` | Read-only: Identify orders with mixed in-stock and backordered items to plan split shipments. | 👁️ Read-only |
| `woo-tracking-number-update` | Set or update tracking number and shipping provider meta on WooCommerce fulfilled orders with dry-run preview. | ✏️ Yes |

## customer-ops/ (6 skills)

| Skill | Description | Mutations? |
|-------|-------------|------------|
| `woo-b2b-customer-overview` | Read-only: Export customers with a B2B role or meta_data flag including order count, lifetime spend, and last order date. | 👁️ Read-only |
| `woo-customer-cohort-analysis` | Read-only: Group customers by registration month and compute cohort purchase rates, order counts, and lifetime value. | 👁️ Read-only |
| `woo-customer-note-bulk-annotator` | Append a note to multiple customers matching a role, spend range, or country filter with dry-run preview. | ✏️ Yes |
| `woo-customer-spend-tier-tagger` | Segment customers into Bronze, Silver, and Gold tiers based on lifetime total_spent and write the tier as a customer meta field. | ✏️ Yes |
| `woo-duplicate-customer-finder` | Read-only: Identify customer records sharing billing_email or shipping address to flag for merge or deduplication. | 👁️ Read-only |
| `woo-marketing-consent-report` | Read-only: Export customers with marketing opt-in status from user meta for email list compliance and GDPR auditing. | 👁️ Read-only |

## customer-support/ (5 skills)

| Skill | Description | Mutations? |
|-------|-------------|------------|
| `woo-address-correction` | Update billing or shipping address fields on a WooCommerce order with a private audit note. | ✏️ Yes |
| `woo-order-lookup-and-summary` | Read-only: Retrieve a WooCommerce order by ID or customer email and produce a human-readable support summary. | 👁️ Read-only |
| `woo-refund-and-reorder` | Process a full or partial refund on a WooCommerce order and optionally create a replacement order for the customer. | ✏️ Yes |
| `woo-return-initiation` | Update order status to returned/refunded and log a timestamped note with return reason. | ✏️ Yes |
| `woo-wismo-bulk-status-report` | Read-only: Find all unfulfilled orders older than N days and export a WISMO (Where Is My Order) CSV for proactive customer communication. | 👁️ Read-only |

## marketing/ (5 skills)

| Skill | Description | Mutations? |
|-------|-------------|------------|
| `woo-abandoned-cart-recovery` | Read-only: Query WooCommerce pending orders older than a configurable threshold and export a re-engagement list for abandoned cart recovery campaigns. | 👁️ Read-only |
| `woo-coupon-bulk-generator` | Create N unique coupon codes with configurable discount type, amount, and expiry date with dry-run preview. | ✏️ Yes |
| `woo-coupon-hygiene-cleanup` | Find expired, zero-use, or past-expiry coupons and batch-delete after confirmation. | ✏️ Yes |
| `woo-customer-win-back` | Read-only: Identify customers who haven't ordered in N days and export with last-order context for win-back campaigns. | 👁️ Read-only |
| `woo-loyalty-segment-export` | Read-only: Export customers meeting spend or order-count thresholds for loyalty program enrollment. | 👁️ Read-only |

## finance/ (7 skills)

| Skill | Description | Mutations? |
|-------|-------------|------------|
| `woo-average-order-value-trends` | Read-only: Track average order value over rolling windows and flag statistically significant changes. | 👁️ Read-only |
| `woo-coupon-discount-impact` | Read-only: Quantify total discount value applied per coupon code over a specified period. | 👁️ Read-only |
| `woo-refund-rate-analysis` | Read-only: Compute refund rate by product, category, or period from order and refund data. | 👁️ Read-only |
| `woo-revenue-by-period` | Read-only: Aggregate gross revenue, refunds, and net revenue by day, week, or month using WooCommerce reports. | 👁️ Read-only |
| `woo-revenue-by-product-category` | Read-only: Break down net revenue contribution by WooCommerce product category for a specified period. | 👁️ Read-only |
| `woo-shipping-cost-analysis` | Read-only: Compare shipping_total collected from customers against configured shipping zone rates to identify pricing gaps. | 👁️ Read-only |
| `woo-tax-liability-summary` | Read-only: Sum tax_lines by tax class and rate across completed orders for a specified period and export a tax liability report. | 👁️ Read-only |

## store-management/ (5 skills)

| Skill | Description | Mutations? |
|-------|-------------|------------|
| `woo-payment-gateway-status` | Read-only: Query all enabled payment gateways and their configuration status. | 👁️ Read-only |
| `woo-settings-export` | Read-only: Export all WooCommerce general, tax, shipping, and checkout settings as a structured report. | 👁️ Read-only |
| `woo-shipping-zone-audit` | Read-only: List all shipping zones with their methods and rates, flag zones with no active methods configured, and identify gaps in geographic coverage. | 👁️ Read-only |
| `woo-tax-rate-audit` | Read-only: List tax rates by class and country, identify gaps and duplicates. | 👁️ Read-only |
| `woo-webhook-health-check` | Read-only: List all webhooks with delivery URL, status, and failure count. | 👁️ Read-only |

## analytics/ (5 skills)

| Skill | Description | Mutations? |
|-------|-------------|------------|
| `woo-conversion-funnel-report` | Read-only: Compute pending/on-hold/completed order ratios to surface checkout conversion insights. | 👁️ Read-only |
| `woo-customer-acquisition-trend` | Read-only: Track new customer registrations by month and compute first-order conversion rate. | 👁️ Read-only |
| `woo-product-cross-sell-analysis` | Read-only: Identify products most frequently purchased together in the same order. | 👁️ Read-only |
| `woo-repeat-purchase-rate` | Read-only: Compute the percentage of customers who placed more than one order within a specified window. | 👁️ Read-only |
| `woo-top-product-performance` | Read-only: Rank products by units sold, net revenue, and refund rate over a configurable period and export a performance report. | 👁️ Read-only |

---

*Generated by `pnpm build:catalog`. Do not edit manually.*
