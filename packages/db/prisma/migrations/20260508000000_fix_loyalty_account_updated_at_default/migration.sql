-- Fix LoyaltyAccount.updatedAt: remove the database-level DEFAULT added by
-- the hand-written migration. Prisma's @updatedAt manages this value via the
-- query engine, so a DB default causes schema drift on migrate diff.
ALTER TABLE "LoyaltyAccount" ALTER COLUMN "updatedAt" DROP DEFAULT;
