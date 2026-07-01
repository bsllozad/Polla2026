-- Corrige solo horarios/estadios del 1 de julio.
-- No toca apuestas, resultados ni goleadores.

with fixture(fifa_match_no, kickoff_at, venue) as (
  values
    (81, '2026-07-02 00:00:00+00'::timestamptz, 'Levi''s Stadium, Santa Clara'),
    (82, '2026-07-01 20:00:00+00'::timestamptz, 'Lumen Field, Seattle')
)
update matches m
set
  kickoff_at = f.kickoff_at,
  venue = f.venue
from fixture f
where m.fifa_match_no = f.fifa_match_no
  and m.stage = 'round_32';
