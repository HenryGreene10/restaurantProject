-- Drop the legacy enum-backed role column type requirement.
ALTER TABLE "AdminUser"
  ALTER COLUMN "role" TYPE TEXT USING LOWER("role"::TEXT),
  ALTER COLUMN "role" SET DEFAULT 'owner';

-- Add Clerk identity linkage for admin users.
ALTER TABLE "AdminUser"
  ADD COLUMN "clerkUserId" TEXT;

-- Backfill legacy rows with unique placeholders so the migration is deployable.
-- Existing restaurants should replace these placeholder values with real Clerk user IDs.
UPDATE "AdminUser"
SET "clerkUserId" = 'legacy-admin-' || "id"
WHERE "clerkUserId" IS NULL;

ALTER TABLE "AdminUser"
  ALTER COLUMN "clerkUserId" SET NOT NULL;

CREATE UNIQUE INDEX "AdminUser_clerkUserId_key" ON "AdminUser"("clerkUserId");

-- Remove the obsolete password-hash column now that admin auth is Clerk-based.
ALTER TABLE "AdminUser"
  DROP COLUMN "passwordHash";
