-- CreateEnum
CREATE TYPE "BookletParcelStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "Booklet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "installmentCount" INTEGER NOT NULL,
    "installmentAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "firstDueDate" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booklet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookletParcel" (
    "id" TEXT NOT NULL,
    "bookletId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "BookletParcelStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookletParcel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booklet_organizationId_idx" ON "Booklet"("organizationId");

-- CreateIndex
CREATE INDEX "Booklet_organizationId_clientId_idx" ON "Booklet"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "Booklet_clientId_idx" ON "Booklet"("clientId");

-- CreateIndex
CREATE INDEX "BookletParcel_bookletId_idx" ON "BookletParcel"("bookletId");

-- CreateIndex
CREATE INDEX "BookletParcel_bookletId_status_idx" ON "BookletParcel"("bookletId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BookletParcel_bookletId_number_key" ON "BookletParcel"("bookletId", "number");

-- AddForeignKey
ALTER TABLE "Booklet" ADD CONSTRAINT "Booklet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booklet" ADD CONSTRAINT "Booklet_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookletParcel" ADD CONSTRAINT "BookletParcel_bookletId_fkey" FOREIGN KEY ("bookletId") REFERENCES "Booklet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
