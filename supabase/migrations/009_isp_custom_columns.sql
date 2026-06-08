-- Per-ISP custom CRM columns

CREATE TABLE IF NOT EXISTS isp_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  isp_id UUID NOT NULL REFERENCES isps(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'date', 'phone', 'number')),
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  used_for_matching BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (isp_id, column_key)
);

CREATE INDEX IF NOT EXISTS idx_isp_columns_isp_id ON isp_columns(isp_id);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_customers_custom_fields ON customers USING gin (custom_fields);

ALTER TABLE isp_columns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin/manager can manage isp columns" ON isp_columns;
CREATE POLICY "Admin/manager can manage isp columns"
  ON isp_columns FOR ALL
  USING (get_my_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "Authenticated users can read isp columns" ON isp_columns;
CREATE POLICY "Authenticated users can read isp columns"
  ON isp_columns FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Backfill custom_fields from legacy fixed columns for existing customers
UPDATE customers
SET custom_fields = jsonb_strip_nulls(
  jsonb_build_object(
    'isp_status', isp_status,
    'full_name', full_name,
    'phone', phone,
    'account_number', account_number,
    'address', address,
    'product', product,
    'term', term,
    'order_date', order_date::text,
    'install_date', install_date::text,
    'install_complete', install_complete,
    'sales_rep_id', sales_rep_id,
    'isp_notes', isp_notes
  )
)
WHERE custom_fields = '{}'::jsonb
  AND (
    full_name IS NOT NULL
    OR phone IS NOT NULL
    OR account_number IS NOT NULL
    OR address IS NOT NULL
  );

-- Seed default columns for ISPs that already have customer data
INSERT INTO isp_columns (isp_id, column_key, label, field_type, sort_order, is_primary, used_for_matching)
SELECT DISTINCT c.isp_id, defs.column_key, defs.label, defs.field_type, defs.sort_order, defs.is_primary, defs.used_for_matching
FROM customers c
CROSS JOIN (
  VALUES
    ('full_name', 'Full Name', 'text', 1, true, false),
    ('phone', 'Phone', 'phone', 2, false, true),
    ('account_number', 'Account Number', 'text', 3, false, true),
    ('isp_status', 'ISP Status', 'text', 4, false, false),
    ('address', 'Address', 'text', 5, false, true),
    ('product', 'Product', 'text', 6, false, false),
    ('term', 'Term', 'text', 7, false, false),
    ('order_date', 'Order Date', 'date', 8, false, false),
    ('install_date', 'Install Date', 'date', 9, false, false),
    ('install_complete', 'Install Complete', 'text', 10, false, false),
    ('sales_rep_id', 'Sales Rep ID', 'text', 11, false, false),
    ('isp_notes', 'ISP Notes', 'text', 12, false, false)
) AS defs(column_key, label, field_type, sort_order, is_primary, used_for_matching)
WHERE c.isp_id IS NOT NULL
ON CONFLICT (isp_id, column_key) DO NOTHING;
