-- Sektor belgisi: xonalar oylik narxi o'rinlar soniga qarab qo'yiladi.
ALTER TABLE "Sector" ADD COLUMN "capacityPricing" BOOLEAN NOT NULL DEFAULT false;

-- 3, 4, 5-sektorlar narxni o'rinlar soniga qarab oladi; 1 va 2-sektorlar eski narxda qoladi.
UPDATE "Sector" SET "capacityPricing" = true WHERE "number" IN (3, 4, 5);

-- Shu sektorlardagi xonalar narxi: "N kishilikkacha" oralig'i (billing.ts dagi CAPACITY_PRICE_TIERS bilan bir xil).
-- Mavjud yashash yozuvlari (Stay.monthlyPrice) o'zgarmaydi: yangi narx yangi ro'yxatga olishda qo'llanadi.
UPDATE "Room" r
SET "monthlyPrice" = CASE
    WHEN r."capacity" <= 2 THEN 1200000
    WHEN r."capacity" <= 4 THEN 950000
    WHEN r."capacity" <= 6 THEN 900000
    WHEN r."capacity" <= 8 THEN 850000
    ELSE 750000
END
FROM "Sector" s
WHERE r."sectorId" = s."id" AND s."capacityPricing" = true;
