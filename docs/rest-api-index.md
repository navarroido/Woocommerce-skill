# WooCommerce REST API Endpoint Index

Registry of all WooCommerce REST API endpoints used across skills. Every endpoint in a skill's `rest_endpoints` frontmatter must have a row here.

Validated automatically by `scripts/validate-api-index.mjs`.

---

## Endpoint Registry

| Endpoint | Method | Scope Required | Used In Skills |
|----------|--------|----------------|----------------|
| /wp-json/wc/v3/products | GET | Read | woo-bulk-price-adjustment, woo-product-data-completeness-score, woo-inventory-adjustment, woo-low-stock-restock-alert, woo-dead-stock-identifier, woo-stock-velocity-report, woo-seo-metadata-audit, woo-product-image-audit, woo-duplicate-sku-detector, woo-product-tag-bulk-update, woo-variant-attribute-normalizer, woo-category-reorganization, woo-product-lifecycle-manager, woo-meta-field-bulk-update, woo-inventory-valuation-report, woo-top-product-performance |
| /wp-json/wc/v3/products/{id} | GET | Read | woo-bulk-price-adjustment, woo-product-data-completeness-score |
| /wp-json/wc/v3/products/{id} | PUT | Read/Write | woo-bulk-price-adjustment, woo-inventory-adjustment, woo-product-tag-bulk-update, woo-category-reorganization, woo-product-lifecycle-manager, woo-meta-field-bulk-update |
| /wp-json/wc/v3/products/batch | POST | Read/Write | woo-bulk-price-adjustment |
| /wp-json/wc/v3/products/{id}/variations | GET | Read | woo-bulk-price-adjustment, woo-variant-attribute-normalizer |
| /wp-json/wc/v3/products/{id}/variations/{variation_id} | PUT | Read/Write | woo-inventory-adjustment |
| /wp-json/wc/v3/products/{id}/variations/batch | POST | Read/Write | woo-bulk-price-adjustment |
| /wp-json/wc/v3/products/categories | GET | Read | woo-inventory-valuation-report, woo-category-reorganization, woo-top-product-performance |
| /wp-json/wc/v3/products/tags | GET | Read | woo-product-tag-bulk-update |
| /wp-json/wc/v3/products/attributes | GET | Read | woo-variant-attribute-normalizer |
| /wp-json/wc/v3/orders | GET | Read | woo-fulfillment-status-digest, woo-order-status-bulk-update, woo-bulk-order-notes, woo-cancel-and-restock, woo-tracking-number-update, woo-split-shipment-planner, woo-order-hold-and-release, woo-high-value-order-tagger, woo-refund-and-reorder, woo-order-lookup-and-summary, woo-return-initiation, woo-wismo-bulk-status-report, woo-address-correction, woo-abandoned-cart-recovery, woo-tax-liability-summary, woo-refund-rate-analysis, woo-average-order-value-trends, woo-shipping-cost-analysis, woo-revenue-by-product-category, woo-coupon-discount-impact, woo-top-product-performance, woo-repeat-purchase-rate, woo-conversion-funnel-report, woo-product-cross-sell-analysis |
| /wp-json/wc/v3/orders/{id} | GET | Read | woo-order-lookup-and-summary, woo-refund-and-reorder |
| /wp-json/wc/v3/orders/{id} | PUT | Read/Write | woo-order-status-bulk-update, woo-bulk-order-notes, woo-cancel-and-restock, woo-tracking-number-update, woo-order-hold-and-release, woo-high-value-order-tagger, woo-return-initiation, woo-address-correction |
| /wp-json/wc/v3/orders/{id}/notes | POST | Read/Write | woo-bulk-order-notes |
| /wp-json/wc/v3/orders/{id}/refunds | POST | Read/Write | woo-refund-and-reorder |
| /wp-json/wc/v3/orders/{id}/refunds | GET | Read | woo-refund-rate-analysis |
| /wp-json/wc/v3/orders/batch | POST | Read/Write | woo-order-status-bulk-update, woo-order-hold-and-release |
| /wp-json/wc/v3/customers | GET | Read | woo-customer-spend-tier-tagger, woo-customer-cohort-analysis, woo-b2b-customer-overview, woo-duplicate-customer-finder, woo-marketing-consent-report, woo-customer-note-bulk-annotator, woo-customer-win-back, woo-loyalty-segment-export, woo-repeat-purchase-rate, woo-customer-acquisition-trend |
| /wp-json/wc/v3/customers/{id} | PUT | Read/Write | woo-customer-spend-tier-tagger, woo-customer-note-bulk-annotator |
| /wp-json/wc/v3/coupons | GET | Read | woo-coupon-hygiene-cleanup, woo-coupon-discount-impact |
| /wp-json/wc/v3/coupons | POST | Read/Write | woo-coupon-bulk-generator |
| /wp-json/wc/v3/coupons/{id} | DELETE | Read/Write | woo-coupon-hygiene-cleanup |
| /wp-json/wc/v3/reports/sales | GET | Read | woo-revenue-by-period |
| /wp-json/wc/v3/reports/top_sellers | GET | Read | woo-top-product-performance, woo-stock-velocity-report |
| /wp-json/wc/v3/reports/orders/totals | GET | Read | woo-fulfillment-status-digest, woo-conversion-funnel-report |
| /wp-json/wc/v3/taxes | GET | Read | woo-tax-rate-audit |
| /wp-json/wc/v3/taxes/classes | GET | Read | woo-tax-rate-audit, woo-tax-liability-summary |
| /wp-json/wc/v3/shipping/zones | GET | Read | woo-shipping-zone-audit |
| /wp-json/wc/v3/shipping/zones/{id}/methods | GET | Read | woo-shipping-zone-audit |
| /wp-json/wc/v3/payment_gateways | GET | Read | woo-payment-gateway-status |
| /wp-json/wc/v3/webhooks | GET | Read | woo-webhook-health-check |
| /wp-json/wc/v3/settings | GET | Read | woo-settings-export |
| /wp-json/wc/v3/settings/{group_id} | GET | Read | woo-settings-export |
| /wp-json/wc/v3/settings/{group_id}/{setting_id} | GET | Read | woo-settings-export |

