-- 1) Create roles and role helper
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('admin', 'editor', 'user');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  );
$$;

-- Policies for user_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Users can view their own roles'
  ) THEN
    CREATE POLICY "Users can view their own roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can manage roles'
  ) THEN
    CREATE POLICY "Admins can manage roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 2) Tighten RLS on content tables
-- Drop overly permissive policies if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='books' AND policyname='Public can manage books') THEN
    DROP POLICY "Public can manage books" ON public.books;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='books' AND policyname='Public can read books') THEN
    -- Keep or create read policy
    CREATE POLICY "Public can read books"
    ON public.books
    FOR SELECT
    USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='books' AND policyname='Admins can manage books') THEN
    CREATE POLICY "Admins can manage books"
    ON public.books
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(),'admin'))
    WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='book_versions' AND policyname='Public can manage book_versions') THEN
    DROP POLICY "Public can manage book_versions" ON public.book_versions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='book_versions' AND policyname='Public can read book_versions') THEN
    CREATE POLICY "Public can read book_versions"
    ON public.book_versions
    FOR SELECT
    USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='book_versions' AND policyname='Admins can manage book_versions') THEN
    CREATE POLICY "Admins can manage book_versions"
    ON public.book_versions
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(),'admin'))
    WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chapters' AND policyname='Public can manage chapters') THEN
    DROP POLICY "Public can manage chapters" ON public.chapters;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chapters' AND policyname='Public can read chapters') THEN
    CREATE POLICY "Public can read chapters"
    ON public.chapters
    FOR SELECT
    USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chapters' AND policyname='Admins can manage chapters') THEN
    CREATE POLICY "Admins can manage chapters"
    ON public.chapters
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(),'admin'))
    WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

-- Comments: allow public read, authenticated create, admin manage
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='Public can manage comments') THEN
    DROP POLICY "Public can manage comments" ON public.comments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='Public can create comments') THEN
    DROP POLICY "Public can create comments" ON public.comments;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='Public can read comments') THEN
    CREATE POLICY "Public can read comments"
    ON public.comments
    FOR SELECT
    USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='Authenticated users can create comments') THEN
    CREATE POLICY "Authenticated users can create comments"
    ON public.comments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comments' AND policyname='Admins can manage comments') THEN
    CREATE POLICY "Admins can manage comments"
    ON public.comments
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(),'admin'))
    WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

-- 3) Ensure updated_at triggers on all content tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_books_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_books_updated_at
    BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_book_versions_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_book_versions_updated_at
    BEFORE UPDATE ON public.book_versions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_chapters_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_chapters_updated_at
    BEFORE UPDATE ON public.chapters
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_comments_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;