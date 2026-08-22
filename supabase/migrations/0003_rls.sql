-- B10: RLS — Data API เห็นตามสิทธิ์ แม้ทุก write ของแอปเดินผ่าน Nest

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locker_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY locker_stations_select_all
  ON public.locker_stations
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY compartments_select_all
  ON public.compartments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY station_pricing_select_all
  ON public.station_pricing
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY reservations_select_own
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY reservations_update_own
  ON public.reservations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY idempotency_keys_select_own
  ON public.idempotency_keys
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
