-- A requester has no RLS access to the laundries table at all (they aren't an
-- employee yet, so get_my_laundry_id() is NULL) — denormalize the name onto
-- the request itself so their own status check never needs to read laundries.
ALTER TABLE join_requests ADD COLUMN laundry_name TEXT NOT NULL DEFAULT '';
ALTER TABLE join_requests ALTER COLUMN laundry_name DROP DEFAULT;
