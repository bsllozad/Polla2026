create extension if not exists "pgcrypto";

create type app_role as enum ('superadmin', 'viewer');
create type match_stage as enum ('group', 'round_32', 'round_16', 'quarter_final', 'semi_final', 'third_place', 'final');
create type match_status as enum ('scheduled', 'live', 'finished', 'invalid');
create type player_position as enum ('goalkeeper', 'defender', 'holding_midfielder', 'attacking_midfielder', 'forward');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role app_role not null default 'viewer',
  created_at timestamptz not null default now()
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  fifa_id text unique,
  name text not null,
  code text not null unique,
  group_name text,
  flag_url text,
  flag_emoji text,
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  full_name text not null,
  position player_position not null,
  shirt_number integer,
  photo_url text,
  source_url text,
  is_active boolean not null default true,
  unique(team_id, full_name)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  fifa_match_no integer unique,
  stage match_stage not null,
  kickoff_at timestamptz not null,
  venue text,
  home_team_id uuid references teams(id),
  away_team_id uuid references teams(id),
  home_slot text,
  away_slot text,
  status match_status not null default 'scheduled',
  is_prediction_open boolean not null default true
);

create table predictions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  home_scorer_id uuid references players(id),
  away_scorer_id uuid references players(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(participant_id, match_id)
);

create table match_results (
  match_id uuid primary key references matches(id) on delete cascade,
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0),
  status match_status not null default 'finished',
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  team_id uuid not null references teams(id),
  player_id uuid references players(id),
  own_goal_player_id uuid references players(id),
  minute integer,
  created_at timestamptz not null default now(),
  check (player_id is not null or own_goal_player_id is not null)
);

create table assists (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  player_id uuid not null references players(id)
);

create table bracket_slots (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  slot_key text not null,
  resolved_team_id uuid references teams(id),
  manual_override boolean not null default false,
  unique(match_id, slot_key)
);

create table colombia_bets (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  question_key text not null,
  answer_text text,
  selected_team_id uuid references teams(id),
  selected_player_id uuid references players(id),
  numeric_answer integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(participant_id, question_key)
);

create table colombia_answers (
  question_key text primary key,
  answer_text text,
  selected_team_id uuid references teams(id),
  selected_player_id uuid references players(id),
  numeric_answer integer,
  points integer not null default 5
);

alter table profiles enable row level security;
alter table participants enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table match_results enable row level security;
alter table goals enable row level security;
alter table assists enable row level security;
alter table bracket_slots enable row level security;
alter table colombia_bets enable row level security;
alter table colombia_answers enable row level security;

create or replace function is_superadmin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'superadmin'
  );
$$;

create policy "authenticated read participants" on participants for select to authenticated using (true);
create policy "superadmin manage participants" on participants for all to authenticated using (is_superadmin()) with check (is_superadmin());

create policy "authenticated read teams" on teams for select to authenticated using (true);
create policy "superadmin manage teams" on teams for all to authenticated using (is_superadmin()) with check (is_superadmin());

create policy "authenticated read players" on players for select to authenticated using (true);
create policy "superadmin manage players" on players for all to authenticated using (is_superadmin()) with check (is_superadmin());

create policy "authenticated read matches" on matches for select to authenticated using (true);
create policy "superadmin manage matches" on matches for all to authenticated using (is_superadmin()) with check (is_superadmin());

create policy "authenticated read predictions" on predictions for select to authenticated using (true);
create policy "authenticated manage predictions" on predictions for insert to authenticated with check (true);
create policy "authenticated update predictions" on predictions for update to authenticated using (true) with check (true);

create policy "authenticated read results" on match_results for select to authenticated using (true);
create policy "superadmin manage results" on match_results for all to authenticated using (is_superadmin()) with check (is_superadmin());

create policy "authenticated read goals" on goals for select to authenticated using (true);
create policy "superadmin manage goals" on goals for all to authenticated using (is_superadmin()) with check (is_superadmin());

create policy "authenticated read assists" on assists for select to authenticated using (true);
create policy "superadmin manage assists" on assists for all to authenticated using (is_superadmin()) with check (is_superadmin());

create policy "authenticated read bracket" on bracket_slots for select to authenticated using (true);
create policy "superadmin manage bracket" on bracket_slots for all to authenticated using (is_superadmin()) with check (is_superadmin());

create policy "authenticated read colombia bets" on colombia_bets for select to authenticated using (true);
create policy "authenticated manage colombia bets" on colombia_bets for insert to authenticated with check (true);
create policy "authenticated update colombia bets" on colombia_bets for update to authenticated using (true) with check (true);

create policy "authenticated read colombia answers" on colombia_answers for select to authenticated using (true);
create policy "superadmin manage colombia answers" on colombia_answers for all to authenticated using (is_superadmin()) with check (is_superadmin());
