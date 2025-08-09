-- Remove failed version '2' for book "The Divine Gene" and its data
-- Safe to re-run: deletes only if records exist
BEGIN;

-- Delete comments linked to chapters of version '2'
WITH target_book AS (
  SELECT id FROM public.books WHERE title = 'The Divine Gene' LIMIT 1
), target_version AS (
  SELECT bv.id FROM public.book_versions bv
  JOIN target_book b ON bv.book_id = b.id
  WHERE bv.name = '2'
), target_chapters AS (
  SELECT c.id FROM public.chapters c
  JOIN target_version tv ON c.version_id = tv.id
)
DELETE FROM public.comments cm
USING target_chapters tc
WHERE cm.chapter_id = tc.id;

-- Delete chapters for version '2'
WITH target_book AS (
  SELECT id FROM public.books WHERE title = 'The Divine Gene' LIMIT 1
), target_version AS (
  SELECT bv.id FROM public.book_versions bv
  JOIN target_book b ON bv.book_id = b.id
  WHERE bv.name = '2'
)
DELETE FROM public.chapters c
USING target_version tv
WHERE c.version_id = tv.id;

-- Delete the version record itself
WITH target_book AS (
  SELECT id FROM public.books WHERE title = 'The Divine Gene' LIMIT 1
)
DELETE FROM public.book_versions bv
USING target_book b
WHERE bv.book_id = b.id AND bv.name = '2';

COMMIT;