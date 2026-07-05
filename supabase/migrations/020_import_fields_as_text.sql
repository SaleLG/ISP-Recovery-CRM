-- All ISP custom columns are free-form text. Different ISPs use different
-- formats for dates, phones, numbers, etc. — nothing should be validated or
-- coerced on import.
--
-- On older schemas, legacy DATE columns (when present) are converted to TEXT.
-- On dynamic-CRM databases those columns may not exist; data lives in
-- custom_fields JSONB only.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name = 'order_date'
  ) THEN
    ALTER TABLE customers
      ALTER COLUMN order_date TYPE TEXT USING order_date::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name = 'install_date'
  ) THEN
    ALTER TABLE customers
      ALTER COLUMN install_date TYPE TEXT USING install_date::text;
  END IF;
END $$;

UPDATE isp_columns
SET field_type = 'text'
WHERE field_type IS DISTINCT FROM 'text';

ALTER TABLE isp_columns DROP CONSTRAINT IF EXISTS isp_columns_field_type_check;
ALTER TABLE isp_columns ADD CONSTRAINT isp_columns_field_type_check
  CHECK (field_type = 'text');
