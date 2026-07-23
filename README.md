# Nihongo Hero

A quest-based English→Japanese learning platform. See the master build spec for the full product vision. **All 7 build phases are implemented**: Foundation, Admin CMS, Learner core, SRS & review, Dashboard & gamification, Boss challenges, and Finish & harden — plus a v2 speech-scoring add-on.

## Curriculum — full JLPT N5 (523 learning items)

Authored as reviewable data modules in [scripts/data/](scripts/data) and loaded by the seed. **8 areas · 89 quests · 371 activities**:

| Area | Content |
| --- | --- |
| Start Village | What Japanese is, the writing systems, how it sounds + mini boss |
| Hiragana Forest | **All hiragana** — 46 base + dakuten/handakuten + yōon combos (104) + boss |
| Katakana Gate | **All katakana** (104) + loan words + boss |
| First Conversation | Greetings, thanks, すみません, the 私は___です pattern + self-intro boss |
| Numbers & Time | 1–10, big numbers, counters, days, months, time words + boss |
| Everyday Words | ~180 core N5 words (people, food, places, verbs, い/な-adjectives, question words…) + boss |
| Kanji Grove | **~80 N5 kanji** with on/kun readings, stroke counts, radicals, mnemonics + boss |
| Grammar Gate | 16 N5 grammar points (particles を/に/へ/で/の/と/も/から/まで/か/が, ます-form, adjectives, 〜が好き, 〜たい, 〜ませんか…) with sentence-builder drills + boss |

**Item mix:** 208 kana · 214 vocabulary · 78 kanji · 14 grammar · 9 phrases. All four skills (reading/writing/listening/speaking) are exercised. This has been **run and verified against a live Supabase**: guest sign-in → onboarding → roadmap → lesson → quiz → `complete_quest` (XP/streak/badge/daily-quest confirmed in the DB) → `get_dashboard`.

