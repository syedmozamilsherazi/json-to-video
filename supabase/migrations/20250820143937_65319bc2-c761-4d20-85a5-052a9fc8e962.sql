-- Rename images column to videos in speakers_v2 table
ALTER TABLE public.speakers_v2 RENAME COLUMN images TO videos;