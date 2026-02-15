-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "receiptSentAt" TIMESTAMP(3),
ADD COLUMN     "receiptTxid" TEXT;
