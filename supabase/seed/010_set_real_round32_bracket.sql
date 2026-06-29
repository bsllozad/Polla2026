-- Actualiza la base con los 16avos reales del Mundial 2026.
-- Ejecutar despues de 009_fix_knockout_slots.sql.
-- Los octavos y rondas posteriores quedan como slots Wxx/Lxx hasta que se registren resultados.

with round32(fifa_match_no, home_code, away_code) as (
  values
    (73, 'RSA', 'CAN'),
    (74, 'BRA', 'JPN'),
    (75, 'GER', 'PAR'),
    (76, 'NED', 'MAR'),
    (77, 'FRA', 'SWE'),
    (78, 'CIV', 'NOR'),
    (79, 'MEX', 'ECU'),
    (80, 'ENG', 'COD'),
    (81, 'USA', 'BIH'),
    (82, 'BEL', 'SEN'),
    (83, 'POR', 'CRO'),
    (84, 'ESP', 'AUT'),
    (85, 'SUI', 'ALG'),
    (86, 'ARG', 'CPV'),
    (87, 'COL', 'GHA'),
    (88, 'AUS', 'EGY')
),
resolved as (
  select
    r.fifa_match_no,
    home.id as home_team_id,
    away.id as away_team_id
  from round32 r
  join teams home on home.code = r.home_code
  join teams away on away.code = r.away_code
)
update matches m
set
  home_team_id = r.home_team_id,
  away_team_id = r.away_team_id
from resolved r
where m.fifa_match_no = r.fifa_match_no
  and m.stage = 'round_32';

with downstream(fifa_match_no, home_slot, away_slot) as (
  values
    (89, 'W74', 'W77'),
    (90, 'W73', 'W75'),
    (91, 'W76', 'W78'),
    (92, 'W79', 'W80'),
    (93, 'W83', 'W84'),
    (94, 'W81', 'W82'),
    (95, 'W86', 'W88'),
    (96, 'W85', 'W87'),
    (97, 'W89', 'W90'),
    (98, 'W93', 'W94'),
    (99, 'W91', 'W92'),
    (100, 'W95', 'W96'),
    (101, 'W97', 'W98'),
    (102, 'W99', 'W100'),
    (103, 'L101', 'L102'),
    (104, 'W101', 'W102')
)
update matches m
set
  home_slot = d.home_slot,
  away_slot = d.away_slot,
  home_team_id = null,
  away_team_id = null
from downstream d
where m.fifa_match_no = d.fifa_match_no
  and m.stage <> 'round_32';
