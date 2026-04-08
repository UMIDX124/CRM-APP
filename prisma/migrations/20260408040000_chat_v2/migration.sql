-- AlterTable
ALTER TABLE "channel_members" ADD COLUMN     "isMuted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastReadAt" TIMESTAMP(3);
-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "topic" TEXT;
-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "attachments" JSONB,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "linkPreview" JSONB,
ADD COLUMN     "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "parentMessageId" TEXT;
-- CreateTable
CREATE TABLE "message_reactions" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "message_reads" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_reads_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "message_pins" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "pinnedById" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_pins_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "channel_mutes" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mutedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "channel_mutes_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "message_reactions_messageId_idx" ON "message_reactions"("messageId");
-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_messageId_userId_emoji_key" ON "message_reactions"("messageId", "userId", "emoji");
-- CreateIndex
CREATE INDEX "message_reads_messageId_idx" ON "message_reads"("messageId");
-- CreateIndex
CREATE UNIQUE INDEX "message_reads_messageId_userId_key" ON "message_reads"("messageId", "userId");
-- CreateIndex
CREATE UNIQUE INDEX "message_pins_messageId_key" ON "message_pins"("messageId");
-- CreateIndex
CREATE INDEX "message_pins_channelId_idx" ON "message_pins"("channelId");
-- CreateIndex
CREATE UNIQUE INDEX "channel_mutes_channelId_userId_key" ON "channel_mutes"("channelId", "userId");
-- CreateIndex
CREATE INDEX "messages_parentMessageId_idx" ON "messages"("parentMessageId");
-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_pins" ADD CONSTRAINT "message_pins_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_pins" ADD CONSTRAINT "message_pins_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "message_pins" ADD CONSTRAINT "message_pins_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "channel_mutes" ADD CONSTRAINT "channel_mutes_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "channel_mutes" ADD CONSTRAINT "channel_mutes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
