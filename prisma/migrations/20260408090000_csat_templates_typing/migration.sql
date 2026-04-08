-- Phase 6: CSAT on tickets, ticket templates, typing indicators on chat

-- CSAT fields on tickets
ALTER TABLE "tickets"
  ADD COLUMN "csatRating"      INTEGER,
  ADD COLUMN "csatComment"     TEXT,
  ADD COLUMN "csatSubmittedAt" TIMESTAMP(3);

-- Typing indicator on channel members
ALTER TABLE "channel_members"
  ADD COLUMN "typingUntil" TIMESTAMP(3);

-- Ticket templates (canned responses)
CREATE TABLE "ticket_templates" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "subject"     TEXT,
  "body"        TEXT NOT NULL,
  "category"    TEXT,
  "brandId"     TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ticket_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ticket_templates_brandId_idx"  ON "ticket_templates"("brandId");
CREATE INDEX "ticket_templates_category_idx" ON "ticket_templates"("category");
