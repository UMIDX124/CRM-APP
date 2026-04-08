-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "presenceStatus" TEXT NOT NULL DEFAULT 'offline';
