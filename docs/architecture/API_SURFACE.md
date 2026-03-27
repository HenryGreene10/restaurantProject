# API Surface (Phase 1 Plan)

## Customer Auth
- POST /auth/customer/request-otp
- POST /auth/customer/verify-otp
- POST /auth/customer/refresh

## Public Menu
- GET /menu — full nested menu for tenant
- GET /menu/featured — featured items only

## Admin — Categories
- GET/POST /admin/menu/categories
- PATCH/DELETE /admin/menu/categories/:categoryId
- PATCH /admin/menu/categories/:categoryId/availability

## Admin — Items
- GET/POST /admin/menu/items
- PATCH/DELETE /admin/menu/items/:itemId
- PATCH /admin/menu/items/:itemId/availability

## Admin — Variants
- GET/POST /admin/menu/variants
- PATCH/DELETE /admin/menu/variants/:variantId

## Admin — Modifier Groups
- GET/POST /admin/menu/modifier-groups
- PATCH/DELETE /admin/menu/modifier-groups/:modifierGroupId

## Admin — Modifier Options
- GET/POST /admin/menu/modifier-groups/:modifierGroupId/options
- PATCH/DELETE /admin/menu/modifier-options/:modifierOptionId

## Admin — Item‑Modifier Attachments
- GET/POST /admin/menu/items/:itemId/modifier-groups
- PATCH/DELETE /admin/menu/item-modifier-groups/:itemModifierGroupId

## Orders
- POST /orders — creates order with Stripe Payment Intent
- PATCH /admin/orders/:orderId/status — state machine transition
