-- Mijoz o'chirilganda yozuv qoladi: to'lovlari va yashash tarixi hisobotdan ayrilmasligi uchun.
ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");
