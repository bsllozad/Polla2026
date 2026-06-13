-- Script inicial editable para jugadores.
-- No inserta placeholders falsos. Copia el bloque y agrega jugadores reales por seleccion.
-- Posiciones validas: goalkeeper, defender, holding_midfielder, attacking_midfielder, forward.

-- Ejemplo Colombia. Reemplaza/expande con la convocatoria oficial que quieras cargar:
/*
with source(team_code, full_name, position, shirt_number) as (
  values
    ('COL', 'Jugador Colombia 1', 'goalkeeper', 1),
    ('COL', 'Jugador Colombia 2', 'defender', 2),
    ('COL', 'Jugador Colombia 3', 'holding_midfielder', 5),
    ('COL', 'Jugador Colombia 4', 'attacking_midfielder', 10),
    ('COL', 'Jugador Colombia 5', 'forward', 9)
)
insert into players (team_id, full_name, position, shirt_number)
select t.id, s.full_name, s.position::player_position, s.shirt_number
from source s
join teams t on t.code = s.team_code
on conflict (team_id, full_name) do update set
  position = excluded.position,
  shirt_number = excluded.shirt_number,
  is_active = true;
*/

-- Plantilla por equipo:
/*
with source(team_code, full_name, position, shirt_number) as (
  values
    ('MEX', 'Nombre Apellido', 'goalkeeper', 1),
    ('RSA', 'Nombre Apellido', 'goalkeeper', 1),
    ('KOR', 'Nombre Apellido', 'goalkeeper', 1),
    ('CZE', 'Nombre Apellido', 'goalkeeper', 1),
    ('CAN', 'Nombre Apellido', 'goalkeeper', 1),
    ('BIH', 'Nombre Apellido', 'goalkeeper', 1),
    ('QAT', 'Nombre Apellido', 'goalkeeper', 1),
    ('SUI', 'Nombre Apellido', 'goalkeeper', 1),
    ('BRA', 'Nombre Apellido', 'goalkeeper', 1),
    ('MAR', 'Nombre Apellido', 'goalkeeper', 1),
    ('HAI', 'Nombre Apellido', 'goalkeeper', 1),
    ('SCO', 'Nombre Apellido', 'goalkeeper', 1),
    ('USA', 'Nombre Apellido', 'goalkeeper', 1),
    ('PAR', 'Nombre Apellido', 'goalkeeper', 1),
    ('AUS', 'Nombre Apellido', 'goalkeeper', 1),
    ('TUR', 'Nombre Apellido', 'goalkeeper', 1),
    ('GER', 'Nombre Apellido', 'goalkeeper', 1),
    ('CUW', 'Nombre Apellido', 'goalkeeper', 1),
    ('CIV', 'Nombre Apellido', 'goalkeeper', 1),
    ('ECU', 'Nombre Apellido', 'goalkeeper', 1),
    ('NED', 'Nombre Apellido', 'goalkeeper', 1),
    ('JPN', 'Nombre Apellido', 'goalkeeper', 1),
    ('SWE', 'Nombre Apellido', 'goalkeeper', 1),
    ('TUN', 'Nombre Apellido', 'goalkeeper', 1),
    ('BEL', 'Nombre Apellido', 'goalkeeper', 1),
    ('EGY', 'Nombre Apellido', 'goalkeeper', 1),
    ('IRN', 'Nombre Apellido', 'goalkeeper', 1),
    ('NZL', 'Nombre Apellido', 'goalkeeper', 1),
    ('ESP', 'Nombre Apellido', 'goalkeeper', 1),
    ('CPV', 'Nombre Apellido', 'goalkeeper', 1),
    ('KSA', 'Nombre Apellido', 'goalkeeper', 1),
    ('URU', 'Nombre Apellido', 'goalkeeper', 1),
    ('FRA', 'Nombre Apellido', 'goalkeeper', 1),
    ('SEN', 'Nombre Apellido', 'goalkeeper', 1),
    ('IRQ', 'Nombre Apellido', 'goalkeeper', 1),
    ('NOR', 'Nombre Apellido', 'goalkeeper', 1),
    ('ARG', 'Nombre Apellido', 'goalkeeper', 1),
    ('ALG', 'Nombre Apellido', 'goalkeeper', 1),
    ('AUT', 'Nombre Apellido', 'goalkeeper', 1),
    ('JOR', 'Nombre Apellido', 'goalkeeper', 1),
    ('POR', 'Nombre Apellido', 'goalkeeper', 1),
    ('COD', 'Nombre Apellido', 'goalkeeper', 1),
    ('UZB', 'Nombre Apellido', 'goalkeeper', 1),
    ('COL', 'Nombre Apellido', 'goalkeeper', 1),
    ('ENG', 'Nombre Apellido', 'goalkeeper', 1),
    ('CRO', 'Nombre Apellido', 'goalkeeper', 1),
    ('GHA', 'Nombre Apellido', 'goalkeeper', 1),
    ('PAN', 'Nombre Apellido', 'goalkeeper', 1)
)
insert into players (team_id, full_name, position, shirt_number)
select t.id, s.full_name, s.position::player_position, s.shirt_number
from source s
join teams t on t.code = s.team_code
on conflict (team_id, full_name) do update set
  position = excluded.position,
  shirt_number = excluded.shirt_number,
  is_active = true;
*/
