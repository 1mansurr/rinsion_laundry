-- =============================================================================
-- Internal Admin Audit Trail
-- Internal admins mutate cross-tenant data via the service-role client and
-- have no employees row, so activity_logs needs a way to attribute an entry
-- to them instead of an employee.
-- =============================================================================

ALTER TABLE activity_logs ADD COLUMN internal_admin_email TEXT;
