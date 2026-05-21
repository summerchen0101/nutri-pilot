-- 訂單結帳時 FIFO 扣抵購物點（order_redeem）
-- @see docs/changes/2026-05-21-shop-points-cart-checkout.md

CREATE OR REPLACE FUNCTION public.redeem_shop_points_for_order(
  p_user_id UUID,
  p_order_id UUID,
  p_amount INTEGER
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
  IF p_user_id IS NULL OR p_order_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_args');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = p_order_id
      AND o.user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_shop_point_ledger l
    WHERE l.user_id = p_user_id
      AND l.reason = 'order_redeem'
      AND l.ref_type = 'order'
      AND l.ref_id = p_order_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_redeemed');
  END IF;

  SELECT shop_points_balance
    INTO v_balance
  FROM public.user_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  remaining := p_amount;
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

  v_new_balance := v_balance - p_amount;
  UPDATE public.user_profiles
    SET shop_points_balance = v_new_balance
    WHERE user_id = p_user_id;

  INSERT INTO public.user_shop_point_ledger (
    user_id,
    delta,
    balance_after,
    reason,
    ref_type,
    ref_id,
    note
  )
  VALUES (
    p_user_id,
    -p_amount,
    v_new_balance,
    'order_redeem',
    'order',
    p_order_id,
    left('order redeem', 500)
  )
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'ok', true,
    'balance_after', v_new_balance,
    'ledger_id', v_ledger_id,
    'redeemed', p_amount
  );
END;
$$;

COMMENT ON FUNCTION public.redeem_shop_points_for_order(uuid, uuid, integer)
  IS '建單後扣抵購物點；FIFO lots；reason=order_redeem；僅 service role 呼叫';

REVOKE ALL ON FUNCTION public.redeem_shop_points_for_order(uuid, uuid, integer)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_shop_points_for_order(uuid, uuid, integer)
  TO service_role;
