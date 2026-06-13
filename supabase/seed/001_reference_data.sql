insert into colombia_answers (question_key, points) values
  ('first_colombia_goal', 5),
  ('top_colombia_scorer', 5),
  ('messi_goals', 5),
  ('ronaldo_goals', 5),
  ('colombia_finish', 5),
  ('world_cup_top_scorer', 5),
  ('world_cup_assist_leader', 5),
  ('first_eliminated', 5),
  ('champion', 5)
on conflict (question_key) do nothing;
