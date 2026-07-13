-- =============================================================================
-- activity_logs.target_employee_id (docs/deletion_retention_plan.md §2)
-- Several action types (EMPLOYEE_REMOVED, EMPLOYEE_RESTORED, EMPLOYEE_CREATED
-- via approveJoinRequest) have an actor distinct from the subject: employee_id
-- already holds the acting admin, but the subject employee's name was, until
-- now, only ever available by interpolating it into `description` — which is
-- exactly the free-text PII leak the retention plan flags. This column gives
-- the subject a structured home so description can drop the name entirely and
-- the UI resolves it at read time via a join, same as employee_id already is.
-- Nullable: most action types have no distinct subject (self-actions, or
-- actions with no employee subject at all).
-- =============================================================================

ALTER TABLE activity_logs ADD COLUMN target_employee_id UUID REFERENCES employees(id);

CREATE INDEX idx_activity_logs_target_employee_id ON activity_logs(target_employee_id);
