-- AlterTable: LoyaltyAccount — add lifetimePts, isNew, updatedAt
ALTER TABLE "LoyaltyAccount"
  ADD COLUMN "lifetimePts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "isNew"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: LoyaltyEvent — add orderId, description, stripeCouponId
ALTER TABLE "LoyaltyEvent"
  ADD COLUMN "orderId"        TEXT,
  ADD COLUMN "description"    TEXT,
  ADD COLUMN "stripeCouponId" TEXT;
