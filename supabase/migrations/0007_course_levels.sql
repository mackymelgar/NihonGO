-- ============================================================
-- Nihongo Hero — multi-course support (JLPT levels as separate courses).
-- Lets the roadmap present N5, N4, … N1 as distinct, ordered, gateable courses.
-- ============================================================

-- The JLPT level a course targets (5 = N5 … 1 = N1). Null for non-JLPT courses.
alter table courses add column if not exists jlpt_level int
  check (jlpt_level is null or jlpt_level between 1 and 5);

-- Optional prerequisite: this course unlocks once the required course is cleared.
alter table courses add column if not exists required_course_id uuid references courses(id);
