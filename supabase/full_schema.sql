-- ============================================================
-- ISP CRM — Complete Database Schema
-- Safe to run on a fresh OR existing Supabase project
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'va_manager', 'junior_sales', 'senior_sales')),
  team TEXT CHECK (team IN ('Junior Sales Team', 'Senior Sales Team')),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS isps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  isp_id UUID REFERENCES isps(id),
  account_number TEXT,
  isp_status TEXT,
  full_name TEXT,
  phone TEXT,
  normalized_phone TEXT,
  address TEXT,
  product TEXT,
  term TEXT,
  order_date TEXT,
  install_date TEXT,
  install_complete TEXT,
  sales_rep_id TEXT,
  isp_notes TEXT,
  assigned_team TEXT NOT NULL DEFAULT 'Junior Sales Team' CHECK (assigned_team IN ('Junior Sales Team', 'Senior Sales Team', 'Recycle Hold')),
  assigned_user_id UUID REFERENCES profiles(id),
  call_attempt_number INT DEFAULT 0,
  workflow_stage TEXT DEFAULT 'New' CHECK (workflow_stage IN (
    'New', 'Attempt 1', 'Attempt 2', 'Attempt 3', 'No Reply - Hold',
    'Callback Requested', 'Rescheduled', 'New Account Created', 'Closed'
  )),
  transfer_status TEXT DEFAULT 'None' CHECK (transfer_status IN (
    'None', 'Senior Review', 'Management Review', 'Recycle in 30 Days', 'Recycled to Junior'
  )),
  recovery_status TEXT DEFAULT 'Not Started',
  outcome TEXT DEFAULT 'Pending' CHECK (outcome IN (
    'Pending', 'Rescheduled', 'New Account Created',
    'Not Interested', 'Wrong Number', 'Do Not Call', 'Closed'
  )),
  alert_type TEXT DEFAULT 'None' CHECK (alert_type IN (
    'None', 'ISP Complaint Needs Fix', 'Price Approval Needed'
  )),
  alert_status TEXT DEFAULT 'None' CHECK (alert_status IN (
    'None', 'Needs Email', 'Email Sent', 'In Review', 'Resolved'
  )),
  price_approval_status TEXT DEFAULT 'Not Requested' CHECK (price_approval_status IN (
    'Not Requested', 'Pending', 'Approved', 'Denied'
  )),
  last_contact_date DATE,
  follow_up_date DATE,
  source_import_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  team TEXT,
  attempt_number INT,
  call_result TEXT CHECK (call_result IN (
    'No Answer', 'Left Voicemail', 'Customer Answered',
    'No Text Reply', 'Simple Reschedule', 'Call Requested', 'Reschedule by Phone',
    'Callback Requested', 'Rescheduled', 'New Account Created',
    'Not Interested', 'Wrong Number', 'Do Not Call', 'ISP Complaint', 'Price Approval Needed'
  )),
  notes TEXT,
  is_three_way BOOLEAN DEFAULT false,
  senior_assisted_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  isp_id UUID REFERENCES isps(id),
  file_name TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  default_assigned_team TEXT DEFAULT 'Junior Sales Team',
  total_rows INT DEFAULT 0,
  new_customers INT DEFAULT 0,
  updated_customers INT DEFAULT 0,
  skipped_rows INT DEFAULT 0,
  error_rows INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_id UUID NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  row_number INT,
  raw_data JSONB,
  status TEXT,
  error_message TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  activity_type TEXT,
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- COLUMN UPDATES (for databases created from older schema)
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ALTER COLUMN is_active SET DEFAULT false;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES profiles(id);

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS is_three_way BOOLEAN DEFAULT false;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS senior_assisted_user_id UUID REFERENCES profiles(id);

