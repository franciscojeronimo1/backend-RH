-- Módulo Academia + tipo de empresa (businessType) + cobrança manual (billingExempt).
-- Só cria tabelas/colunas novas; não altera dados de Client/carnês.
-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('STANDARD', 'GYM');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'AT_RISK', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DeactivationReason" AS ENUM ('AUTO_ABSENCE', 'AUTO_PLAN_EXPIRED', 'MANUAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MEMBER_AT_RISK', 'MEMBER_DEACTIVATED', 'MEMBER_REACTIVATED', 'PLAN_EXPIRING', 'PLAN_EXPIRED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('PASSWORD', 'FINGERPRINT', 'CARD');

-- CreateEnum
CREATE TYPE "AccessMethod" AS ENUM ('MANUAL', 'PASSWORD', 'FINGERPRINT', 'CARD');

-- CreateEnum
CREATE TYPE "AccessDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "AccessResult" AS ENUM ('GRANTED', 'DENIED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "billingExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "businessType" "BusinessType" NOT NULL DEFAULT 'STANDARD';

-- CreateTable
CREATE TABLE "GymSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
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
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "birthDate" DATE,
    "notes" TEXT,
    "accessCode" TEXT,
    "memberStatus" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "autoControl" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckInAt" TIMESTAMP(3),
    "activeSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusChangedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "deactivationReason" "DeactivationReason",
    "planName" TEXT,
    "planExpiresAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "durationMonths" INTEGER NOT NULL DEFAULT 1,
    "durationDays" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT,
    "createdById" TEXT,
    "planName" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "membershipId" TEXT,
    "receivedById" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethod",
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessDevice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "ipAddress" TEXT,
    "apiKeyHash" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberCredential" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "deviceId" TEXT,
    "type" "CredentialType" NOT NULL,
    "identifier" TEXT,
    "deviceUserId" TEXT,
    "template" TEXT,
    "label" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT,
    "deviceId" TEXT,
    "userId" TEXT,
    "method" "AccessMethod" NOT NULL,
    "direction" "AccessDirection" NOT NULL DEFAULT 'IN',
    "result" "AccessResult" NOT NULL DEFAULT 'GRANTED',
    "reason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT,
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
CREATE INDEX "Member_organizationId_memberStatus_idx" ON "Member"("organizationId", "memberStatus");

-- CreateIndex
CREATE INDEX "Member_organizationId_name_idx" ON "Member"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Member_organizationId_planExpiresAt_idx" ON "Member"("organizationId", "planExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_cpf_key" ON "Member"("organizationId", "cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Member_organizationId_accessCode_key" ON "Member"("organizationId", "accessCode");

-- CreateIndex
CREATE INDEX "MembershipPlan_organizationId_active_idx" ON "MembershipPlan"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_organizationId_name_key" ON "MembershipPlan"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Membership_organizationId_endDate_idx" ON "Membership"("organizationId", "endDate");

-- CreateIndex
CREATE INDEX "Membership_memberId_endDate_idx" ON "Membership"("memberId", "endDate");

-- CreateIndex
CREATE INDEX "Payment_organizationId_status_dueDate_idx" ON "Payment"("organizationId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Payment_memberId_dueDate_idx" ON "Payment"("memberId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "AccessDevice_apiKeyHash_key" ON "AccessDevice"("apiKeyHash");

-- CreateIndex
CREATE INDEX "AccessDevice_organizationId_idx" ON "AccessDevice"("organizationId");

-- CreateIndex
CREATE INDEX "MemberCredential_memberId_idx" ON "MemberCredential"("memberId");

-- CreateIndex
CREATE INDEX "MemberCredential_deviceId_deviceUserId_idx" ON "MemberCredential"("deviceId", "deviceUserId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberCredential_organizationId_type_identifier_key" ON "MemberCredential"("organizationId", "type", "identifier");

-- CreateIndex
CREATE INDEX "AccessEvent_organizationId_occurredAt_idx" ON "AccessEvent"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "AccessEvent_memberId_occurredAt_idx" ON "AccessEvent"("memberId", "occurredAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_readAt_idx" ON "Notification"("organizationId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_organizationId_dedupeKey_key" ON "Notification"("organizationId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "GymSettings" ADD CONSTRAINT "GymSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessDevice" ADD CONSTRAINT "AccessDevice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberCredential" ADD CONSTRAINT "MemberCredential_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberCredential" ADD CONSTRAINT "MemberCredential_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberCredential" ADD CONSTRAINT "MemberCredential_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AccessDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessEvent" ADD CONSTRAINT "AccessEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessEvent" ADD CONSTRAINT "AccessEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessEvent" ADD CONSTRAINT "AccessEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AccessDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessEvent" ADD CONSTRAINT "AccessEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

