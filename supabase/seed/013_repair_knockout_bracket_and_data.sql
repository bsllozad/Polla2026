-- Repara el fixture eliminatorio preservando los numeros oficiales FIFA.
-- Seguro para correr una vez o varias veces:
-- - No toca grupos.
-- - No toca apuestas fuera de 74-76.
-- - Mueve resultados/goles 74-76 solo si detecta el estado equivocado del fix 011 anterior.
-- - Revierte la rotacion de apuestas solo si detecta que se corrio el fix 012 anterior.

begin;

create table if not exists data_fixes (
  key text primary key,
  applied_at timestamptz not null default now()
);

create temp table tmp_repair_flags on commit drop as
select
  exists (
    select 1
    from matches m
    join teams home on home.id = m.home_team_id
    where m.fifa_match_no = 74
      and m.stage = 'round_32'
      and home.code = 'BRA'
  ) as has_wrong_011_round32,
  exists (
    select 1
    from data_fixes
    where key = 'rotate_round32_predictions_74_76'
  ) and not exists (
    select 1
    from data_fixes
    where key = 'restore_round32_predictions_74_76'
  ) as should_restore_predictions,
  not exists (
    select 1
    from data_fixes
    where key = 'restore_round32_results_74_76'
  ) as should_restore_results;

create temp table tmp_result_rotation on commit drop as
with map(current_no, new_no) as (
  values
    (74, 76),
    (75, 74),
    (76, 75)
),
resolved as (
  select
    current_match.id as current_match_id,
    new_match.id as new_match_id
  from map
  join matches current_match on current_match.fifa_match_no = map.current_no and current_match.stage = 'round_32'
  join matches new_match on new_match.fifa_match_no = map.new_no and new_match.stage = 'round_32'
)
select
  r.new_match_id as match_id,
  mr.home_score,
  mr.away_score,
  mr.penalty_winner_team_id,
  mr.status,
  mr.updated_by,
  mr.updated_at
from match_results mr
join resolved r on r.current_match_id = mr.match_id
cross join tmp_repair_flags flags
where flags.has_wrong_011_round32
  and flags.should_restore_results;

update goals g
set match_id = resolved.new_match_id
from (
  with map(current_no, new_no) as (
    values
      (74, 76),
      (75, 74),
      (76, 75)
  )
  select
    current_match.id as current_match_id,
    new_match.id as new_match_id
  from map
  join matches current_match on current_match.fifa_match_no = map.current_no and current_match.stage = 'round_32'
  join matches new_match on new_match.fifa_match_no = map.new_no and new_match.stage = 'round_32'
) resolved
cross join tmp_repair_flags flags
where flags.has_wrong_011_round32
  and flags.should_restore_results
  and g.match_id = resolved.current_match_id;

delete from match_results mr
using matches m, tmp_repair_flags flags
where flags.has_wrong_011_round32
  and flags.should_restore_results
  and mr.match_id = m.id
  and m.stage = 'round_32'
  and m.fifa_match_no in (74, 75, 76);

insert into match_results (
  match_id,
  home_score,
  away_score,
  penalty_winner_team_id,
  status,
  updated_by,
  updated_at
)
select
  match_id,
  home_score,
  away_score,
  penalty_winner_team_id,
  status,
  updated_by,
  updated_at
from tmp_result_rotation;

insert into data_fixes (key)
select 'restore_round32_results_74_76'
from tmp_repair_flags
where has_wrong_011_round32
  and should_restore_results
on conflict (key) do nothing;

create temp table tmp_prediction_restore on commit drop as
with map(current_no, new_no) as (
  values
    (75, 74),
    (76, 75),
    (74, 76)
),
resolved as (
  select
    current_match.id as current_match_id,
    new_match.id as new_match_id
  from map
  join matches current_match on current_match.fifa_match_no = map.current_no and current_match.stage = 'round_32'
  join matches new_match on new_match.fifa_match_no = map.new_no and new_match.stage = 'round_32'
)
select
  p.participant_id,
  r.new_match_id as match_id,
  p.home_score,
  p.away_score,
  p.penalty_winner_team_id,
  p.home_scorer_id,
  p.away_scorer_id,
  p.created_at,
  p.updated_at
from predictions p
join resolved r on r.current_match_id = p.match_id
cross join tmp_repair_flags flags
where flags.should_restore_predictions;

delete from predictions p
using matches m, tmp_repair_flags flags
where flags.should_restore_predictions
  and p.match_id = m.id
  and m.stage = 'round_32'
  and m.fifa_match_no in (74, 75, 76);