DO $$ BEGIN
  ALTER TABLE customers
    ADD CONSTRAINT customers_source_import_id_fkey
    FOREIGN KEY (source_import_id) REFERENCES imports(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE import_rows DROP CONSTRAINT IF EXISTS import_rows_customer_id_fkey;
ALTER TABLE import_rows
  ADD CONSTRAINT import_rows_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_customers_isp_id ON customers(isp_id);
CREATE INDEX IF NOT EXISTS idx_customers_account_number ON customers(account_number);
CREATE INDEX IF NOT EXISTS idx_customers_normalized_phone ON customers(normalized_phone);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_team ON customers(assigned_team);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_user_id ON customers(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_customers_workflow_stage ON customers(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_customers_alert_status ON customers(alert_status);
CREATE INDEX IF NOT EXISTS idx_customers_alert_type ON customers(alert_type);
CREATE INDEX IF NOT EXISTS idx_call_logs_customer_id ON call_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_senior_assisted ON call_logs(senior_assisted_user_id);
CREATE INDEX IF NOT EXISTS idx_activities_customer_id ON activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS profiles AS $$
  SELECT * FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION team_from_role(p_role TEXT)
RETURNS TEXT AS $$
BEGIN
  IF p_role = 'junior_sales' THEN
    RETURN 'Junior Sales Team';
  ELSIF p_role = 'senior_sales' THEN
    RETURN 'Senior Sales Team';
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_my_team()
RETURNS TEXT AS $$
  SELECT team FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'junior_sales');

  INSERT INTO public.profiles (auth_user_id, email, full_name, role, team, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role,
    team_from_role(v_role),
    CASE
      WHEN NEW.raw_user_meta_data->>'approved' = 'true' THEN true
      ELSE false
    END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS isps_updated_at ON isps;
CREATE TRIGGER isps_updated_at BEFORE UPDATE ON isps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE isps ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Admin/manager can read all profiles" ON profiles;
CREATE POLICY "Admin/manager can read all profiles"
  ON profiles FOR SELECT
  USING (get_my_role() IN ('admin', 'manager', 'va_manager'));

DROP POLICY IF EXISTS "Admin can manage profiles" ON profiles;
CREATE POLICY "Admin can manage profiles"
  ON profiles FOR ALL
  USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "Allow signup profile insert" ON profiles;
CREATE POLICY "Allow signup profile insert"
  ON profiles FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- ISPs
DROP POLICY IF EXISTS "Authenticated users can read ISPs" ON isps;
CREATE POLICY "Authenticated users can read ISPs"
  ON isps FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin/manager can manage ISPs" ON isps;
CREATE POLICY "Admin/manager can manage ISPs"
  ON isps FOR ALL
  USING (get_my_role() IN ('admin', 'manager'));

-- Customers
DROP POLICY IF EXISTS "Admin/manager see all customers" ON customers;
CREATE POLICY "Admin/manager see all customers"
  ON customers FOR SELECT
  USING (get_my_role() IN ('admin', 'manager', 'va_manager'));

DROP POLICY IF EXISTS "Junior sales see junior sales customers" ON customers;
CREATE POLICY "Junior sales see junior sales customers"
  ON customers FOR SELECT
  USING (
    get_my_role() = 'junior_sales'
    AND assigned_team = 'Junior Sales Team'
    AND (
      assigned_user_id IS NULL
      OR assigned_user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Senior sales see senior sales customers" ON customers;
CREATE POLICY "Senior sales see senior sales customers"
  ON customers FOR SELECT
  USING (
    get_my_role() = 'senior_sales'
    AND assigned_team = 'Senior Sales Team'
    AND assigned_user_id = (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "Admin/manager can update all customers" ON customers;
CREATE POLICY "Admin/manager can update all customers"
  ON customers FOR UPDATE
  USING (get_my_role() IN ('admin', 'manager', 'va_manager'));

DROP POLICY IF EXISTS "Junior sales can update junior sales customers" ON customers;
CREATE POLICY "Junior sales can update junior sales customers"
  ON customers FOR UPDATE
  USING (
    get_my_role() = 'junior_sales'
    AND assigned_team = 'Junior Sales Team'
    AND (
      assigned_user_id IS NULL
      OR assigned_user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1)
    )
  )
  WITH CHECK (
    get_my_role() = 'junior_sales'
    AND assigned_team IN ('Junior Sales Team', 'Senior Sales Team', 'Recycle Hold')
    AND (
      assigned_user_id IS NULL
      OR assigned_user_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Senior sales can update senior sales customers" ON customers;
CREATE POLICY "Senior sales can update senior sales customers"
  ON customers FOR UPDATE
  USING (
    get_my_role() = 'senior_sales'
    AND assigned_team = 'Senior Sales Team'
    AND assigned_user_id = (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1
    )
  )
  WITH CHECK (
    get_my_role() = 'senior_sales'
    AND assigned_team = 'Senior Sales Team'
    AND assigned_user_id = (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1
    )
  );

DROP POLICY IF EXISTS "Admin/manager can insert customers" ON customers;
CREATE POLICY "Admin/manager can insert customers"
  ON customers FOR INSERT
  WITH CHECK (get_my_role() IN ('admin', 'manager'));

-- Call logs
DROP POLICY IF EXISTS "Users can read call logs for visible customers" ON call_logs;
CREATE POLICY "Users can read call logs for visible customers"
  ON call_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = call_logs.customer_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert call logs" ON call_logs;
CREATE POLICY "Authenticated users can insert call logs"
  ON call_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Imports
DROP POLICY IF EXISTS "Admin/manager can manage imports" ON imports;
CREATE POLICY "Admin/manager can manage imports"
  ON imports FOR ALL
  USING (get_my_role() IN ('admin', 'manager'));

DROP POLICY IF EXISTS "Admin/manager can manage import rows" ON import_rows;
CREATE POLICY "Admin/manager can manage import rows"
  ON import_rows FOR ALL
  USING (get_my_role() IN ('admin', 'manager'));

-- Customer notes
DROP POLICY IF EXISTS "Users can read notes for visible customers" ON customer_notes;
CREATE POLICY "Users can read notes for visible customers"
  ON customer_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c WHERE c.id = customer_notes.customer_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert notes" ON customer_notes;
CREATE POLICY "Authenticated users can insert notes"
  ON customer_notes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Activities
DROP POLICY IF EXISTS "Users can read activities for visible customers" ON activities;
CREATE POLICY "Users can read activities for visible customers"
  ON activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c WHERE c.id = activities.customer_id
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert activities" ON activities;
CREATE POLICY "Authenticated users can insert activities"
  ON activities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- STORAGE (profile avatars)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- PER-ISP CUSTOM CRM COLUMNS
-- ============================================================

CREATE TABLE IF NOT EXISTS isp_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  isp_id UUID NOT NULL REFERENCES isps(id) ON DELETE CASCADE,
  column_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type = 'text'),
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

-- ============================================================
-- DATA FIXES (safe to re-run)
-- ============================================================

UPDATE profiles SET role = 'junior_sales', team = 'Junior Sales Team' WHERE role = 'recovery';
UPDATE call_logs SET team = 'Recycle Hold' WHERE team = 'Recovery Team';
UPDATE customers SET assigned_team = 'Recycle Hold' WHERE assigned_team = 'Recovery Team';
UPDATE customers SET workflow_stage = 'No Reply - Hold' WHERE workflow_stage IN ('Recovery Needed', 'In Recovery');
UPDATE customers SET transfer_status = 'Recycle in 30 Days' WHERE transfer_status IN ('Move to Recovery Needed', 'Moved to Recovery');
UPDATE activities SET old_value = 'Recycle Hold' WHERE old_value = 'Recovery Team';
UPDATE activities SET new_value = 'Recycle Hold' WHERE new_value = 'Recovery Team';
UPDATE profiles SET team = 'Junior Sales Team' WHERE role = 'junior_sales' AND team IS DISTINCT FROM 'Junior Sales Team';
UPDATE profiles SET team = 'Senior Sales Team' WHERE role = 'senior_sales' AND team IS DISTINCT FROM 'Senior Sales Team';
UPDATE profiles SET team = NULL WHERE role IN ('admin', 'manager') AND team IS NOT NULL;
UPDATE customers SET assigned_team = 'Junior Sales Team' WHERE assigned_team IS NULL;
