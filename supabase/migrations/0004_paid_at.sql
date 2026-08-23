-- P-01: ใบจองมี paid_at · ตาราง payments เก็บวิธีจ่ายหลังฟอร์ม
-- ไม่เก็บเลขบัตร ไม่ต่อเกตเวย์จริง (§20)

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations (id) ON DELETE restrict,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE restrict,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'THB',
  method text NOT NULL DEFAULT 'promptpay' CHECK (method IN ('promptpay', 'card', 'bank')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_reservation_uidx UNIQUE (reservation_id)
);

CREATE INDEX IF NOT EXISTS payments_user_idx ON public.payments (user_id);

INSERT INTO public.payments (reservation_id, user_id, amount, method, status, created_at)
SELECT id, user_id, total_price, 'promptpay', 'completed', paid_at
FROM public.reservations
WHERE paid_at IS NOT NULL
ON CONFLICT (reservation_id) DO NOTHING;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select_own ON public.payments;
CREATE POLICY payments_select_own
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
