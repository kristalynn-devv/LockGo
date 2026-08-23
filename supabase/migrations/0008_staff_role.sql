-- A-03: role on public.users (staff) — future room for roles beyond admin,
-- e.g. a support role that can view but not manage. Everyone currently in
-- the table gets 'admin' by default (unchanged behavior).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin'));
