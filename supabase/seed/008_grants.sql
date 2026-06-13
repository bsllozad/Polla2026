grant usage on schema public to authenticated;

grant select on
  profiles,
  participants,
  teams,
  players,
  matches,
  predictions,
  match_results,
  goals,
  assists,
  bracket_slots,
  colombia_bets,
  colombia_answers
to authenticated;

grant insert, update on
  predictions,
  colombia_bets
to authenticated;

grant insert, update, delete on
  participants,
  teams,
  players,
  matches,
  match_results,
  goals,
  assists,
  bracket_slots,
  colombia_answers
to authenticated;

grant execute on function is_superadmin() to authenticated;
grant execute on function current_participant_id() to authenticated;
