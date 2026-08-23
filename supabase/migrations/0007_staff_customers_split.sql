-- A-02: split public.users into public.customers (everyone, auto-provisioned)
-- and a new public.users (staff only, added by hand) — presence in the new
-- public.users table is what grants admin access, no role column needed.

ALTER TABLE public.users RENAME TO customers;

ALTER TABLE public.customers DROP COLUMN IF EXISTS role;

ALTER POLICY users_select_own ON public.customers RENAME TO customers_select_own;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
BEGIN
  INSERT INTO public.customers (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET
      display_name = EXCLUDED.display_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.create_lockgo_reservation(
  p_user_id uuid,
  p_station_id uuid,
  p_size public.compartment_size,
  p_start_time timestamptz,
  p_duration_hours integer
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  v_status public.station_status;
  v_end_time timestamptz;
  v_deadline timestamptz;
  v_compartment_id uuid;
  v_rate numeric(10, 2);
  v_total numeric(10, 2);
  v_number text;
  v_row public.reservations;
BEGIN
  IF p_duration_hours < 1 OR p_duration_hours > 24 THEN
    RAISE EXCEPTION 'INVALID_DURATION'
      USING ERRCODE = '22023';
  END IF;

  IF p_start_time < clock_timestamp() THEN
    RAISE EXCEPTION 'START_IN_PAST'
      USING ERRCODE = '22023';
  END IF;

  IF p_start_time > clock_timestamp() + interval '7 days' THEN
    RAISE EXCEPTION 'START_TOO_FAR'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'USER_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT s.status
    INTO v_status
  FROM public.locker_stations s
  WHERE s.id = p_station_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'STATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'Open' THEN
    RAISE EXCEPTION 'STATION_UNAVAILABLE'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.reservations
  SET
    status = 'Expired',
    updated_at = clock_timestamp()
  WHERE status = 'Reserved'
    AND no_show_deadline < clock_timestamp();

  v_end_time := p_start_time + make_interval(hours => p_duration_hours);
  v_deadline := p_start_time + interval '15 minutes';

  PERFORM 1
  FROM public.compartments c
  WHERE c.station_id = p_station_id
    AND c.size = p_size
  FOR UPDATE;

  SELECT c.id
    INTO v_compartment_id
  FROM public.compartments c
  WHERE c.station_id = p_station_id
    AND c.size = p_size
    AND NOT EXISTS (
      SELECT 1
      FROM public.reservations r
      WHERE r.compartment_id = c.id
        AND r.status IN ('Reserved', 'Active')
        AND tstzrange(r.start_time, r.end_time, '[)')
          && tstzrange(p_start_time, v_end_time, '[)')
    )
  ORDER BY c.label
  LIMIT 1;

  IF v_compartment_id IS NULL THEN
    RAISE EXCEPTION 'NO_AVAILABILITY'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT sp.rate_per_hour
    INTO v_rate
  FROM public.station_pricing sp
  WHERE sp.station_id = p_station_id
    AND sp.size = p_size;

  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'PRICING_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  v_total := GREATEST(v_rate * p_duration_hours, 30);
  v_number := format(
    'LK-%s-%s',
    to_char((clock_timestamp() AT TIME ZONE 'Asia/Bangkok'), 'YYYYMMDD'),
    lpad(nextval('private.reservation_number_seq')::text, 6, '0')
  );

  INSERT INTO public.reservations (
    reservation_number,
    user_id,
    compartment_id,
    start_time,
    end_time,
    no_show_deadline,
    status,
    unit_price,
    duration_hours,
    total_price
  )
  VALUES (
    v_number,
    p_user_id,
    v_compartment_id,
    p_start_time,
    v_end_time,
    v_deadline,
    'Reserved',
    v_rate,
    p_duration_hours,
    v_total
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
