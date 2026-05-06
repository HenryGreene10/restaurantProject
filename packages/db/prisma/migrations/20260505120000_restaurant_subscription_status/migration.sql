CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'CANCELLED');

ALTER TABLE "Restaurant"
ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING';

-- Existing restaurants are already live customers — activate them.
UPDATE "Restaurant" SET "subscriptionStatus" = 'ACTIVE';
