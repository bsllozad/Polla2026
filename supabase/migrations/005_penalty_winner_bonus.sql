alter table predictions
  add column if not exists penalty_winner_team_id uuid references teams(id);

alter table match_results
  add column if not exists penalty_winner_team_id uuid references teams(id);