> **Migrations:** `npm run migrate` applies everything in `supabase/migrations/` (see [Setup](#setup)).

## Hardening pass

- **Markdown rendering** ([Markdown.tsx](src/components/Markdown.tsx)): lesson bodies, quiz prompts, and explanations render real markdown (previously `**bold**` displayed as literal asterisks — a genuine defect, since the seed content uses markdown). Hand-styled to the theme; HTML is escaped, not executed. Covered by 6 component tests.
- **Live markdown preview** in the lesson-step editor (spec §10).
- **Code-splitting**: entry chunk cut from **513 kB → 50 kB** via `manualChunks`; react / supabase / query / forms / markdown / dnd-kit now cache independently. The >500 kB build warning is gone.
- **dnd-kit drag-to-reorder** (spec §10) replaces the up/down buttons in the content tree (areas, quests) and the lesson-step list, writing sequential `sort_order`. Keyboard-accessible via dnd-kit's KeyboardSensor.

## v2 add-on — Speech-recognition scoring

Trains the **speaking** skill (previously never exercised) fully client-side:

- [lib/speech.ts](src/lib/speech.ts) wraps the browser SpeechRecognition API (Chrome/Edge, `ja-JP`) behind an abstraction with availability detection.
- [lib/speechScore.ts](src/lib/speechScore.ts) (pure, 7 tests) scores a transcript against the item's kanji **and** kana targets via the shared kana normalizer.
- A new `speaking` [quiz component](src/components/quiz/SpeakingQuiz.tsx) (mic → recognize → score) plugs into the `QuizRunner`, the admin activity editor + preview, and review synthesis. Speaking-weak items now surface speaking reviews; when no recognizer is available (Firefox/Safari) it degrades to an honest self-grade, and review generation falls back to a reading activity.
- New `speaking` value added to the `activity_type` enum ([0006](supabase/migrations/0006_speaking_activity.sql)).

## What's built (Phase 7 — Finish & harden)

- **Launch curriculum** in [scripts/seed.ts](scripts/seed.ts) — see the full **JLPT N5** dataset below.
- **Onboarding coach marks** ([CoachMarks](src/components/CoachMarks.tsx)): a one-time 3-step tour (map → quest → review) shown on the roadmap after onboarding, persisted so it appears once.
- **States/dark/responsive audit**: every data-fetching page has loading + empty + error-with-retry states; `dark:` styling and mobile-first breakpoints throughout (bottom tabs on mobile, sidebar on desktop).

## What's built (Phase 6 — Boss challenges)

- **submit_boss_attempt RPC** ([0005](supabase/migrations/0005_submit_boss.sql)): grades an attempt server-side against the quest's activities (choice + typed authoritatively; other types via self-report), records the attempt/score, and on pass delegates to `complete_quest` for XP/badge/area-unlock. Returns missed items grouped by skill.
- **Boss runner** (`/boss/:questSlug`): dramatic entry screen (rules, skills, attempts), a **no-feedback exam** with a depleting boss HP bar, and branching results — victory (reuses the completion + unlock ceremony) or an encouraging fail screen that lists missed items by skill and offers **one-tap targeted review** of exactly those items.
- Boss quests now route to the dedicated runner from the roadmap and dashboard.

## What's built (Phase 5 — Dashboard & gamification)

- **get_dashboard RPC** ([0004](supabase/migrations/0004_get_dashboard.sql)): one round-trip returning stats, daily quest (ensures today's row, auto-completes + awards XP when targets are met), due counts by type, weakest skill, and 7-day activity.
- **Full dashboard**: hero Continue-Quest card, review card (due by type), daily-quest card with progress rings, stats strip (streak / level / XP / weakest skill), next-unlock teaser, and a weekly activity chart.
- **Profile analytics**: level ring with XP-to-next, streak stats, a 12-week contribution calendar, a badge case (earned in colour / unearned greyed), a mastery-state breakdown, and a four-skill radar.
>
> **Seed content:** after migrating, run `npm run seed` (needs `SUPABASE_SERVICE_ROLE_KEY` in `.env`) to load Start Village + the full Hiragana Forest.

## What's built (Phase 4 — SRS & review)

- **SRS + mastery engine** ([srs.ts](src/lib/srs.ts), [mastery.ts](src/lib/mastery.ts)): interval table, stage transitions, four-skill EMA scoring, mastery-state derivation, `forgotten` detection — fully unit-tested (55 tests total).
- **submit_review_result RPC** ([0003](supabase/migrations/0003_submit_review.sql)): mirrors the §7 math server-side, logs answers, awards review XP, ticks the daily quest, and updates the streak.
- **Review lobby** (`/review`): due counts by type, "Battle all" / per-type, 7-day forecast chart, weak-items call-out, and a light-mode cap.
- **Review battle** (`/review/session`): battle-framed runner with enemy HP + combo, per-answer SRS persistence, wrong-item re-queue (re-answers don't raise the stage), and a results screen. Every item is reviewable even with zero authored activities (auto-synthesized from item data, targeting the weakest skill).
- **Library** (`/library`) + item detail: filter by type / mastery state / weakest skill; four skill bars, SRS status, and answer history.
- Live due-count badge on the Review nav tab.
- **Seed script** ([scripts/seed.ts](scripts/seed.ts)): real content — Start Village (4 quests) + Hiragana Forest (all 46 kana across 10 row-quests + boss) + badges.

## What's built (Phase 3 — Learner core)

- **Roadmap** (`/roadmap`): world map of areas with progress rings and lock states, driven by pure unlock rules ([unlock.ts](src/lib/unlock.ts)); area detail (`/roadmap/:areaSlug`) shows the quest trail with type/difficulty/time/XP and resume state.
- **Lesson player** (`/quest/:questSlug`): full-screen distraction-free stepper (explanation / example / practice), segmented progress, mid-lesson resume (persists `current_step_index`), and admin preview mode.
- **Quiz engine**: all 7 activity types (`multiple_choice`, `listen_and_choose`, `fill_in_blank`, `typing`, `sentence_builder`, `match_pair`, `flashcard`) via a `QuizRunner` with instant feedback, IME-safe typing, and answer logging.
- **complete_quest RPC** ([0002](supabase/migrations/0002_complete_quest.sql)): atomic, server-validated completion — seeds review items, awards XP, updates streak (timezone-aware) + daily quest, grants badges, and computes unlocks. Celebration screen shows XP count-up, level-up, badge, and next quest.
- **Dashboard** "Continue Quest" now deep-links to the next actionable quest.
- Pure, unit-tested logic: kana/romaji normalization + grading, unlock rules, XP curve (37 tests total).

## What's built (Phase 2 — Admin CMS)

- Role-guarded `/admin` area with its own layout/nav.
- **Content tree** (`/admin/content`): courses → areas → quests, collapsible, with create/edit modals, status transitions, archive (soft delete), and drag-to-reorder (dnd-kit).
- **Quest editor** (`/admin/quest/:id`): tabbed — metadata (prerequisite + badge pickers, skills, XP, threshold), lesson steps (per-type forms with inline 🔊 TTS test, reorder, delete), items taught (search-and-attach), and activities. A publish bar runs guard-rail validation and blocks publishing until the quest is complete.
- **Item manager** (`/admin/items`): filterable table, create/edit with kanji fieldset, and **CSV import** with per-row zod validation (valid rows import as drafts).
- **Activity editor**: per-type dynamic forms (choices + correct flags, match-pair keys, sentence tokens, typed answers with alternates, audio) plus a **live interactive preview** of each activity type.
- **Badges** manager, read-only **Learners** summary, and **Analytics** (published counts, hardest questions, 7-day event bars).
- Shared zod content schemas, TTS abstraction (`lib/tts.ts`) + `<AudioButton>`, and unit tests for publish validation and the CSV parser.

## What's built (Phase 1 — Foundation)

- Vite + React 18 + TypeScript + TailwindCSS + React Router v6 (lazy routes) + TanStack Query v5 + Zustand.
- Supabase client (typed) with email **and** anonymous (guest) auth.
- Route guards: `RequireAuth`, `RequireOnboarding`, `RequireAdmin`.
- App shell with the five-tab navigation (bottom tabs on mobile, sidebar on desktop) + admin link for admins.
- Onboarding flow (goal → identity → romaji preference) that bootstraps the profile.
- Functional Dashboard (stats strip) and Profile (settings, dark mode, guest→account upgrade, sign out).
- Roadmap / Review / Library are honest placeholders with empty states — they arrive in later phases.
- Dark mode, error boundary, loading/empty/error state primitives, unit-test infra (Vitest).

## Setup

1. **Create a Supabase project** (or use an existing one).

2. **Configure env:** copy `.env.example` → `.env` and fill in:

   | Variable | Where to find it | Used by |
   | --- | --- | --- |
   | `VITE_SUPABASE_URL` | Settings → API → Project URL | the app |
   | `VITE_SUPABASE_ANON_KEY` | Settings → API → anon public | the app |
   | `DATABASE_URL` | Settings → Database → Connection string → **URI** (direct, port 5432) | `npm run migrate` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role | `npm run seed` |

   > `DATABASE_URL` and the service-role key are server-side only — they're never imported into client code, and `.env` is gitignored.

3. **Apply the schema:**
   ```bash
   npm install
   npm run migrate          # applies every supabase/migrations/*.sql, once
   npm run migrate:status   # optional: see what's applied vs pending
   ```
   The runner tracks applied files in a `schema_migrations` table, so it's safe to re-run — it only applies what's pending. Each file runs in a transaction and rolls back on error (except files marked `-- migrate:no-transaction`).

   *Prefer the GUI?* You can instead paste `supabase/migrations/*.sql` into the SQL editor in filename order (`0001` → `0006`).

4. **Enable anonymous sign-ins:** Authentication → Providers → Anonymous.

5. **Seed the curriculum and run:**
   ```bash
   npm run seed             # Start Village, Hiragana, Katakana, First Conversation
   npm run dev
   ```
   Without keys, the app boots to a friendly setup screen instead of crashing.

## Making yourself an admin

After signing up, set your role in the SQL editor:

```sql
update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (68 unit + component tests) |
| `npm run migrate` | Apply pending SQL migrations to Supabase |
| `npm run migrate:status` | List applied vs pending migrations |
| `npm run seed` | Load the launch curriculum (idempotent) |
| `npm run gen:types` | Regenerate `src/lib/database.types.ts` from the live DB |

## Regenerating DB types

`src/lib/database.types.ts` is hand-written for the Phase 1 subset. Once the migration is live, regenerate the full typed schema:

```bash
supabase login
npm run gen:types   # uses SUPABASE_PROJECT_ID from .env
```

> Keep the types as `type` aliases, not `interface`s — interfaces lack an implicit
> index signature and silently degrade supabase-js queries to `never`.
