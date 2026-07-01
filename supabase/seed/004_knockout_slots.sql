-- Cruces eliminatorios como slots.
-- Los equipos reales se resuelven despues de fase de grupos.
-- Si FIFA cambia horarios/venues, este script se puede re-ejecutar porque usa fifa_match_no como llave.

with fixture(fifa_match_no, stage, kickoff_at, venue, home_slot, away_slot) as (
  values
    (73, 'round_32', '2026-06-28 19:00:00+00'::timestamptz, 'SoFi Stadium, Inglewood', '2A', '2B'),
    (74, 'round_32', '2026-06-29 20:30:00+00'::timestamptz, 'Gillette Stadium, Foxborough', '1E', '3ABCDF'),
    (75, 'round_32', '2026-06-30 01:00:00+00'::timestamptz, 'Estadio BBVA, Guadalupe', '1F', '2C'),
    (76, 'round_32', '2026-06-29 17:00:00+00'::timestamptz, 'NRG Stadium, Houston', '1C', '2F'),
    (77, 'round_32', '2026-06-30 21:00:00+00'::timestamptz, 'MetLife Stadium, East Rutherford', '1I', '3CDFGH'),
    (78, 'round_32', '2026-06-30 17:00:00+00'::timestamptz, 'AT&T Stadium, Arlington', '2E', '2I'),
    (79, 'round_32', '2026-07-01 01:00:00+00'::timestamptz, 'Estadio Azteca, Mexico City', '1A', '3CEFHI'),
    (80, 'round_32', '2026-07-01 16:00:00+00'::timestamptz, 'Mercedes-Benz Stadium, Atlanta', '1L', '3EHIJK'),
    (81, 'round_32', '2026-07-02 00:00:00+00'::timestamptz, 'Levi''s Stadium, Santa Clara', '1D', '3BEFIJ'),
    (82, 'round_32', '2026-07-01 20:00:00+00'::timestamptz, 'Lumen Field, Seattle', '1G', '3AEHIJ'),
    (83, 'round_32', '2026-07-02 19:00:00+00'::timestamptz, 'BMO Field, Toronto', '2K', '2L'),
    (84, 'round_32', '2026-07-02 19:00:00+00'::timestamptz, 'SoFi Stadium, Inglewood', '1H', '2J'),
    (85, 'round_32', '2026-07-03 19:00:00+00'::timestamptz, 'BC Place, Vancouver', '1B', '3EFGIJ'),
    (86, 'round_32', '2026-07-03 22:00:00+00'::timestamptz, 'Hard Rock Stadium, Miami Gardens', '1J', '2H'),
    (87, 'round_32', '2026-07-04 00:00:00+00'::timestamptz, 'Arrowhead Stadium, Kansas City', '1K', '3DEIJL'),
    (88, 'round_32', '2026-07-04 01:00:00+00'::timestamptz, 'AT&T Stadium, Arlington', '2D', '2G'),
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
insert into matches (fifa_match_no, stage, kickoff_at, venue, home_slot, away_slot, status)
select fifa_match_no, stage::match_stage, kickoff_at, venue, home_slot, away_slot, 'scheduled'::match_status
from fixture
on conflict (fifa_match_no) do update set
  stage = excluded.stage,
  kickoff_at = excluded.kickoff_at,
  venue = excluded.venue,
  home_slot = excluded.home_slot,
  away_slot = excluded.away_slot,
  status = excluded.status;
