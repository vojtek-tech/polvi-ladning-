-- Landing page event log: one row per page view and per CTA click.
--
-- Run this in the Supabase SQL editor for the SAME project as app.polvi.ai, so
-- that these events sit alongside the users they turn into and the join is local.
--
-- Design notes:
--   * `ref` is deliberately free text. The page writes whatever it found and the
--     dashboard decides how to group it — no enum to migrate every time a new
--     campaign tag appears.
--   * `visit_id` is generated in memory on page load and never stored on the
--     device. It links a view to the clicks from that same page load, and dies on
--     reload. That is what keeps this cookieless, and therefore banner-free.
--   * There is deliberately no SELECT policy. The anon key can append events and
--     nothing else: it cannot read back a single row, so the log is not a public
--     export of who visited.

create table if not exists public.landing_events (
  id         bigint      generated always as identity primary key,
  created_at timestamptz not null default now(),

  -- Per page load, from the browser. Not unique per person, by design.
  visit_id   uuid        not null,

  type       text        not null check (type in ('view', 'cta_click')),

  -- Free-form campaign tag: ?ref=, else utm_source, else the referring hostname.
  -- NULL means direct traffic.
  ref        text        check (ref is null or length(ref) <= 200),

  -- Which CTA was clicked: 'nav', 'hero', 'closing', 'pricing:pro', ...
  cta        text        check (cta is null or length(cta) <= 64),

  referrer   text        check (referrer is null or length(referrer) <= 500),
  host       text        check (host is null or length(host) <= 253),
  path       text        check (path is null or length(path) <= 500),

  -- A view never carries a CTA; a click always does.
  constraint landing_events_cta_matches_type
    check ((type = 'cta_click') = (cta is not null))
);

create index if not exists landing_events_created_at_idx on public.landing_events (created_at desc);
create index if not exists landing_events_ref_idx        on public.landing_events (ref);
create index if not exists landing_events_visit_idx      on public.landing_events (visit_id);

alter table public.landing_events enable row level security;

-- Append-only for the browser. No SELECT / UPDATE / DELETE policy exists, so the
-- anon key cannot read, change or remove anything here.
drop policy if exists "anon appends landing events" on public.landing_events;
create policy "anon appends landing events"
  on public.landing_events
  for insert
  to anon
  with check (true);


-- Reporting rollup: views, unique visits and CTA clicks per ref.
--
-- security_invoker = on matters. Without it the view runs with its owner's rights
-- and would happily read straight through the RLS above, handing anon exactly the
-- data the missing SELECT policy is meant to withhold.
create or replace view public.landing_ref_stats
with (security_invoker = on) as
select
  coalesce(ref, '(direct)')                                   as ref,
  count(*) filter (where type = 'view')                       as views,
  count(distinct visit_id) filter (where type = 'view')       as visits,
  count(*) filter (where type = 'cta_click')                  as cta_clicks,
  count(distinct visit_id) filter (where type = 'cta_click')  as visits_with_click,
  min(created_at)                                             as first_seen,
  max(created_at)                                             as last_seen
from public.landing_events
group by 1
order by views desc;

revoke all on public.landing_ref_stats from anon, authenticated;

-- Which CTA is actually doing the work, per ref.
create or replace view public.landing_cta_stats
with (security_invoker = on) as
select
  coalesce(ref, '(direct)')  as ref,
  cta,
  count(*)                   as clicks,
  count(distinct visit_id)   as visits
from public.landing_events
where type = 'cta_click'
group by 1, 2
order by clicks desc;

revoke all on public.landing_cta_stats from anon, authenticated;
