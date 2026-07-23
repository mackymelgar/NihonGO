-- migrate:no-transaction
-- ============================================================
-- Nihongo Hero — add 'speaking' to the activity_type enum (v2 speech scoring).
-- ALTER TYPE ... ADD VALUE is safest outside a transaction block, so the
-- migration runner applies this file unwrapped.
-- ============================================================

alter type activity_type add value if not exists 'speaking';
