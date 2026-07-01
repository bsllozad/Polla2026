# Polla Mundial 2026

App familiar para jugar dos pollas del Mundial 2026:

- Polla por resultados de partidos.
- Polla Colombia con preguntas de 5 puntos.

Stack:

- React + Vite + TypeScript.
- Supabase para auth, base de datos y storage.
- UI estilo shadcn, con componentes propios y CSS responsive.
- Dominio separado en `src/domain` para mantener reglas de negocio fuera de las pantallas.

## Comandos

```bash
npm install
npm run dev
npm run build
npm test
```

## Datos oficiales

No se inventan partidos ni convocatorias. El fixture y jugadores deben importarse desde fuentes verificadas cuando esten disponibles. Las convocatorias finales pueden cambiar, por eso equipos y jugadores son editables por superadmin.

## Seeds Supabase

Ejecutar en este orden:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/seed/001_reference_data.sql`
3. `supabase/seed/002_teams.sql`
4. `supabase/seed/003_group_matches.sql`
5. `supabase/seed/004_knockout_slots.sql` para crear los slots editables de eliminatorias.
6. `supabase/seed/009_fix_knockout_slots.sql`, `supabase/seed/010_set_real_round32_bracket.sql`, `supabase/seed/011_fix_round32_june29_schedule.sql` y `supabase/seed/013_repair_knockout_bracket_and_data.sql` para dejar eliminatorias, horarios y datos ya cargados alineados.
7. `supabase/seed/006_players_fifa_squadlists.sql`
8. `supabase/seed/007_initial_participants.sql` y luego editar/agregar participantes desde la app.
9. `supabase/seed/008_grants.sql`

El seed de jugadores fue generado desde el PDF oficial FIFA indicado en `source_url`. El PDF usa `MC` para todos los mediocampistas; esos jugadores quedan como `attacking_midfielder` y se pueden ajustar manualmente en la app cuando queramos diferenciar volante de marca y volante ofensivo.
