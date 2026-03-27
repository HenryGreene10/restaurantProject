# Proposed Database Schema (for Review)

Models in dependency order; all except `Restaurant` include `restaurant_id` and are RLS‑protected.

- Restaurant — core tenant
  - id, slug (unique), name, timezone, status (enum), stripe_account_id, stripe_charges_enabled (bool), stripe_payouts_enabled (bool), created_at, updated_at
- BrandConfig — JSON config per tenant
  - id, restaurant_id (unique), config JSONB, created_at, updated_at
- RestaurantDomain — subdomain/custom domain with SSL status
  - id, restaurant_id, hostname (unique), ssl_status (enum), created_at
- AdminUser — roles: OWNER, MANAGER, STAFF, SUPPORT
  - id, restaurant_id, email, password_hash, role, created_at

- Customer — phone‑identified, marketing opt‑ins
  - id, restaurant_id, phone (unique per tenant), email, name, marketing_opt_in (bool), total_spend_cents, created_at, updated_at
- SmsSubscription — SMS consent record
  - id, restaurant_id, customer_id, phone, opted_in (bool), opted_out_at, created_at
- WebPushSubscription — PWA push endpoints
  - id, restaurant_id, customer_id, endpoint (unique per tenant), p256dh, auth, user_agent, created_at

- OperatingHour — weekly hours
  - id, restaurant_id, day_of_week (0–6), opens_at, closes_at
- HolidayHour — specific dates
  - id, restaurant_id, date, opens_at, closes_at, is_closed
- PauseWindow — temporary pause with auto‑resume
  - id, restaurant_id, starts_at, ends_at, reason

- Menu — supports multiple menus per tenant with scheduling
  - id, restaurant_id, name, is_default (bool), schedule_json
- MenuCategory — with sort order & visibility
  - id, restaurant_id, menu_id, name, sort_order, visibility (AVAILABLE/SOLD_OUT/HIDDEN/SCHEDULED), available_from, available_until
- MenuItem — tags, prep time, featured
  - id, restaurant_id, name, description, photo_url, base_price_cents, tags string[], prep_time_minutes, special_instructions_enabled (bool), is_featured (bool), visibility, created_at, updated_at
- MenuCategoryItem — many‑to‑many (items in multiple categories)
  - id, restaurant_id, category_id, item_id, sort_order
- MenuItemVariant — size/price variants
  - id, restaurant_id, item_id, name, price_cents, is_default (bool)
- ModifierGroup — SINGLE or MULTIPLE
  - id, restaurant_id, name, selection, min_select, max_select, allow_option_quantity (bool)
- ModifierOption — with price deltas
  - id, restaurant_id, group_id, name, price_delta_cents, position
- MenuItemModifierGroup — attach groups to items
  - id, restaurant_id, item_id, group_id, is_required (bool), min_selections, max_selections

- RestaurantOrderSequence — atomic per‑tenant order counters
  - restaurant_id (PK/FK), next_value (int)

- Order — state machine + snapshots
  - id, restaurant_id, customer_id, order_number (int), status (PENDING→CONFIRMED→PREPARING→READY→COMPLETED→CANCELLED), payment_status, type (PICKUP/DELIVERY), subtotal_cents, tax_cents, discount_cents, total_cents, promo_code, notes, pickup_time, delivery_address JSONB, stripe_payment_intent_id, created_at, updated_at
- OrderItem — name/variant snapshots
  - id, order_id, restaurant_id, item_id (nullable), name, variant_name, quantity, unit_price_cents, line_price_cents, notes
- OrderItemModifierSelection — modifier snapshots
  - id, order_item_id, restaurant_id, group_name, option_name, price_delta_cents, portion (WHOLE/LEFT/RIGHT)
- OrderStatusEvent — audit trail
  - id, order_id, restaurant_id, from_status, to_status, actor_admin_id, source (admin/kiosk/system/customer), created_at

- Promotion — PERCENT_OFF, AMOUNT_OFF, FREE_ITEM, FREE_DELIVERY
  - id, restaurant_id, code, description, discount_type, value, min_order_cents, per_customer_limit, starts_at, ends_at, active
- PromotionRedemption — linkage
  - id, promotion_id, restaurant_id, customer_id, order_id, created_at

- LoyaltyProgram — PUNCH_CARD or POINTS
  - id, restaurant_id, type, config JSONB
- LoyaltyAccount — per customer per program
  - id, restaurant_id, program_id, customer_id, points, created_at
- LoyaltyEvent — accruals/redemptions
  - id, restaurant_id, account_id, type, delta, created_at

Key Enums
- RestaurantStatus, OrderStatus, PaymentStatus, FulfillmentType, CatalogVisibility

Notes
- All monetary amounts are cents (integers).
- Unique constraints are per‑tenant unless otherwise specified.
