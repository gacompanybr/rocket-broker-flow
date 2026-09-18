-- lovable-cron-fallback-reviewed: 288 runs/day; Google Ads reporting metrics are fetched from the external provider and no supported push notification updates campaign spend in this CRM, so five-minute polling is required to match the existing Meta refresh cadence.
select cron.schedule(
  'sync-google-ads',
  '*/5 * * * *',
  $cron$
  select net.http_post(
    url:='https://project--6e5226e0-6940-4050-aa17-ae688fddd229-dev.lovable.app/api/public/hooks/sync-google-ads',
    headers:='{"Content-Type": "application/json", "apikey": "sb_publishable_pZDotZl5mwsqLxhFJpRR-Q_6mMwtOPB"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $cron$
);