-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'AT_RISK', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DeactivationReason" AS ENUM ('AUTO_ABSENCE', 'AUTO_PLAN_EXPIRED', 'MANUAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MEMBER_AT_RISK', 'MEMBER_DEACTIVATED', 'MEMBER_REACTIVATED', 'PLAN_EXPIRING', 'PLAN_EXPIRED');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "activeSince" TIMESTAMP(3),
ADD COLUMN     "autoControl" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivationReason" "DeactivationReason",
ADD COLUMN     "lastCheckInAt" TIMESTAMP(3),
ADD COLUMN     "memberStatus" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "planExpiresAt" DATE,
ADD COLUMN     "planName" TEXT,
ADD COLUMN     "statusChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GymSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "atRiskAfterDays" INTEGER NOT NULL DEFAULT 7,
    "inactiveAfterDays" INTEGER NOT NULL DEFAULT 30,
    "autoDeactivate" BOOLEAN NOT NULL DEFAULT true,
    "autoReactivateOnCheckIn" BOOLEAN NOT NULL DEFAULT true,
    "planExpiringNoticeDays" INTEGER NOT NULL DEFAULT 5,
    "deactivateOnPlanExpired" BOOLEAN NOT NULL DEFAULT false,
    "planExpiredGraceDays" INTEGER NOT NULL DEFAULT 5,
    "notifyAtRisk" BOOLEAN NOT NULL DEFAULT true,
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GymSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GymSettings_organizationId_key" ON "GymSettings"("organizationId");

-- CreateIndex
CREATE INDEX "CheckIn_organizationId_checkedInAt_idx" ON "CheckIn"("organizationId", "checkedInAt");

-- CreateIndex
CREATE INDEX "CheckIn_clientId_checkedInAt_idx" ON "CheckIn"("clientId", "checkedInAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_readAt_idx" ON "Notification"("organizationId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_organizationId_dedupeKey_key" ON "Notification"("organizationId", "dedupeKey");

-- CreateIndex
CREATE INDEX "Client_organizationId_memberStatus_idx" ON "Client"("organizationId", "memberStatus");

-- AddForeignKey
ALTER TABLE "GymSettings" ADD CONSTRAINT "GymSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
