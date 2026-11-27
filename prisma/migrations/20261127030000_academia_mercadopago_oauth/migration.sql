-- Conta Mercado Pago por academia (OAuth). Só cria tabela nova (nada é alterado ou apagado).

-- CreateTable
CREATE TABLE "MercadoPagoConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "mpUserId" TEXT,
    "mpNickname" TEXT,
    "mpEmail" TEXT,
    "publicKey" TEXT,
    "liveMode" BOOLEAN,
    "scope" TEXT,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "expiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "connectedById" TEXT,
    "lastRefreshAt" TIMESTAMP(3),
    "lastError" TEXT,
    "oauthNonce" TEXT,
    "oauthNonceExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MercadoPagoConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MercadoPagoConnection_organizationId_key" ON "MercadoPagoConnection"("organizationId");

-- CreateIndex
CREATE INDEX "MercadoPagoConnection_mpUserId_idx" ON "MercadoPagoConnection"("mpUserId");

-- AddForeignKey
ALTER TABLE "MercadoPagoConnection" ADD CONSTRAINT "MercadoPagoConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
