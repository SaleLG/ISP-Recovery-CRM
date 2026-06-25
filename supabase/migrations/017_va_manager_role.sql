-- VA Manager role: sits between the senior team and the manager.
-- Can assign leads to the senior team, log calls/texts on junior & senior
-- leads, and manage alerts. Cannot import, manage ISPs/columns, or manage users.

-- 1. Allow the new role value.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'va_manager', 'junior_sales', 'senior_sales'));

-- 2. VA managers need to read every profile (e.g. the senior rep assignment
--    dropdown and team member lists).
DROP POLICY IF EXISTS "Admin/manager can read all profiles" ON profiles;
CREATE POLICY "Admin/manager can read all profiles"
  ON profiles FOR SELECT
  USING (get_my_role() IN ('admin', 'manager', 'va_manager'));

-- 3. VA managers can see all customers (Junior + Senior views, alerts).
DROP POLICY IF EXISTS "Admin/manager see all customers" ON customers;
CREATE POLICY "Admin/manager see all customers"
  ON customers FOR SELECT
  USING (get_my_role() IN ('admin', 'manager', 'va_manager'));

-- 4. VA managers can update customers (assign senior reps, log calls/texts,
--    manage alerts). Workflow-locked fields remain admin-only at the app layer.
DROP POLICY IF EXISTS "Admin/manager can update all customers" ON customers;
CREATE POLICY "Admin/manager can update all customers"
  ON customers FOR UPDATE
  USING (get_my_role() IN ('admin', 'manager', 'va_manager'));

-- Note: VA managers are intentionally NOT added to the customer INSERT,
-- ISP, ISP-column, or import policies, so they cannot import customers or
-- change ISP columns.