---

## Endpoint Categories

### Products
- `/wp-json/wc/v3/products` — CRUD for simple products
- `/wp-json/wc/v3/products/{id}/variations` — CRUD for variable product variants
- `/wp-json/wc/v3/products/batch` — bulk create/update/delete
- `/wp-json/wc/v3/products/categories` — product category taxonomy
- `/wp-json/wc/v3/products/tags` — product tag taxonomy
- `/wp-json/wc/v3/products/attributes` — product attribute definitions

### Orders
- `/wp-json/wc/v3/orders` — CRUD for orders
- `/wp-json/wc/v3/orders/{id}/refunds` — refund sub-resources
- `/wp-json/wc/v3/orders/{id}/notes` — order notes
- `/wp-json/wc/v3/orders/batch` — bulk order updates

### Customers
- `/wp-json/wc/v3/customers` — CRUD for customer records
- `/wp-json/wc/v3/customers/{id}/downloads` — download permissions

### Coupons
- `/wp-json/wc/v3/coupons` — CRUD for coupon codes

### Reports
- `/wp-json/wc/v3/reports/sales` — sales summary by period
- `/wp-json/wc/v3/reports/top_sellers` — top selling products
- `/wp-json/wc/v3/reports/orders/totals` — order count by status
- `/wp-json/wc/v3/reports/customers/totals` — customer count by type
- `/wp-json/wc/v3/reports/coupons/totals` — coupon usage counts

### Store Configuration
- `/wp-json/wc/v3/taxes` — tax rate CRUD
- `/wp-json/wc/v3/taxes/classes` — tax class definitions
- `/wp-json/wc/v3/shipping/zones` — shipping zone list
- `/wp-json/wc/v3/shipping/zones/{id}/methods` — methods per zone
- `/wp-json/wc/v3/shipping/zones/{id}/locations` — locations per zone
- `/wp-json/wc/v3/payment_gateways` — payment gateway list
- `/wp-json/wc/v3/webhooks` — webhook CRUD
- `/wp-json/wc/v3/settings` — general settings groups
- `/wp-json/wc/v3/settings/{group_id}` — settings per group
- `/wp-json/wc/v3/settings/{group_id}/{setting_id}` — individual setting value
