-- Research metadata table (replaces blob metadata reads)

create table if not exists research_items (
  slug text primary key,
  title text not null,
  authors jsonb not null default '[]',
  abstract text not null default '',
  status text not null default 'in-progress',
  arxiv_id text,
  pdf_path text,
  pdf_url text,
  last_updated timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_research_items_status on research_items (status);
create index if not exists idx_research_items_last_updated on research_items (last_updated);

alter table research_items enable row level security;
-- No anon/auth policies; service_role key bypasses RLS.
