-- Library books table backed by Supabase (replaces Blob json_data/index.json)

create table if not exists library_books (
  isbn text primary key,
  title text not null,
  author text not null default 'Unknown',
  finished_date text not null,
  rating integer not null default 0,
  cover_image text not null default '/books/null.jpg',
  spine_color text not null default '#FFFFFF',
  text_color text not null default '#000000',
  slug text not null unique,
  summary text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists idx_library_books_finished_date on library_books (finished_date);
create index if not exists idx_library_books_slug on library_books (slug);

alter table library_books enable row level security;
-- No anon/auth policies. service_role key (server-only) bypasses RLS.
