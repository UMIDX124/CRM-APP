/*
  Warnings:

  - Made the column `createdAt` on table `attachments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `attendance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `hoursWorked` on table `attendance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `attendance` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `brands` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `brands` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `clients` required. This step will fail if there are existing NULL values in that column.
  - Made the column `healthScore` on table `clients` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mrr` on table `clients` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `clients` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `clients` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `comments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `comments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `customer_feedback` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `customer_feedback` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `customer_feedback` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tax` on table `invoices` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `invoices` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `invoices` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `invoices` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `leads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `value` on table `leads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `probability` on table `leads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `leads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `leads` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isPrivate` on table `notes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `notes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `notes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isRead` on table `notifications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `notifications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `sessions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `tasks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `priority` on table `tasks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `timeSpent` on table `tasks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `order` on table `tasks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `tasks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `tasks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `role` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currency` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isActive` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `twoFactorEnabled` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `language` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `timezone` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedAt` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_clientId_fkey";

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_taskId_fkey";

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_userId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "channel_members" DROP CONSTRAINT "cm_channel_fkey";

-- DropForeignKey
ALTER TABLE "channel_members" DROP CONSTRAINT "cm_user_fkey";

-- DropForeignKey
ALTER TABLE "channels" DROP CONSTRAINT "channels_createdby_fkey";

-- DropForeignKey
ALTER TABLE "clients" DROP CONSTRAINT "clients_brandId_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_authorId_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_taskId_fkey";

-- DropForeignKey
ALTER TABLE "customer_feedback" DROP CONSTRAINT "customer_feedback_clientId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_brandId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_clientId_fkey";

-- DropForeignKey
ALTER TABLE "leads" DROP CONSTRAINT "leads_brandId_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "msg_author_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "msg_channel_fkey";

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_authorId_fkey";

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_clientId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_brandId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_clientId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_brandId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_managerId_fkey";

-- AlterTable
ALTER TABLE "attachments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "attendance" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "checkIn" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "checkOut" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "hoursWorked" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "companyId" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "channel_members" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "channels" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "healthScore" SET NOT NULL,
ALTER COLUMN "mrr" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastContactDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "nextFollowUp" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "comments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "customer_feedback" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "resolvedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "tax" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "issueDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "dueDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "paidDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "value" SET NOT NULL,
ALTER COLUMN "probability" SET NOT NULL,
ALTER COLUMN "expectedClose" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "lastContactDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "nextContactDate" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "messages" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notes" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "isPrivate" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "isRead" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "expires" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "priority" SET NOT NULL,
ALTER COLUMN "dueDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "timeSpent" SET NOT NULL,
ALTER COLUMN "order" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "hireDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "currency" SET NOT NULL,
ALTER COLUMN "isActive" SET NOT NULL,
ALTER COLUMN "lastLogin" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "twoFactorEnabled" SET NOT NULL,
ALTER COLUMN "language" SET NOT NULL,
ALTER COLUMN "timezone" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "legalName" TEXT,
    "description" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "taxId" TEXT,
    "vatNumber" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "countryFlag" TEXT,
    "postalCode" TEXT,
    "industry" TEXT,
    "foundedYear" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE INDEX "brands_companyId_idx" ON "brands"("companyId");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_feedback" ADD CONSTRAINT "customer_feedback_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_audit_entity" RENAME TO "audit_logs_entity_entityId_idx";

-- RenameIndex
ALTER INDEX "idx_audit_time" RENAME TO "audit_logs_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_audit_user" RENAME TO "audit_logs_userId_idx";

-- RenameIndex
ALTER INDEX "channel_members_unique" RENAME TO "channel_members_channelId_userId_key";

-- RenameIndex
ALTER INDEX "messages_channel_created" RENAME TO "messages_channelId_createdAt_idx";
