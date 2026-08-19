with targets as (
  select date, 165 - sum(protein) as shortfall
  from public.meals
  where user_id = 'c534bdf0-812b-4f0d-be92-838059352d45'
    and date in ('2026-07-24','2026-08-17')
  group by date
), pick as (
  select distinct on (m.date) m.id, t.shortfall
  from public.meals m join targets t on t.date = m.date
  where m.user_id = 'c534bdf0-812b-4f0d-be92-838059352d45'
  order by m.date, m.protein desc nulls last, m.created_at desc
)
update public.meals m
set protein = round((coalesce(m.protein,0) + pick.shortfall)::numeric, 1)
from pick
where m.id = pick.id and pick.shortfall > 0;