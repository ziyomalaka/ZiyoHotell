-- Nazoratchi to'lov qabul qilmaydi: SUPERVISOR rolidan 'payments.create' ruxsati olib tashlanadi.
UPDATE "Role"
SET "permissions" = (
  SELECT COALESCE(json_agg(p), '[]'::json)::text
  FROM json_array_elements_text("permissions"::json) AS p
  WHERE p <> 'payments.create'
)
WHERE "code" = 'SUPERVISOR';