insert into predictions (
  participant_id,
  match_id,
  home_score,
  away_score,
  penalty_winner_team_id,
  home_scorer_id,
  away_scorer_id,
  created_at,
  updated_at
)
select
  participant_id,
  match_id,
  home_score,
  away_score,
  penalty_winner_team_id,
  home_scorer_id,
  away_scorer_id,
  created_at,
  updated_at
from tmp_prediction_restore;

insert into data_fixes (key)
select 'restore_round32_predictions_74_76'
from tmp_repair_flags
where should_restore_predictions
on conflict (key) do nothing;

with fixture(fifa_match_no, stage, kickoff_at, venue, home_slot, away_slot, home_code, away_code) as (
  values
    (73, 'round_32', '2026-06-28 19:00:00+00'::timestamptz, 'SoFi Stadium, Inglewood', '2A', '2B', 'RSA', 'CAN'),
    (74, 'round_32', '2026-06-29 20:30:00+00'::timestamptz, 'Gillette Stadium, Foxborough', '1E', '3ABCDF', 'GER', 'PAR'),
    (75, 'round_32', '2026-06-30 01:00:00+00'::timestamptz, 'Estadio BBVA, Guadalupe', '1F', '2C', 'NED', 'MAR'),
    (76, 'round_32', '2026-06-29 17:00:00+00'::timestamptz, 'NRG Stadium, Houston', '1C', '2F', 'BRA', 'JPN'),
    (77, 'round_32', '2026-06-30 21:00:00+00'::timestamptz, 'MetLife Stadium, East Rutherford', '1I', '3CDFGH', 'FRA', 'SWE'),
    (78, 'round_32', '2026-06-30 17:00:00+00'::timestamptz, 'AT&T Stadium, Arlington', '2E', '2I', 'CIV', 'NOR'),
    (79, 'round_32', '2026-07-01 01:00:00+00'::timestamptz, 'Estadio Azteca, Mexico City', '1A', '3CEFHI', 'MEX', 'ECU'),
    (80, 'round_32', '2026-07-01 16:00:00+00'::timestamptz, 'Mercedes-Benz Stadium, Atlanta', '1L', '3EHIJK', 'ENG', 'COD'),
    (81, 'round_32', '2026-07-02 00:00:00+00'::timestamptz, 'Levi''s Stadium, Santa Clara', '1D', '3BEFIJ', 'USA', 'BIH'),
    (82, 'round_32', '2026-07-01 20:00:00+00'::timestamptz, 'Lumen Field, Seattle', '1G', '3AEHIJ', 'BEL', 'SEN'),
    (83, 'round_32', '2026-07-02 19:00:00+00'::timestamptz, 'BMO Field, Toronto', '2K', '2L', 'POR', 'CRO'),
    (84, 'round_32', '2026-07-02 19:00:00+00'::timestamptz, 'SoFi Stadium, Inglewood', '1H', '2J', 'ESP', 'AUT'),
    (85, 'round_32', '2026-07-03 19:00:00+00'::timestamptz, 'BC Place, Vancouver', '1B', '3EFGIJ', 'SUI', 'ALG'),
    (86, 'round_32', '2026-07-03 22:00:00+00'::timestamptz, 'Hard Rock Stadium, Miami Gardens', '1J', '2H', 'ARG', 'CPV'),
    (87, 'round_32', '2026-07-04 00:00:00+00'::timestamptz, 'Arrowhead Stadium, Kansas City', '1K', '3DEIJL', 'COL', 'GHA'),
    (88, 'round_32', '2026-07-04 01:00:00+00'::timestamptz, 'AT&T Stadium, Arlington', '2D', '2G', 'AUS', 'EGY')
),
resolved as (
  select
    f.fifa_match_no,
    f.stage,
    f.kickoff_at,
    f.venue,
    f.home_slot,
    f.away_slot,
    home.id as home_team_id,
    away.id as away_team_id
  from fixture f
  join teams home on home.code = f.home_code
  join teams away on away.code = f.away_code
)
update matches m
set
  stage = r.stage::match_stage,
  kickoff_at = r.kickoff_at,
  venue = r.venue,
  home_slot = r.home_slot,
  away_slot = r.away_slot,
  home_team_id = r.home_team_id,
  away_team_id = r.away_team_id
from resolved r
where m.fifa_match_no = r.fifa_match_no
  and m.stage = 'round_32';

