-- =============================================================================
-- Laundry Account Closure (Stage 3 of the deletion plan, docs/auth_spec.md §2)
-- Deliberately separate from subscriptions.status = 'cancelled' (the billing
-- state): a cancelled/missing subscription today only shows a banner in
-- (app)/layout.tsx and doesn't block navigation. This column is the signal
-- getMyProfile() checks to fully block navigation for every employee of a
-- closed laundry, not just warn them, the same way employees.deleted_at
-- already does for an individually-removed employee.
-- =============================================================================

ALTER TABLE laundries ADD COLUMN deleted_at TIMESTAMPTZ;
