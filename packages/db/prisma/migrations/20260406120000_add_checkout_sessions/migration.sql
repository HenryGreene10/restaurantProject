-- CreateEnum
CREATE TYPE "CheckoutSessionStatus" AS ENUM (
    'PENDING',
    'REQUIRES_ACTION',
    'PAYMENT_FAILED',
    'PAYMENT_SUCCEEDED',
    'ORDER_CREATED',
    'EXPIRED'
);

-- CreateTable
CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerNameSnapshot" TEXT,
    "customerPhoneSnapshot" TEXT,
    "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'PICKUP',
    "notes" TEXT,
    "pickupTime" TIMESTAMP(3),
    "deliveryAddressSnapshot" JSONB,
    "cartSnapshot" JSONB NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "status" "CheckoutSessionStatus" NOT NULL DEFAULT 'PENDING',
    "createdOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_stripePaymentIntentId_key" ON "CheckoutSession"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "CheckoutSession_restaurantId_createdAt_idx" ON "CheckoutSession"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "CheckoutSession_restaurantId_status_idx" ON "CheckoutSession"("restaurantId", "status");

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_createdOrderId_fkey" FOREIGN KEY ("createdOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
