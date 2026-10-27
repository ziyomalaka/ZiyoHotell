-- Nazoratchi roli: sektor va xonalarni kuzatadi, to'lov qabul qiladi, hisobotlarni ko'radi.
INSERT INTO "Role" ("id", "code", "name", "permissions")
VALUES (
    gen_random_uuid()::text,
    'SUPERVISOR',
    'Nazoratchi',
    '["customers.view","payments.view","payments.create","reports.view","reports.export"]'
)
ON CONFLICT ("code") DO NOTHING;
