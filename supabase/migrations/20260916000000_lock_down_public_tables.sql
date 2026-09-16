-- The application accesses PostgreSQL through Prisma on the server.
-- Keep the Supabase Data API from exposing personal, payroll, and billing data.

alter table public."JobPosting" enable row level security;
alter table public."Candidate" enable row level security;
alter table public."Employee" enable row level security;
alter table public."EmployeeDocument" enable row level security;
alter table public."ProjectObject" enable row level security;
alter table public."BillingCustomer" enable row level security;
alter table public."BillingInvoice" enable row level security;
alter table public."SiteSettings" enable row level security;
alter table public."Deployment" enable row level security;

revoke all on table
  public."JobPosting",
  public."Candidate",
  public."Employee",
  public."EmployeeDocument",
  public."ProjectObject",
  public."BillingCustomer",
  public."BillingInvoice",
  public."SiteSettings",
  public."Deployment"
from anon, authenticated;

alter default privileges for role postgres in schema public
revoke all on tables from anon, authenticated;