drop policy if exists "authenticated manage colombia bets" on colombia_bets;
drop policy if exists "authenticated update colombia bets" on colombia_bets;
drop policy if exists "authenticated manage own colombia bets" on colombia_bets;
drop policy if exists "authenticated update own colombia bets" on colombia_bets;

create policy "colombia bets are closed for inserts" on colombia_bets
  for insert to authenticated
  with check (false);

create policy "colombia bets are closed for updates" on colombia_bets
  for update to authenticated
  using (false)
  with check (false);
