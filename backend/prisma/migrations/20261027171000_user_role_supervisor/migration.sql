-- User.role cheklovi Nazoratchi (SUPERVISOR) rolini ham qabul qiladi.
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "user_role_valid";

ALTER TABLE "User" ADD CONSTRAINT "user_role_valid" CHECK ("role" IN ('RECEPTION', 'SYSTEM_ADMIN', 'MANAGER', 'SUPERVISOR'));
