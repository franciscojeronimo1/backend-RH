-- Cobrança Pix (Mercado Pago) nas mensalidades da academia. Só adiciona colunas/valores (nada é apagado).

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_ISSUE';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "externalPaymentId" TEXT,
ADD COLUMN "pixStatus" TEXT,
ADD COLUMN "pixAmount" DECIMAL(10,2),
ADD COLUMN "pixQrCode" TEXT,
ADD COLUMN "pixQrCodeBase64" TEXT,
ADD COLUMN "pixTicketUrl" TEXT,
ADD COLUMN "pixExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Payment_externalPaymentId_idx" ON "Payment"("externalPaymentId");
