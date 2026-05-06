# Audit Remediation Tasks

## Security

- [x] Remove claimLegacyAdminAccessByEmail bridge (PR open: security/remove-email-bridge — merge to close)
- [x] Add rate limiting to POST /v1/orders (cash order path)
- [x] Fix CORS — currently allows all \*.vercel.app
- [x] Add order item count limit at application level

## Structural

- [x] Fix /health endpoint to actually check DB connectivity
- [x] Add idempotency key guard to order creation webhook path
- [x] Replace console.error with structured logging and correlation IDs
- [ ] Wire up Redis for notification worker instead of polling PostgreSQL every 2s — **deferred to next phase**
- [x] Add DB migration CI gate to GitHub Actions pipeline
- [x] Add pagination to all list endpoints (admin orders, menu items)
- [x] Add soft-delete for menu items to protect order history

## Refactoring

- [x] Break up apps/admin/src/pages/App.tsx (1000+ lines)
- [x] Clean up apps/pwa/ dead code or remove entirely

## Missing Features

- [x] Build loyalty points UI so customers can see and redeem points
