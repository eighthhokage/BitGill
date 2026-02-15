-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'mainnet',
    "receiveAddress" TEXT NOT NULL,
    "amountSats" BIGINT NOT NULL,
    "memo" TEXT,
    "notifyEmail" TEXT,
    "requiredConfirmations" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "txid" TEXT,
    "blockHeight" INTEGER,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_slug_key" ON "Invoice"("slug");

-- CreateIndex
CREATE INDEX "Invoice_receiveAddress_idx" ON "Invoice"("receiveAddress");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
