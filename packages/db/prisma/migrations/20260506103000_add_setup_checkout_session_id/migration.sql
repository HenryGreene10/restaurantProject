ALTER TABLE "Restaurant"
ADD COLUMN "setupCheckoutSessionId" TEXT;

CREATE UNIQUE INDEX "Restaurant_setupCheckoutSessionId_key"
ON "Restaurant"("setupCheckoutSessionId");
