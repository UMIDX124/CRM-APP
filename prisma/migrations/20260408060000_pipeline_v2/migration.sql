-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "dealScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "winReason" TEXT;
-- Backfill stage_entered_at for existing rows
UPDATE deals SET "stageEnteredAt" = COALESCE("updatedAt", "createdAt", NOW()) WHERE "stageEnteredAt" IS NULL;
