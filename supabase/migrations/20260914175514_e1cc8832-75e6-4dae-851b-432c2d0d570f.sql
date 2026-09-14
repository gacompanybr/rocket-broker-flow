CREATE TABLE public.meta_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL UNIQUE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  adset_external_id text,
  adset_name text,
  nome text NOT NULL,
  status text NOT NULL DEFAULT 'paused',
  effective_status text,
  creative_external_id text,
  media_type text NOT NULL DEFAULT 'unknown',
  thumbnail_url text,
  image_url text,
  video_id text,
  body text,
  title text,
  link_url text,
  source_story_id text,
  created_time timestamptz,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX meta_ads_campaign_id_idx ON public.meta_ads(campaign_id);
CREATE INDEX meta_ads_status_idx ON public.meta_ads(status, effective_status);

GRANT SELECT ON public.meta_ads TO authenticated;
GRANT ALL ON public.meta_ads TO service_role;

ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meta_ads_read"
ON public.meta_ads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = meta_ads.campaign_id
  )
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER meta_ads_set_updated_at
BEFORE UPDATE ON public.meta_ads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.campaign_metrics_summary(_from date, _to date)
RETURNS TABLE (
  campaign_id uuid,
  spend numeric,
  impressions bigint,
  reach bigint,
  clicks bigint,
  leads bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    cm.campaign_id,
    COALESCE(sum(cm.spend), 0)::numeric,
    COALESCE(sum(cm.impressions), 0)::bigint,
    COALESCE(sum(cm.reach), 0)::bigint,
    COALESCE(sum(cm.clicks), 0)::bigint,
    COALESCE(sum(cm.leads), 0)::bigint
  FROM public.campaign_metrics cm
  WHERE cm.date BETWEEN _from AND _to
  GROUP BY cm.campaign_id;
$$;

CREATE OR REPLACE FUNCTION public.campaign_metrics_daily(_from date, _to date)
RETURNS TABLE (
  date date,
  campaign_id uuid,
  spend numeric,
  leads bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    cm.date,
    cm.campaign_id,
    COALESCE(sum(cm.spend), 0)::numeric,
    COALESCE(sum(cm.leads), 0)::bigint
  FROM public.campaign_metrics cm
  WHERE cm.date BETWEEN _from AND _to
  GROUP BY cm.date, cm.campaign_id
  ORDER BY cm.date;
$$;

GRANT EXECUTE ON FUNCTION public.campaign_metrics_summary(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.campaign_metrics_daily(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.campaign_metrics_summary(date, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.campaign_metrics_daily(date, date) TO service_role;