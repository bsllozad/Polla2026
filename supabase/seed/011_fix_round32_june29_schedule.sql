-- Corrige horarios reales sin cambiar la identidad FIFA del partido.
-- Brasil-Japon se juega primero, pero sigue siendo el partido 76.

with fixture(fifa_match_no, kickoff_at, venue, home_slot, away_slot, home_code, away_code) as (
  values
    (74, '2026-06-29 20:30:00+00'::timestamptz, 'Gillette Stadium, Foxborough', '1E', '3ABCDF', 'GER', 'PAR'),
    (75, '2026-06-30 01:00:00+00'::timestamptz, 'Estadio BBVA, Guadalupe', '1F', '2C', 'NED', 'MAR'),
    (76, '2026-06-29 17:00:00+00'::timestamptz, 'NRG Stadium, Houston', '1C', '2F', 'BRA', 'JPN'),
    (77, '2026-06-30 21:00:00+00'::timestamptz, 'MetLife Stadium, East Rutherford', '1I', '3CDFGH', 'FRA', 'SWE'),
    (78, '2026-06-30 17:00:00+00'::timestamptz, 'AT&T Stadium, Arlington', '2E', '2I', 'CIV', 'NOR')
),
resolved as (
  select
    f.fifa_match_no,
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
  kickoff_at = r.kickoff_at,
  venue = r.venue,
  home_slot = r.home_slot,
  away_slot = r.away_slot,
  home_team_id = r.home_team_id,
  away_team_id = r.away_team_id
from resolved r
where m.fifa_match_no = r.fifa_match_no
  and m.stage = 'round_32';
