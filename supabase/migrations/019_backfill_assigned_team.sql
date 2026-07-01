-- Backfill leads that lost their team.
-- Some customers (e.g. imported before the default-team logic, or partially
-- imported while the 1000-row dedup cap was in effect) ended up with a NULL
-- assigned_team and therefore show as "Unassigned" in the UI. Every lead must
-- live on one of the three teams, so blank teams default to Junior Sales Team
-- (the entry point of the workflow). A NOT NULL + DEFAULT guard prevents this
-- from happening again.

UPDATE customers
SET assigned_team = 'Junior Sales Team'
WHERE assigned_team IS NULL;

ALTER TABLE customers
  ALTER COLUMN assigned_team SET DEFAULT 'Junior Sales Team';

ALTER TABLE customers
  ALTER COLUMN assigned_team SET NOT NULL;
