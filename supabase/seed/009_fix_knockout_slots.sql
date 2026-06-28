-- Corrige los slots de 16avos segun el calendario oficial del Mundial 2026.
-- Ejecutar una vez en Supabase SQL Editor si ya se habia cargado 004_knockout_slots.sql.

with fixture(fifa_match_no, home_slot, away_slot) as (
  values
    (73, '2A', '2B'),
    (74, '1E', '3ABCDF'),
    (75, '1F', '2C'),
    (76, '1C', '2F'),
    (77, '1I', '3CDFGH'),
    (78, '2E', '2I'),
    (79, '1A', '3CEFHI'),
    (80, '1L', '3EHIJK'),
    (81, '1D', '3BEFIJ'),
    (82, '1G', '3AEHIJ'),
    (83, '2K', '2L'),
    (84, '1H', '2J'),
    (85, '1B', '3EFGIJ'),
    (86, '1J', '2H'),
    (87, '1K', '3DEIJL'),
    (88, '2D', '2G')
)
update matches m
set
  home_slot = f.home_slot,
  away_slot = f.away_slot
from fixture f
where m.fifa_match_no = f.fifa_match_no
  and m.stage = 'round_32';
