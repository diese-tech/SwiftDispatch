-- Enable Supabase Realtime on the jobs table so the dispatch board
-- receives live INSERT/UPDATE/DELETE events instead of polling.
-- REPLICA IDENTITY FULL ensures UPDATE and DELETE payloads include
-- all columns (needed for company_id-based channel filtering).

ALTER TABLE jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
