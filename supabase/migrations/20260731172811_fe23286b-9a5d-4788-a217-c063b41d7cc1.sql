delete from public.campaign_metrics m using public.campaigns c where c.id = m.campaign_id and c.platform = 'google';
delete from public.broker_campaigns bc using public.campaigns c where c.id = bc.campaign_id and c.platform = 'google';
delete from public.campaigns where platform = 'google';
delete from public.site_metrics;