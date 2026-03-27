-- Enable row-level security and create tenant isolation policies.
-- Run once after creating tables (e.g., via a SQL migration).

ALTER TABLE "Restaurant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Domain" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrandTheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Promotion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromotionRedemption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoyaltyAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoyaltyEvent" ENABLE ROW LEVEL SECURITY;

-- Helper function to parse UUID from app variable
CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.restaurant_id')::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Generic policy macro (repeat per table with a restaurantId column)
DO $$ BEGIN
  CREATE POLICY tenant_isolation_restaurant ON "Restaurant"
    USING (id = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- For tables with restaurantId column
\echo Applying policies for tables with restaurantId
DO $$ BEGIN
  CREATE POLICY tenant_isolation_domain ON "Domain" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_brand ON "BrandTheme" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_admin ON "AdminUser" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_customer ON "Customer" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_category ON "MenuCategory" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_item ON "MenuItem" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_variant ON "MenuVariant" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_order ON "Order" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_order_item ON "OrderItem" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_promo ON "Promotion" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_promo_red ON "PromotionRedemption" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_loyalty ON "LoyaltyAccount" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_loyalty_evt ON "LoyaltyEvent" USING ("restaurantId" = app_tenant_id());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
