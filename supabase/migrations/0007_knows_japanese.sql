-- Add knows_japanese to profiles table
ALTER TABLE profiles ADD COLUMN knows_japanese BOOLEAN NOT NULL DEFAULT FALSE;
