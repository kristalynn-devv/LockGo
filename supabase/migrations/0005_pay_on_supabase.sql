-- ชำระที่ Postgres บน Supabase — ฟอร์มส่ง method แล้วเขียน payments + paid_at ในฟังก์ชันเดียว
-- ยังไม่ตัดเงินเกตเวย์จริง (§20) แต่ไม่ให้ Nest insert แถวเอง
-- ต้อง DROP CHECK ก่อน เพราะของเดิมอนุญาตแค่ mock

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_method_check;

UPDATE public.payments
SET method = 'promptpay'
WHERE method = 'mock';

ALTER TABLE public.payments
  ALTER COLUMN method SET DEFAULT 'promptpay';

ALTER TABLE public.payments
  ADD CONSTRAINT payments_method_check
  CHECK (method IN ('promptpay', 'card', 'bank'));

CREATE OR REPLACE FUNCTION private.pay_lockgo_reservation(
  p_user_id uuid,
  p_reservation_id uuid,
  p_method text
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  v_row public.reservations;
  v_paid_at timestamptz;
BEGIN
  IF p_method NOT IN ('promptpay', 'card', 'bank') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_row
    FROM public.reservations
   WHERE id = p_reservation_id
   FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_row.user_id <> p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN'
      USING ERRCODE = '42501';
  END IF;

  IF v_row.status = 'Reserved' AND v_row.no_show_deadline < clock_timestamp() THEN
    UPDATE public.reservations
       SET status = 'Expired', updated_at = clock_timestamp()
     WHERE id = v_row.id;
    RAISE EXCEPTION 'CANNOT_PAY'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_row.paid_at IS NOT NULL THEN
    RETURN v_row;
  END IF;

  IF v_row.status <> 'Reserved' THEN
    RAISE EXCEPTION 'CANNOT_PAY'
      USING ERRCODE = 'P0001';
  END IF;

  v_paid_at := clock_timestamp();

  INSERT INTO public.payments (
    reservation_id,
    user_id,
    amount,
    currency,
    method,
    status,
    created_at
  ) VALUES (
    v_row.id,
    v_row.user_id,
    v_row.total_price,
    'THB',
    p_method,
    'completed',
    v_paid_at
  )
  ON CONFLICT (reservation_id) DO NOTHING;

  UPDATE public.reservations
     SET paid_at = v_paid_at,
         updated_at = v_paid_at
   WHERE id = v_row.id
     AND paid_at IS NULL
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION private.pay_lockgo_reservation(uuid, uuid, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.pay_lockgo_reservation(uuid, uuid, text)
  TO postgres, service_role;
