-- Fix RLS Policies
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for anon" ON patients;
CREATE POLICY "Enable all access for anon" ON patients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for anon" ON alerts;
CREATE POLICY "Enable all access for anon" ON alerts FOR ALL USING (true) WITH CHECK (true);

-- Check if renaming is needed (Safety fallback)
-- Run this line ONLY if you haven't renamed 'device_patient_id' yet:
-- ALTER TABLE patients RENAME COLUMN device_patient_id TO full_name;
