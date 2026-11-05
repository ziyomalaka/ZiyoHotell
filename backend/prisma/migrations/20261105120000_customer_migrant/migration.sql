-- Migrant mijozlar: pasporti istalgan formatda, summa va kunlar qo'lda kiritiladi (Stay.type = 'MIGRANT').
ALTER TABLE "Customer" ADD COLUMN "migrant" BOOLEAN NOT NULL DEFAULT false;
