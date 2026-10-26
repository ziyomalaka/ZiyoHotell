-- Sektorlar: yotoqxona bloklari. Xonalar sektor ichida, xona raqami sektor ichida yagona.
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "floor" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Sector_number_key" ON "Sector"("number");

ALTER TABLE "Room" ADD COLUMN "sectorId" TEXT;

DROP INDEX "Room_floorId_gender_number_key";

CREATE UNIQUE INDEX "Room_sectorId_number_key" ON "Room"("sectorId", "number");

CREATE INDEX "Room_sectorId_idx" ON "Room"("sectorId");

ALTER TABLE "Room" ADD CONSTRAINT "Room_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Boshlang'ich sektorlar (yotoqxona tuzilmasi bo'yicha).
INSERT INTO "Sector" ("id", "number", "name", "gender", "floor", "updatedAt") VALUES
    (gen_random_uuid()::text, 1, 'Bollar yotoqxonasi', 'MALE', 2, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 2, 'Bollar yotoqxonasi', 'MALE', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 3, 'Bollar yotoqxonasi', 'MALE', -1, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 4, 'Qizlar yotoqxonasi', 'FEMALE', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 5, 'Fitnes', NULL, NULL, CURRENT_TIMESTAMP);

-- Mavjud xonalar qavati va jinsi mos keladigan sektorga o'tadi; mos kelmaganlari sektorsiz qoladi
-- va admin "Xonalar nazorati" sahifasidan biriktiriladi.
UPDATE "Room" r
SET "sectorId" = s."id"
FROM "Sector" s
WHERE s."gender" = r."gender" AND s."floor" = r."floor";
