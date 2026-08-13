-- ====================================================================
-- Migration: Daily Closing Summary & Batch Aggregation Pipeline
-- Purpose: Pre-aggregate daily donation statistics (cutoff at 23:59:59)
-- Created: 2026-08-13
-- ====================================================================

-- 0. Ensure donations table exists
CREATE TABLE IF NOT EXISTS donations (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL,
  amount         NUMERIC(15, 2) NOT NULL DEFAULT 0,
  donor_name     TEXT,
  donor_phone    TEXT,
  item_name      TEXT DEFAULT '일반헌금/보시',
  payment_method TEXT DEFAULT '신용카드',
  payment_status TEXT DEFAULT 'completed', -- 'completed', 'pending', 'failed', 'cancelled'
  device_type    TEXT DEFAULT 'WEB_MOBILE', -- 'KIOSK', 'WEB_MOBILE'
  is_recurring   BOOLEAN DEFAULT false,
  prayer_text    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Create daily_closing_summaries table
CREATE TABLE IF NOT EXISTS daily_closing_summaries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT NOT NULL,
  closing_date        DATE NOT NULL,
  cutoff_timestamp   TIMESTAMPTZ NOT NULL,
  total_amount        NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_count         INTEGER NOT NULL DEFAULT 0,
  successful_count    INTEGER NOT NULL DEFAULT 0,
  failed_count        INTEGER NOT NULL DEFAULT 0,
  avg_ticket_amount   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  method_matrix       JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_matrix       JSONB NOT NULL DEFAULT '{}'::jsonb,
  item_matrix         JSONB NOT NULL DEFAULT '{}'::jsonb,
  subscription_matrix JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_daily_closing_tenant_date UNIQUE (tenant_id, closing_date)
);

-- 2. Create Performance Indexes for ultra-fast query execution (<1ms)
CREATE INDEX IF NOT EXISTS idx_daily_closing_tenant_date 
  ON daily_closing_summaries(tenant_id, closing_date DESC);

-- Ensure donations table has composite index for cutoff queries
CREATE INDEX IF NOT EXISTS idx_donations_tenant_created 
  ON donations(tenant_id, created_at DESC);

-- 3. Stored Procedure: Execute Daily Closing Batch Aggregation
CREATE OR REPLACE FUNCTION fn_run_daily_closing_aggregation(
  p_target_date DATE DEFAULT (CURRENT_DATE - INTERVAL '1 day')::DATE
)
RETURNS VOID AS $$
DECLARE
  r_tenant RECORD;
  v_cutoff_timestamp TIMESTAMPTZ;
  v_total_amount NUMERIC(15, 2);
  v_total_count INTEGER;
  v_success_count INTEGER;
  v_failed_count INTEGER;
  v_avg_ticket NUMERIC(12, 2);
  v_method_matrix JSONB;
  v_device_matrix JSONB;
  v_item_matrix JSONB;
  v_subscription_matrix JSONB;
