-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "cloudPrntEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cloudPrntMacAddress" TEXT,
ADD COLUMN     "pendingPrintJob" TEXT;
