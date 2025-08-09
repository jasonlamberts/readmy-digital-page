-- Allow public inserts so anyone can import without auth

-- Books: allow anyone to create
CREATE POLICY IF NOT EXISTS "Public can insert books"
ON public.books
FOR INSERT
TO public
WITH CHECK (true);

-- Book versions: allow anyone to create
CREATE POLICY IF NOT EXISTS "Public can insert book_versions"
ON public.book_versions
FOR INSERT
TO public
WITH CHECK (true);

-- Chapters: allow anyone to create
CREATE POLICY IF NOT EXISTS "Public can insert chapters"
ON public.chapters
FOR INSERT
TO public
WITH CHECK (true);
