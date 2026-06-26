-- Junior lead ownership.
-- A junior "claims" a Junior Sales lead the first time they log an attempt on
-- it (logCall sets assigned_user_id). Once claimed, other juniors can no longer
-- see or update that lead. Unclaimed leads (assigned_user_id IS NULL) remain
-- visible to every junior. Managers / admins / VA managers are unaffected and
-- still see every lead via their own policies.

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
