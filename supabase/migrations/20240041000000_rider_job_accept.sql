-- Rider-initiated "accept" gate. A rider assigned a job (assignRiderToJob.ts)
-- sees only its pickup/delivery location until they explicitly accept it —
-- only then does the customer's name/phone become visible (getMyJobs.ts) and
-- only then can they advance rider_status past 'assigned' (bulkUpdateJobStatus.ts).
-- Kept as its own timestamp rather than overloading rider_status: "assigned
-- by the company admin" and "accepted by the rider" are two different
-- moments with two different actors, same reasoning as the status/
-- rider_status split in 20240040000000.
ALTER TABLE logistics_requests ADD COLUMN accepted_at TIMESTAMPTZ;
