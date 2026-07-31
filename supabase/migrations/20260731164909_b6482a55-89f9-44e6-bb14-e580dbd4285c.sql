CREATE TABLE IF NOT EXISTS public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  code integer,
  message text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.integration_logs TO authenticated;
GRANT ALL ON public.integration_logs TO service_role;

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_logs_read" ON public.integration_logs
  FOR SELECT TO authenticated
  USING (is_admin() OR has_role(auth.uid(), 'owner'::public.app_role));

CREATE INDEX IF NOT EXISTS integration_logs_created_at_idx ON public.integration_logs (created_at DESC);

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.integration_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_metrics;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.campaign_metrics LIMIT 0) THEN NULL; END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_metrics_campaign_date_key
  ON public.campaign_metrics (campaign_id, date);

CREATE UNIQUE INDEX IF NOT EXISTS campaigns_platform_external_key
  ON public.campaigns (platform, external_id);

CREATE UNIQUE INDEX IF NOT EXISTS social_metrics_date_key
  ON public.social_metrics (date);