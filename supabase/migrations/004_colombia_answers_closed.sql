alter table colombia_answers
  add column if not exists is_closed boolean not null default false;
