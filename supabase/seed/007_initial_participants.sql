insert into participants (display_name, is_active) values
  ('Papa', true),
  ('Mama', true),
  ('Invitado', true)
on conflict do nothing;
