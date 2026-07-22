-- Supabase SQL Editor'da bir kez çalıştırın.
create table if not exists public.rank_clips (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  rank text not null,
  added_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rank_guess_votes (
  clip_id uuid not null references public.rank_clips(id) on delete cascade,
  player_name text not null,
  guessed_rank text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  primary key (clip_id, player_name)
);

alter table public.rank_clips enable row level security;
alter table public.rank_guess_votes enable row level security;

create policy "Rank clips are readable" on public.rank_clips for select using (true);
create policy "Rank clips can be submitted" on public.rank_clips for insert with check (true);
create policy "Rank votes are readable" on public.rank_guess_votes for select using (true);
create policy "Rank votes can be submitted" on public.rank_guess_votes for insert with check (true);
create policy "Rank votes can be updated" on public.rank_guess_votes for update using (true) with check (true);
