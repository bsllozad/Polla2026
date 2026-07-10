-- Corrige horarios reales del cierre de 16avos.
-- No toca apuestas, resultados ni goleadores.

with fixture(fifa_match_no, kickoff_at, venue) as (
  values
    -- Switzerland vs Algeria: Thu Jul 2, 11:00 PM ET / 9:00 PM MT.
    (85, '2026-07-03 03:00:00+00'::timestamptz, 'BC Place, Vancouver'),
    -- Colombia vs Ghana: Sat Jul 4, 2:30 AM BST / Fri Jul 3, 7:30 PM MT.
    (87, '2026-07-04 01:30:00+00'::timestamptz, 'Arrowhead Stadium, Kansas City'),
    -- Australia vs Egypt: Sat Jul 4, 4:00 AM AEST / Fri Jul 3, 12:00 PM MT.
    (88, '2026-07-03 18:00:00+00'::timestamptz, 'AT&T Stadium, Arlington')
)
update matches m
set
  kickoff_at = f.kickoff_at,
  venue = f.venue
from fixture f
where m.fifa_match_no = f.fifa_match_no
  and m.stage = 'round_32';

