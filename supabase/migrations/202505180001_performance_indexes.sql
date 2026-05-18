-- Indexes for the three most frequent filtered queries

CREATE INDEX IF NOT EXISTS jobs_company_status_idx ON jobs(company_id, status);
CREATE INDEX IF NOT EXISTS technicians_company_idx ON technicians(company_id);
CREATE INDEX IF NOT EXISTS customers_company_idx ON customers(company_id);
