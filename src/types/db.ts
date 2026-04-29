export type JobStatus = "New" | "Assigned" | "En Route" | "Completed";

export type Company = {
  id: string;
  name: string;
  created_at: string;
};

export type AppUser = {
  id: string;
  email: string;
  company_id: string;
  role: string;
};

export type Technician = {
  id: string;
  name: string;
  phone: string | null;
  company_id: string;
};

export type Job = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  issue: string;
  status: JobStatus;
  technician_id: string | null;
  company_id: string;
  created_at: string;
};

export type Quote = {
  id: string;
  job_id: string;
  total: number;
  status: string;
  created_at: string;
};

export type QuoteLineItem = {
  id: string;
  quote_id: string;
  name: string;
  price: number;
  quantity: number;
};

export type JobWithTechnician = Job & {
  technicians?: Pick<Technician, "id" | "name" | "phone"> | null;
};

export type QuoteWithItems = Quote & {
  quote_line_items: QuoteLineItem[];
  jobs: Pick<Job, "id" | "customer_name" | "phone" | "address" | "issue"> | null;
};
