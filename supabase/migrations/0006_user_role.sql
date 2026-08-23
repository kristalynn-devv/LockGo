-- A-01: users.role gates access to the new admin area

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
