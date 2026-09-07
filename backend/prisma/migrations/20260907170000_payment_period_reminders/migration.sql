-- Oylik to'lov davri: to'lov qaysi sanagacha yopilgani va qancha kun bergani.
ALTER TABLE "Stay" ADD COLUMN "paidUntil" TIMESTAMP(3);
ALTER TABLE "Stay" ADD COLUMN "paidDays" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Payment" ADD COLUMN "days" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "coversFrom" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN "coversTo" TIMESTAMP(3);

-- Mavjud oylik yashovchilar uchun muddatni to'langan summadan hisoblab to'ldiramiz:
-- oylik narx 30 kunga to'g'ri keladi, hisob kirish sanasidan boshlanadi.
UPDATE "Stay"
SET "paidDays" = FLOOR("paidAmount"::numeric / "monthlyPrice" * 30)
WHERE "type" = 'MONTHLY' AND "monthlyPrice" > 0 AND "paidAmount" > 0;

UPDATE "Stay"
SET "paidUntil" = "startDate" + ("paidDays" || ' days')::interval
WHERE "type" = 'MONTHLY' AND "paidDays" > 0;

-- Har bir mavjud to'lov ham qancha kun bergani bilan belgilanadi.
UPDATE "Payment" p
SET "days" = FLOOR(p."amount"::numeric / s."monthlyPrice" * 30)
FROM "Stay" s
WHERE p."stayId" = s."id" AND p."type" = 'MONTHLY' AND s."monthlyPrice" > 0 AND p."status" <> 'CANCELLED';

-- To'lov muddati eslatmalari.
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PAYMENT_DUE',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "forDate" TEXT NOT NULL,
    "daysLeft" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Reminder_stayId_forDate_key" ON "Reminder"("stayId", "forDate");
CREATE INDEX "Reminder_forDate_idx" ON "Reminder"("forDate");
CREATE INDEX "Reminder_readAt_idx" ON "Reminder"("readAt");

ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
