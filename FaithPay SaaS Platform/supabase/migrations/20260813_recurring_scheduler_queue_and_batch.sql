-- ====================================================================
-- Migration: Recurring Payment Scheduler Queue & Automated Batch Procedure
-- Purpose: Generate and manage daily recurring billing execution queues
-- Created: 2026-08-13
-- ====================================================================

-- 0. Ensure subscriptions table exists
CREATE TABLE IF NOT EXISTS subscriptions (
  id            TEXT PRIMARY KEY DEFAULT ('SUB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')),
  tenant_id     TEXT NOT NULL,
  donor_name    TEXT NOT NULL,
  donor_phone   TEXT,
  donor_email   TEXT,
  item_name     TEXT DEFAULT '일반후원금',
  amount        NUMERIC(15, 2) NOT NULL DEFAULT 0,
  bill_key      TEXT NOT NULL,
  card_no       TEXT,
  card_name     TEXT DEFAULT '신용카드',
  recurring_day INTEGER NOT NULL DEFAULT 15, -- 매월 이체일 (1~31)
  status        TEXT DEFAULT 'active', -- 'active' (이체중), 'paused' (일시중지), 'cancelled' (해지)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Create scheduled_payment_queues table
CREATE TABLE IF NOT EXISTS scheduled_payment_queues (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id     TEXT NOT NULL,
  tenant_id           TEXT NOT NULL,
  scheduled_date      DATE NOT NULL,
  scheduled_timestamp TIMESTAMPTZ NOT NULL,
  donor_name          TEXT,
  donor_phone         TEXT,
  item_name           TEXT DEFAULT '일반후원금',
  amount              NUMERIC(15, 2) NOT NULL DEFAULT 0,
  payment_method      TEXT DEFAULT '신용카드 빌링',
  attempt_count       INTEGER NOT NULL DEFAULT 1,
  status              TEXT NOT NULL DEFAULT 'pending', -- 'pending' (이체대기), 'executed' (결제승인완료), 'skipped' (스킵건너뜀), 'failed' (결제실패)
  executed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_scheduled_queue_sub_date UNIQUE (subscription_id, scheduled_date)
);

-- 2. Create Performance Indexes for ultra-fast scheduler lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_queues_tenant_date
  ON scheduled_payment_queues(tenant_id, scheduled_date, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_recurring_day
  ON subscriptions(recurring_day, status);

-- 3. Stored Procedure: Generate Daily Batch Execution Queue (Runs every midnight at 00:00 KST)
CREATE OR REPLACE FUNCTION fn_process_recurring_daily_batch(
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_target_day INTEGER;
  v_inserted_count INTEGER := 0;
BEGIN
  -- Extract target day of month (e.g. 15 for August 15th)
  v_target_day := EXTRACT(DAY FROM p_target_date);

  -- Insert pending execution items for active subscriptions matching target recurring day
  INSERT INTO scheduled_payment_queues (
    subscription_id,
    tenant_id,
    scheduled_date,
    scheduled_timestamp,
    donor_name,
    donor_phone,
    item_name,
    amount,
    payment_method,
    attempt_count,
    status,
    created_at,
    updated_at
  )
  SELECT 
    s.id,
    s.tenant_id,
    p_target_date,
    (p_target_date || ' 09:00:00+09')::TIMESTAMPTZ,
    s.donor_name,
    s.donor_phone,
    COALESCE(s.item_name, '일반후원금'),
    s.amount,
    COALESCE(s.card_name, '신용카드 빌링'),
    1,
    'pending',
    NOW(),
    NOW()
  FROM subscriptions s
  WHERE s.status = 'active'
    AND s.recurring_day = v_target_day
  ON CONFLICT (subscription_id, scheduled_date) DO UPDATE SET
    updated_at = NOW();

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Stored Procedure: Execute / Complete Scheduled Payment (Manual or Cron Trigger)
CREATE OR REPLACE FUNCTION fn_execute_scheduled_payment(
  p_queue_id UUID,
  p_new_status TEXT DEFAULT 'executed'
)
RETURNS VOID AS $$
DECLARE
  r_queue RECORD;
  v_donation_id TEXT;
BEGIN
  -- Fetch queue item
  SELECT * INTO r_queue FROM scheduled_payment_queues WHERE id = p_queue_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scheduled queue item not found: %', p_queue_id;
  END IF;

  -- Update queue status
  UPDATE scheduled_payment_queues
  SET 
    status = p_new_status,
    executed_at = CASE WHEN p_new_status = 'executed' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_queue_id;

  -- If status is 'executed', automatically record completed donation transaction
  IF p_new_status = 'executed' THEN
    v_donation_id := 'FP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
    
    INSERT INTO donations (
      id,
      tenant_id,
      amount,
      donor_name,
      donor_phone,
      item_name,
      payment_method,
      payment_status,
      device_type,
      is_recurring,
      created_at
    ) VALUES (
      v_donation_id,
      r_queue.tenant_id,
      r_queue.amount,
      r_queue.donor_name,
      r_queue.donor_phone,
      r_queue.item_name,
      r_queue.payment_method,
      'completed',
      'WEB_MOBILE',
      true,
      NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Initial Batch Execution Run (Populates today's scheduler queue)
SELECT fn_process_recurring_daily_batch();
