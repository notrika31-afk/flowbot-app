/*
  Warnings:

  - A unique constraint covering the columns `[botId,provider]` on the table `IntegrationConnection` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "IntegrationProvider" ADD VALUE 'zoom';
ALTER TYPE "IntegrationProvider" ADD VALUE 'site_link';
ALTER TYPE "IntegrationProvider" ADD VALUE 'paybox';
ALTER TYPE "IntegrationProvider" ADD VALUE 'bit';

-- DropIndex
DROP INDEX "Integration_userId_provider_key";

-- AlterTable
ALTER TABLE "Integration" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "IntegrationConnection" ADD COLUMN     "botId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_botId_provider_key" ON "IntegrationConnection"("botId", "provider");

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_botId_fkey" FOREIGN KEY ("botId") REFERENCES "Bot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
