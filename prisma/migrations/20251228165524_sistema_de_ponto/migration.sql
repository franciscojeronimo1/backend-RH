-- CreateEnum
CREATE TYPE "TimeRecordType" AS ENUM ('START', 'STOP');

-- CreateTable
CREATE TABLE "TimeRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TimeRecordType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeRecord_userId_timestamp_idx" ON "TimeRecord"("userId", "timestamp");

-- AddForeignKey
ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
