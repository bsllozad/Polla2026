alter table participants
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists participants_user_id_key
  on participants(user_id)
  where user_id is not null;

create or replace function current_participant_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id
  from participants
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');

  insert into profiles (id, email, role)
  values (new.id, coalesce(new.email, ''), 'viewer')
  on conflict (id) do nothing;

  insert into participants (display_name, user_id, is_active)
  values (coalesce(display_name, split_part(coalesce(new.email, 'Participante'), '@', 1)), new.id, true)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

drop policy if exists "authenticated read profiles" on profiles;
drop policy if exists "authenticated read own profile" on profiles;
create policy "authenticated read own profile" on profiles
  for select to authenticated
  using (id = auth.uid() or is_superadmin());

drop policy if exists "authenticated manage predictions" on predictions;
drop policy if exists "authenticated update predictions" on predictions;
create policy "authenticated manage own predictions" on predictions
  for insert to authenticated
  with check (is_superadmin() or participant_id = current_participant_id());
create policy "authenticated update own predictions" on predictions
  for update to authenticated
  using (is_superadmin() or participant_id = current_participant_id())
  with check (is_superadmin() or participant_id = current_participant_id());

drop policy if exists "authenticated manage colombia bets" on colombia_bets;
drop policy if exists "authenticated update colombia bets" on colombia_bets;
create policy "authenticated manage own colombia bets" on colombia_bets
  for insert to authenticated
  with check (is_superadmin() or participant_id = current_participant_id());
create policy "authenticated update own colombia bets" on colombia_bets
  for update to authenticated
  using (is_superadmin() or participant_id = current_participant_id())
  with check (is_superadmin() or participant_id = current_participant_id());

grant execute on function current_participant_id() to authenticated;