BEGIN
  -- Set cutoff timestamp to 23:59:59.999 of target date
  v_cutoff_timestamp := (p_target_date || ' 23:59:59.999+09')::TIMESTAMPTZ;

  -- Loop through each active tenant
  FOR r_tenant IN SELECT DISTINCT tenant_id FROM donations WHERE tenant_id IS NOT NULL LOOP
    
    -- Calculate totals up to cutoff timestamp
    SELECT 
      COALESCE(SUM(amount), 0),
      COUNT(*),
      COUNT(*) FILTER (WHERE payment_status = 'completed'),
      COUNT(*) FILTER (WHERE payment_status = 'failed')
    INTO 
      v_total_amount, v_total_count, v_success_count, v_failed_count
    FROM donations
    WHERE tenant_id = r_tenant.tenant_id
      AND created_at <= v_cutoff_timestamp;

    -- Calculate Average Ticket
    v_avg_ticket := CASE WHEN v_total_count > 0 THEN ROUND(v_total_amount / v_total_count, 2) ELSE 0 END;

    -- Aggregate Payment Method Breakdown (JSONB)
    SELECT COALESCE(jsonb_object_agg(
      method, 
      jsonb_build_object('amount', amount, 'count', cnt)
    ), '{}'::jsonb)
    INTO v_method_matrix
    FROM (
      SELECT 
        COALESCE(payment_method, '신용카드') AS method,
        SUM(amount) AS amount,
        COUNT(*) AS cnt
      FROM donations
      WHERE tenant_id = r_tenant.tenant_id AND created_at <= v_cutoff_timestamp
      GROUP BY COALESCE(payment_method, '신용카드')
    ) m;

    -- Aggregate Device Breakdown (JSONB)
    SELECT jsonb_build_object(
      'kioskAmount', COALESCE(SUM(amount) FILTER (WHERE device_type = 'KIOSK' OR id LIKE '%KIOSK%'), 0),
      'kioskCount',  COUNT(*) FILTER (WHERE device_type = 'KIOSK' OR id LIKE '%KIOSK%'),
      'webAmount',   COALESCE(SUM(amount) FILTER (WHERE device_type != 'KIOSK' AND id NOT LIKE '%KIOSK%'), 0),
      'webCount',    COUNT(*) FILTER (WHERE device_type != 'KIOSK' AND id NOT LIKE '%KIOSK%')
    )
    INTO v_device_matrix
    FROM donations
    WHERE tenant_id = r_tenant.tenant_id AND created_at <= v_cutoff_timestamp;

    -- Aggregate Offering Item Breakdown (JSONB)
    SELECT COALESCE(jsonb_object_agg(
      item_name, 
      jsonb_build_object('amount', amount, 'count', cnt)
    ), '{}'::jsonb)
    INTO v_item_matrix
    FROM (
      SELECT 
        COALESCE(item_name, '일반헌금/보시') AS item_name,
        SUM(amount) AS amount,
        COUNT(*) AS cnt
      FROM donations
      WHERE tenant_id = r_tenant.tenant_id AND created_at <= v_cutoff_timestamp
      GROUP BY COALESCE(item_name, '일반헌금/보시')
    ) i;

    -- Aggregate Subscription Breakdown (JSONB)
    SELECT jsonb_build_object(
      'recurringAmount', COALESCE(SUM(amount) FILTER (WHERE is_recurring = true), 0),
      'recurringCount',  COUNT(*) FILTER (WHERE is_recurring = true),
      'oneTimeAmount',   COALESCE(SUM(amount) FILTER (WHERE is_recurring = false OR is_recurring IS NULL), 0),
      'oneTimeCount',    COUNT(*) FILTER (WHERE is_recurring = false OR is_recurring IS NULL)
    )
    INTO v_subscription_matrix
    FROM donations
    WHERE tenant_id = r_tenant.tenant_id AND created_at <= v_cutoff_timestamp;

    -- Insert or Update Daily Closing Summary Record
    INSERT INTO daily_closing_summaries (
      tenant_id,
      closing_date,
      cutoff_timestamp,
      total_amount,
      total_count,
      successful_count,
      failed_count,
      avg_ticket_amount,
      method_matrix,
      device_matrix,
      item_matrix,
      subscription_matrix,
      updated_at
    ) VALUES (
      r_tenant.tenant_id,
      p_target_date,
      v_cutoff_timestamp,
      v_total_amount,
      v_total_count,
      v_success_count,
      v_failed_count,
      v_avg_ticket,
      v_method_matrix,
      v_device_matrix,
      v_item_matrix,
      v_subscription_matrix,
      NOW()
    )
    ON CONFLICT (tenant_id, closing_date) DO UPDATE SET
      cutoff_timestamp   = EXCLUDED.cutoff_timestamp,
      total_amount        = EXCLUDED.total_amount,
      total_count         = EXCLUDED.total_count,
      successful_count    = EXCLUDED.successful_count,
      failed_count        = EXCLUDED.failed_count,
      avg_ticket_amount   = EXCLUDED.avg_ticket_amount,
      method_matrix       = EXCLUDED.method_matrix,
      device_matrix       = EXCLUDED.device_matrix,
      item_matrix         = EXCLUDED.item_matrix,
      subscription_matrix = EXCLUDED.subscription_matrix,
      updated_at          = NOW();

  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Initial Aggregation Run (Execute once for existing data up to yesterday)
SELECT fn_run_daily_closing_aggregation();