with fixture(fifa_match_no, stage, kickoff_at, venue, home_slot, away_slot) as (
  values
    (89, 'round_16', '2026-07-04 21:00:00+00'::timestamptz, 'Philadelphia', 'W74', 'W77'),
    (90, 'round_16', '2026-07-04 17:00:00+00'::timestamptz, 'Houston', 'W73', 'W75'),
    (91, 'round_16', '2026-07-05 20:00:00+00'::timestamptz, 'East Rutherford', 'W76', 'W78'),
    (92, 'round_16', '2026-07-06 00:00:00+00'::timestamptz, 'Mexico City', 'W79', 'W80'),
    (93, 'round_16', '2026-07-06 19:00:00+00'::timestamptz, 'Arlington', 'W83', 'W84'),
    (94, 'round_16', '2026-07-07 00:00:00+00'::timestamptz, 'Seattle', 'W81', 'W82'),
    (95, 'round_16', '2026-07-07 16:00:00+00'::timestamptz, 'Atlanta', 'W86', 'W88'),
    (96, 'round_16', '2026-07-07 20:00:00+00'::timestamptz, 'Vancouver', 'W85', 'W87'),
    (97, 'quarter_final', '2026-07-09 20:00:00+00'::timestamptz, 'Foxborough', 'W89', 'W90'),
    (98, 'quarter_final', '2026-07-10 19:00:00+00'::timestamptz, 'Inglewood', 'W93', 'W94'),
    (99, 'quarter_final', '2026-07-11 21:00:00+00'::timestamptz, 'Miami Gardens', 'W91', 'W92'),
    (100, 'quarter_final', '2026-07-12 01:00:00+00'::timestamptz, 'Kansas City', 'W95', 'W96'),
    (101, 'semi_final', '2026-07-14 19:00:00+00'::timestamptz, 'Arlington', 'W97', 'W98'),
    (102, 'semi_final', '2026-07-15 19:00:00+00'::timestamptz, 'Atlanta', 'W99', 'W100'),
    (103, 'third_place', '2026-07-18 21:00:00+00'::timestamptz, 'Miami Gardens', 'L101', 'L102'),
    (104, 'final', '2026-07-19 19:00:00+00'::timestamptz, 'MetLife Stadium, East Rutherford', 'W101', 'W102')
)
update matches m
set
  stage = f.stage::match_stage,
  kickoff_at = f.kickoff_at,
  venue = f.venue,
  home_slot = f.home_slot,
  away_slot = f.away_slot,
  home_team_id = null,
  away_team_id = null
from fixture f
where m.fifa_match_no = f.fifa_match_no
  and m.stage <> 'round_32';

with source_matches as (
  select
    m.fifa_match_no,
    m.home_team_id,
    m.away_team_id,
    r.home_score,
    r.away_score,
    r.penalty_winner_team_id,
    r.status
  from matches m
  join match_results r on r.match_id = m.id
  where r.status = 'finished'
    and m.fifa_match_no between 73 and 104
),
slot_teams as (
  select
    'W' || fifa_match_no::text as slot,
    case
      when home_score = away_score then penalty_winner_team_id
      when home_score > away_score then home_team_id
      else away_team_id
    end as team_id
  from source_matches
  union all
  select
    'L' || fifa_match_no::text as slot,
    case
      when home_score = away_score and penalty_winner_team_id = home_team_id then away_team_id
      when home_score = away_score and penalty_winner_team_id = away_team_id then home_team_id
      when home_score > away_score then away_team_id
      else home_team_id
    end as team_id
  from source_matches
)
update matches m
set
  home_team_id = (select team_id from slot_teams where slot = m.home_slot),
  away_team_id = (select team_id from slot_teams where slot = m.away_slot)
where m.stage <> 'round_32'
  and m.fifa_match_no between 89 and 104;

update matches m
set status = coalesce((
  select r.status
  from match_results r
  where r.match_id = m.id
), 'scheduled'::match_status)
where m.fifa_match_no between 73 and 104;

insert into data_fixes (key)
values ('repair_knockout_bracket_and_data_013')
on conflict (key) do nothing;

commit;

select
  m.fifa_match_no,
  m.stage,
  m.kickoff_at,
  m.venue,
  coalesce(home.code, m.home_slot) as home,
  coalesce(away.code, m.away_slot) as away,
  m.status
from matches m
left join teams home on home.id = m.home_team_id
left join teams away on away.id = m.away_team_id
where m.fifa_match_no between 74 and 104
order by m.kickoff_at, m.fifa_match_no;
