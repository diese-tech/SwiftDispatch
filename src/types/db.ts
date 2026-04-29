export type JobStatus = "New" | "Assigned" | "En Route" | "Completed";

export type Company = {
  id: string;
  name: string;
  close_status: CloseStatus;
  demo_mode_enabled: boolean;
  created_at: string;
};

export type CloseStatus =
  | "not_contacted"
  | "contacted"
  | "demo_done"
  | "interested"
  | "closed_won"
  | "closed_lost";

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
  technician_assigned_at: string | null;
};

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

export type Quote = {
  id: string;
  job_id: string;
  total: number;
  status: QuoteStatus;
  created_at: string;
  quote_sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
};

export type QuoteLineItem = {
  id: string;
  quote_id: string;
  name: string;
  price: number;
  quantity: number;
};

export type QuoteWithLineItems = Quote & {
  quote_line_items: QuoteLineItem[];
};

export type JobWithTechnician = Job & {
  technicians?: Pick<Technician, "id" | "name" | "phone"> | null;
};

export type QuoteWithItems = Quote & {
  quote_line_items: QuoteLineItem[];
  jobs: Pick<Job, "id" | "customer_name" | "phone" | "address" | "issue"> | null;
};
