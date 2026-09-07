-- Qizlar va bollar bloklari alohida raqamlanadi: bitta qavatda
-- bollarning "1" xonasi ham, qizlarning "1" xonasi ham bo'lishi mumkin.
DROP INDEX "Room_floorId_number_key";

CREATE UNIQUE INDEX "Room_floorId_gender_number_key" ON "Room"("floorId", "gender", "number");
