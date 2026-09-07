-- Xona kimga ajratilgani: MALE (bollar) | FEMALE (qizlar).
-- Mavjud xonalar uchun standart qiymat MALE, keyin admin panelidan o'zgartiriladi.
ALTER TABLE "Room" ADD COLUMN "gender" TEXT NOT NULL DEFAULT 'MALE';
