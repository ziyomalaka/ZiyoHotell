-- Bitta o'rin bir oyga 750 000 so'm (30 kun).
-- Eski standart 1 200 000 edi, barcha xonalar yangi narxga o'tkaziladi.
UPDATE "Room" SET "monthlyPrice" = 750000;

-- Hali yopilmagan yashashlar ham yangi narx bo'yicha hisoblanadi,
-- aks holda to'langan summa qancha kun berganini noto'g'ri ko'rsatadi.
UPDATE "Stay" SET "monthlyPrice" = 750000 WHERE "status" = 'ACTIVE';
