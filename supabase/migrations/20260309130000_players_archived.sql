alter table public.players
  add column if not exists archived boolean not null default false;
