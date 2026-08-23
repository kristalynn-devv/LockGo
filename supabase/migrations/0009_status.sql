-- A-04: status on both public.customers and public.users — a way to
-- deactivate an account without deleting it. Enforcement:
--   staff: AdminGuard now requires status = 'active' in addition to role
--   customers: column only for now, no request-path enforcement yet

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_status_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_status_check CHECK (status IN ('active', 'inactive'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive'));
