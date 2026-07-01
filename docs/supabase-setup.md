# Configuracion de Supabase

1. Crea un proyecto nuevo en Supabase.
2. En SQL Editor ejecuta `supabase/migrations/001_initial_schema.sql`.
3. Ejecuta `supabase/seed/001_reference_data.sql`.
4. Ejecuta `supabase/seed/002_teams.sql`.
5. Ejecuta `supabase/seed/003_group_matches.sql`.
6. Ejecuta `supabase/seed/004_knockout_slots.sql`.
7. Ejecuta `supabase/seed/009_fix_knockout_slots.sql`, `supabase/seed/010_set_real_round32_bracket.sql`, `supabase/seed/011_fix_round32_june29_schedule.sql` y `supabase/seed/013_repair_knockout_bracket_and_data.sql`.
8. Ejecuta `supabase/seed/006_players_fifa_squadlists.sql`.
9. Ejecuta `supabase/seed/007_initial_participants.sql`.
10. Ejecuta `supabase/seed/008_grants.sql`.
10. En Authentication habilita Email + Password.
11. Crea el usuario familiar que todos conoceran.
12. Copia el `id` del usuario desde `auth.users` y ejecuta:

```sql
insert into public.profiles (id, email, role)
values ('USER_ID_AQUI', 'correo@familia.com', 'superadmin')
on conflict (id) do update set role = 'superadmin';
```

13. Crea un bucket privado `avatars` para fotos de participantes.
14. Crea un bucket publico `flags` si quieres subir banderas propias. Tambien se puede guardar solo emoji/URL.
15. Copia `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env.local`.

Las predicciones se bloquean en frontend al primer partido del dia local. Para reforzarlo en base de datos, agregaremos una funcion RPC cuando conectemos datos reales.
