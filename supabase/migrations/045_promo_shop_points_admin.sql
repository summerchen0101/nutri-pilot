-- 優惠活動／優惠碼、購物點 super_admin 手調 RPC
-- @see docs/changes（deploy 後請補 changelog）

-- -----------------------------------------------------------------------------
-- promo_campaigns / promo_codes / promo_redemptions
-- -----------------------------------------------------------------------------

CREATE TABLE public.promo_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  discount_kind TEXT NOT NULL CHECK (discount_kind IN ('percent', 'fixed_amount')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_total NUMERIC NOT NULL DEFAULT 0 CHECK (min_order_total >= 0),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  show_in_member_app BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.promo_campaigns IS '折價活動主檔；結帳核銷流程後續接單';

CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.promo_campaigns(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  uses_count INTEGER NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promo_codes_code_nonempty CHECK (length(trim(code)) > 0),
  UNIQUE (code)
);

CREATE INDEX promo_codes_campaign_idx ON public.promo_codes (campaign_id);

CREATE TABLE public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX promo_redemptions_code_idx ON public.promo_redemptions (promo_code_id);
CREATE INDEX promo_redemptions_user_idx ON public.promo_redemptions (user_id);

COMMENT ON TABLE public.promo_redemptions IS '優惠碼核銷紀錄；結帳寫入';

CREATE OR REPLACE FUNCTION public.promo_codes_normalize_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := upper(trim(NEW.code));
  RETURN NEW;
END;
$$;

CREATE TRIGGER promo_codes_normalize_code_trg
  BEFORE INSERT OR UPDATE OF code ON public.promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.promo_codes_normalize_code();

ALTER TABLE public.promo_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

-- 會員：僅讀「前台展示」活動（不含優惠碼本體）
CREATE POLICY "Member read visible promo campaigns"
  ON public.promo_campaigns FOR SELECT TO authenticated
  USING (
    show_in_member_app = TRUE
    AND is_active = TRUE
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at >= NOW())
  );

-- Staff：editor / super_admin 管理活動與碼
CREATE POLICY "Staff editor promo_campaigns select"
  ON public.promo_campaigns FOR SELECT TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff editor promo_campaigns insert"
  ON public.promo_campaigns FOR INSERT TO authenticated
  WITH CHECK (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff editor promo_campaigns update"
  ON public.promo_campaigns FOR UPDATE TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff super promo_campaigns delete"
  ON public.promo_campaigns FOR DELETE TO authenticated
  USING (public.current_admin_role() = 'super_admin');

CREATE POLICY "Staff editor promo_codes select"
  ON public.promo_codes FOR SELECT TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff editor promo_codes insert"
  ON public.promo_codes FOR INSERT TO authenticated
  WITH CHECK (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff editor promo_codes update"
  ON public.promo_codes FOR UPDATE TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff super promo_codes delete"
  ON public.promo_codes FOR DELETE TO authenticated
  USING (public.current_admin_role() = 'super_admin');

CREATE POLICY "Staff read promo_redemptions"
  ON public.promo_redemptions FOR SELECT TO authenticated
  USING (public.current_admin_role() IN ('super_admin', 'editor', 'cs'));

-- -----------------------------------------------------------------------------
-- admin_adjust_shop_points：super_admin；正數建 batch／負數 FIFO 扣 lots
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_adjust_shop_points(
  p_user_id UUID,
  p_delta INTEGER,
  p_note TEXT,
  p_grant_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
  v_new_balance INTEGER;
  v_ledger_id UUID;
  remaining INTEGER;
  lot_rec RECORD;
  take INTEGER;
BEGIN
  IF coalesce(public.current_admin_role(), '') <> 'super_admin' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_delta IS NULL OR p_delta = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_delta');
  END IF;

  SELECT shop_points_balance
    INTO v_balance
  FROM public.user_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  IF p_delta > 0 THEN
    v_new_balance := v_balance + p_delta;
    UPDATE public.user_profiles
      SET shop_points_balance = v_new_balance
      WHERE user_id = p_user_id;

    INSERT INTO public.user_shop_point_ledger (
      user_id,
      delta,
      balance_after,
      reason,
      note,
      expires_at
    )
    VALUES (
      p_user_id,
      p_delta,
      v_new_balance,
      'admin_adjust',
      left(coalesce(p_note, ''), 500),
      p_grant_expires_at
    )
    RETURNING id INTO v_ledger_id;

    INSERT INTO public.user_shop_point_lots (
      user_id,
      amount_remaining,
      expires_at,
      grant_ledger_id
    )
    VALUES (
      p_user_id,
      p_delta,
      coalesce(
        p_grant_expires_at,
        (NOW() + INTERVAL '3650 days')
      ),
      v_ledger_id
    );

    RETURN jsonb_build_object(
      'ok', true,
      'balance_after', v_new_balance,
      'ledger_id', v_ledger_id
    );
  END IF;

  remaining := abs(p_delta);
  IF v_balance < remaining THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  END IF;

  FOR lot_rec IN
    SELECT id, amount_remaining
    FROM public.user_shop_point_lots
    WHERE user_id = p_user_id
      AND amount_remaining > 0
      AND expires_at > NOW()
    ORDER BY expires_at ASC
    FOR UPDATE
  LOOP
    take := LEAST(lot_rec.amount_remaining, remaining);
    UPDATE public.user_shop_point_lots
      SET amount_remaining = amount_remaining - take
      WHERE id = lot_rec.id;
    remaining := remaining - take;
    EXIT WHEN remaining = 0;
  END LOOP;

  IF remaining > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_lot_inventory');
  END IF;

  v_new_balance := v_balance + p_delta;
  UPDATE public.user_profiles
    SET shop_points_balance = v_new_balance
    WHERE user_id = p_user_id;

  INSERT INTO public.user_shop_point_ledger (
    user_id,
    delta,
    balance_after,
    reason,
    note
  )
  VALUES (
    p_user_id,
    p_delta,
    v_new_balance,
    'admin_adjust',
    left(coalesce(p_note, ''), 500)
  );

  RETURN jsonb_build_object('ok', true, 'balance_after', v_new_balance);
END;
$$;

COMMENT ON FUNCTION public.admin_adjust_shop_points(uuid, integer, text, timestamptz)
  IS 'super_admin：購物點手調；正數入帳＋lot，負數依 lot FIFO 扣抵';

REVOKE ALL ON FUNCTION public.admin_adjust_shop_points(uuid, integer, text, timestamptz)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_adjust_shop_points(uuid, integer, text, timestamptz)
  TO authenticated;
