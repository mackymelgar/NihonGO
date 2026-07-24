/**
 * Nihongo Hero — content seed (full JLPT N5 foundation).
 * Start Village · Hiragana Forest · Katakana Gate · First Conversation ·
 * Numbers & Time · Everyday Words · Kanji Grove · Grammar Gate.
 * Data-driven and idempotent: wipes the previously-seeded course and its
 * children, then rebuilds. Everything is published. Curriculum data lives in
 * scripts/data/*.ts.
 *
 *   npm run seed
 *
 * Requires VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env. Uses the
 * service-role key, which bypasses RLS — never import this into the client.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { HIRAGANA_ROWS, KATAKANA_ROWS } from './data/kana';
import { NUMBER_THEMES } from './data/numbers';
import { VOCAB_THEMES } from './data/vocab';
import { KANJI_THEMES } from './data/kanji';
import { GRAMMAR_POINTS } from './data/grammar';
import { N4_KANJI_THEMES } from './data/n4-kanji';
import { N4_VOCAB_THEMES } from './data/n4-vocab';
import { N4_GRAMMAR_POINTS } from './data/n4-grammar';
import type { GrammarPoint, KanjiTheme, VocabTheme } from './data/types';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
// Every course this seed owns (includes the legacy single-course slug so old
// data is cleaned up on re-seed).
const COURSE_SLUGS = ['japanese-zero-to-hero', 'jlpt-n5', 'jlpt-n4'];

// ---------- low-level helpers ----------
async function insert<T = any>(table: string, row: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.from(table).insert(row).select('*').single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data as T;
}
function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
const ROMAJI_POOL = ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko', 'sa', 'shi', 'su', 'se', 'so', 'ta', 'chi', 'tsu', 'te', 'to', 'na', 'ni', 'nu', 'ne', 'no', 'ha', 'hi', 'fu', 'he', 'ho', 'ma', 'mi', 'mu', 'me', 'mo', 'ya', 'yu', 'yo', 'ra', 'ri', 'ru', 're', 'ro', 'wa', 'wo', 'n'];
function romajiDistractors(correct: string, n = 3): string[] {
  return shuffle(ROMAJI_POOL.filter((r) => r !== correct)).slice(0, n);
}
function pickDistractors(pool: string[], correct: string, n = 3): string[] {
  return shuffle(pool.filter((x) => x !== correct)).slice(0, n);
}

async function step(questId: string, row: Record<string, unknown>, sort: number) {
  return insert('lesson_steps', { quest_id: questId, sort_order: sort, ...row });
}

async function multipleChoice(
  questId: string,
  opts: { prompt: string; japanese?: string | null; tts?: string | null; type?: string; correct: string; distractors: string[]; sort: number },
) {
  const activity = await insert<{ id: string }>('activities', {
    quest_id: questId,
    activity_type: opts.type ?? 'multiple_choice',
    skills: opts.type === 'listen_and_choose' ? ['listening'] : ['reading'],
    prompt_md: opts.prompt,
    japanese_text: opts.japanese ?? null,
    tts_text: opts.tts ?? null,
    status: 'published',
    sort_order: opts.sort,
  });
  const labels = shuffle([opts.correct, ...opts.distractors]);
  await db.from('activity_choices').insert(
    labels.map((label, i) => ({ activity_id: activity.id, label, is_correct: label === opts.correct, sort_order: i })),
  );
  return activity;
}

async function sentenceBuilder(
  questId: string,
  opts: { prompt: string; tokens: string[]; distractors: string[]; sort: number },
) {
  return insert<{ id: string }>('activities', {
    quest_id: questId,
    activity_type: 'sentence_builder',
    skills: ['reading', 'writing'],
    prompt_md: opts.prompt,
    sentence_tokens: opts.tokens,
    distractor_tokens: opts.distractors,
    status: 'published',
    sort_order: opts.sort,
  });
}

async function typingActivity(
  questId: string,
  opts: { prompt: string; japanese: string; correct: string; accepted: string[]; sort: number },
) {
  return insert<{ id: string }>('activities', {
    quest_id: questId,
    activity_type: 'typing',
    skills: ['reading', 'writing'],
    prompt_md: opts.prompt,
    japanese_text: opts.japanese,
    correct_answer: opts.correct,
    accepted_answers: opts.accepted,
    status: 'published',
    sort_order: opts.sort,
  });
}

// ---------- WIPE prior seed ----------
/** Delete helper that surfaces errors instead of silently continuing. */
async function del(table: string, apply: (q: any) => any) {
  const { error } = await apply(db.from(table).delete());
  if (error) throw new Error(`wipe ${table}: ${error.message}`);
}

/**
 * Delete rows matching `column IN (ids)`, in chunks. PostgREST encodes `.in()`
 * into the request URL, so a few hundred UUIDs blows past URL length limits and
 * the filter silently stops matching — which previously let FK violations
 * through. Chunking keeps every request small.
 */
const DELETE_CHUNK = 40;
async function delIn(table: string, column: string, ids: string[]) {
  for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
    const slice = ids.slice(i, i + DELETE_CHUNK);
    const { error } = await db.from(table).delete().in(column, slice);
    if (error) throw new Error(`wipe ${table} (${column}): ${error.message}`);
  }
}

/** Page through a select to collect every id — PostgREST caps a single response
 * (1000 rows by default), which the growing curriculum would otherwise exceed. */
async function scanIds(table: string, apply: (q: any) => any): Promise<string[]> {
  const PAGE = 500;
  const ids: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await apply(db.from(table).select('id')).range(from, from + PAGE - 1);
    if (error) throw new Error(`wipe scan ${table}: ${error.message}`);
    ids.push(...(data ?? []).map((r: { id: string }) => r.id));
    if (!data || data.length < PAGE) break;
  }
  return ids;
}

/**
 * Remove the previously-seeded course and everything under it. This also clears
 * learner rows that reference the old content (answer_logs, mastery, progress),
 * so re-seeding is safe on a database that's already been used — at the cost of
 * resetting progress on the seeded content, which is expected for a seed.
 */
async function wipe() {
  const { data: courses } = await db.from('courses').select('id').in('slug', COURSE_SLUGS);
  const courseIds = (courses ?? []).map((c) => c.id);

  // All seed learning_items (tagged), regardless of course.
  const itemIds = await scanIds('learning_items', (q) => q.contains('tags', ['seed']));

  let questIds: string[] = [];
  let areaIds: string[] = [];
  if (courseIds.length) {
    const { data: areas } = await db.from('areas').select('id').in('course_id', courseIds);
    areaIds = (areas ?? []).map((a) => a.id);
    for (let i = 0; i < areaIds.length; i += DELETE_CHUNK) {
      const { data: quests } = await db.from('quests').select('id').in('area_id', areaIds.slice(i, i + DELETE_CHUNK));
      questIds.push(...(quests ?? []).map((q) => q.id));
    }
  }

  // 1) Learner data that references seed quests/items (FKs would block deletes).
  await delIn('answer_logs', 'quest_id', questIds);
  await delIn('user_quest_progress', 'quest_id', questIds);
  await delIn('answer_logs', 'item_id', itemIds);
  await delIn('user_item_mastery', 'item_id', itemIds);
  await delIn('quest_items', 'item_id', itemIds);

  // 2) Content, inner-to-outer.
  if (questIds.length) {
    const actIds: string[] = [];
    for (let i = 0; i < questIds.length; i += DELETE_CHUNK) {
      const { data: acts } = await db.from('activities').select('id').in('quest_id', questIds.slice(i, i + DELETE_CHUNK));
      actIds.push(...(acts ?? []).map((a) => a.id));
    }
    await delIn('activity_choices', 'activity_id', actIds);
    await delIn('lesson_steps', 'quest_id', questIds);
    await delIn('quest_items', 'quest_id', questIds);
    await delIn('activities', 'quest_id', questIds);
    // Break the self-referential FK (required_quest_id) before deleting rows.
    for (let i = 0; i < questIds.length; i += DELETE_CHUNK) {
      const { error } = await db
        .from('quests')
        .update({ required_quest_id: null, badge_id: null })
        .in('id', questIds.slice(i, i + DELETE_CHUNK));
      if (error) throw new Error(`wipe quests(unlink): ${error.message}`);
    }
    await delIn('quests', 'id', questIds);
  }
  await delIn('areas', 'id', areaIds);
  if (courseIds.length) {
    // Break the self-referential course FK (required_course_id) before deleting.
    const { error } = await db.from('courses').update({ required_course_id: null }).in('id', courseIds);
    if (error) throw new Error(`wipe courses(unlink): ${error.message}`);
    await delIn('courses', 'id', courseIds);
  }
  await delIn('learning_items', 'id', itemIds);

  console.log(`• wiped prior seed (${courseIds.length} courses, ${questIds.length} quests, ${itemIds.length} items)`);
}

// ---------- generic kana area (hiragana / katakana) ----------
type KanaRow = { slug: string; title: string; chars: [string, string][] };

async function kanaItem(kana: string, romaji: string, tag: string) {
  return insert<{ id: string }>('learning_items', {
    item_type: 'kana',
    japanese_text: kana,
    kana_reading: kana,
    romaji,
    english_meaning: `“${romaji}” sound`,
    tts_text: kana,
    difficulty: 1,
    tags: ['seed', tag],
    status: 'published',
  });
}

/** Creates an area + a quest per kana row. Returns the char index + last quest id. */
async function seedKanaRows(
  courseId: string,
  cfg: { slug: string; title: string; subtitle: string; icon: string; color: string; sort: number; tag: string; rows: KanaRow[] },
) {
  const area = await insert<{ id: string }>('areas', {
    course_id: courseId,
    slug: cfg.slug,
    title: cfg.title,
    subtitle: cfg.subtitle,
    theme_icon: cfg.icon,
    theme_color: cfg.color,
    status: 'published',
    sort_order: cfg.sort,
  });

  let prev: string | null = null;
  let sortOrder = 0;
  const allChars: [string, string, string][] = []; // [kana, romaji, itemId]

  for (const row of cfg.rows) {
    const quest = await insert<{ id: string }>('quests', {
      area_id: area.id,
      slug: `${cfg.tag}-${row.slug}`,
      title: `${cfg.title}: ${row.title}`,
      learning_goal: `Read ${row.chars.map((c) => c[0]).join('')}`,
      quest_type: 'main',
      xp_reward: 50,
      required_quest_id: prev,
      skills_trained: ['reading', 'listening'],
      status: 'published',
      sort_order: sortOrder++,
    });

    let s = 0;
    await step(quest.id, { step_type: 'explanation', title: row.title, body_md: `Meet the **${row.title}**. Say each sound aloud and tap 🔊 to hear it.` }, s++);
    for (const [kana, romaji] of row.chars) {
      const item = await kanaItem(kana, romaji, cfg.tag);
      allChars.push([kana, romaji, item.id]);
      await db.from('quest_items').insert({ quest_id: quest.id, item_id: item.id, sort_order: s });
      await step(quest.id, { step_type: 'example', japanese_text: kana, kana_reading: kana, romaji, english_meaning: `“${romaji}”`, tts_text: kana }, s++);
    }
    for (const [i, [kana, romaji]] of row.chars.slice(0, 3).entries()) {
      const act = await multipleChoice(quest.id, { prompt: 'Which sound is this?', japanese: kana, correct: romaji, distractors: romajiDistractors(romaji), sort: i });
      await step(quest.id, { step_type: 'practice', activity_id: act.id }, s++);
    }
    prev = quest.id;
  }

  return { areaId: area.id, allChars, prevQuestId: prev, sortNext: sortOrder };
}

async function kanaBoss(
  areaId: string,
  allChars: [string, string, string][],
  cfg: { slug: string; title: string; xp: number; requiredQuestId: string | null; sortOrder: number },
) {
  const boss = await insert<{ id: string }>('quests', {
    area_id: areaId,
    slug: cfg.slug,
    title: cfg.title,
    learning_goal: 'Prove you can read it all',
    quest_type: 'boss',
    xp_reward: cfg.xp,
    pass_threshold: 0.8,
    required_quest_id: cfg.requiredQuestId,
    skills_trained: ['reading', 'listening'],
    status: 'published',
    sort_order: cfg.sortOrder,
  });
  const picks = shuffle(allChars).slice(0, 10);
  for (const [i, [kana, romaji, itemId]] of picks.entries()) {
    await db.from('quest_items').insert({ quest_id: boss.id, item_id: itemId, sort_order: i });
    const act = await multipleChoice(boss.id, { prompt: 'Read this:', japanese: kana, correct: romaji, distractors: romajiDistractors(romaji), sort: i });
    await step(boss.id, { step_type: 'practice', activity_id: act.id }, i);
  }
  return boss.id;
}

// (kana / number / vocab / kanji / grammar data live in scripts/data/*.ts)

// ---------- Start Village ----------
async function seedStartVillage(courseId: string) {
  const area = await insert<{ id: string }>('areas', {
    course_id: courseId, slug: 'start-village', title: 'Start Village', subtitle: 'Your first steps',
    theme_icon: '⛩️', theme_color: 'amber', status: 'published', sort_order: 0,
  });

  let prev: string | null = null;
  async function q(slug: string, title: string, goal: string, paras: string[], quiz: { prompt: string; correct: string; distractors: string[] }, sort: number, isBoss = false) {
    const quest = await insert<{ id: string }>('quests', {
      area_id: area.id, slug, title, learning_goal: goal,
      quest_type: isBoss ? 'boss' : 'main', xp_reward: isBoss ? 80 : 40,
      pass_threshold: isBoss ? 0.75 : 0.8, required_quest_id: prev,
      skills_trained: ['reading'], status: 'published', sort_order: sort,
    });
    let s = 0;
    for (const p of paras) await step(quest.id, { step_type: 'explanation', body_md: p }, s++);
    const act = await multipleChoice(quest.id, { prompt: quiz.prompt, correct: quiz.correct, distractors: quiz.distractors, sort: 0 });
    await step(quest.id, { step_type: 'practice', activity_id: act.id, title: 'Quick check' }, s++);
    prev = quest.id;
    return quest;
  }

  await q('what-is-japanese', 'What is Japanese?', 'Understand the shape of the language',
    ['Japanese is spoken by over 120 million people. Unlike English, it uses **three writing systems** together: hiragana, katakana, and kanji.',
     'Good news: pronunciation is simple and consistent. Every character always makes the same sound. You’ll be reading real words within a few quests.'],
    { prompt: 'How many writing systems does Japanese use together?', correct: 'Three', distractors: ['One', 'Two', 'Five'] }, 0);
  await q('writing-systems', 'The three writing systems', 'Tell the writing systems apart',
    ['**Hiragana** (ひらがな) — flowing characters for native Japanese words and grammar. Every learner starts here.',
     '**Katakana** (カタカナ) — angular characters for foreign/loan words like コーヒー (coffee).',
     '**Kanji** (漢字) — characters borrowed from Chinese that carry meaning, like 日 (sun/day).'],
    { prompt: 'Which system is used for foreign loan words?', correct: 'Katakana', distractors: ['Hiragana', 'Kanji', 'Romaji'] }, 1);
  await q('how-japanese-sounds', 'How Japanese sounds work', 'Grasp the sound system',
    ['Japanese has just **five vowel sounds**: a (ah), i (ee), u (oo), e (eh), o (oh). They never change.',
     'Almost every sound is a consonant + vowel pair (ka, ki, ku…), which makes reading predictable once you know the kana.'],
    { prompt: 'How many vowel sounds does Japanese have?', correct: 'Five', distractors: ['Three', 'Ten', 'Twelve'] }, 2);

  const boss = await q('first-mini-quiz', 'First Mini Quiz', 'Prove your Start Village knowledge',
    ['Let’s check what you’ve learned. Answer a few questions — 75% to pass!'],
    { prompt: 'Which writing system do beginners learn first?', correct: 'Hiragana', distractors: ['Kanji', 'Katakana', 'Romaji'] }, 3, true);
  const bossExtras = [
    { prompt: 'コーヒー is written in…', correct: 'Katakana', distractors: ['Hiragana', 'Kanji'] },
    { prompt: 'The vowel “i” sounds like…', correct: 'ee', distractors: ['ah', 'oo', 'oh'] },
  ];
  for (const [i, ex] of bossExtras.entries()) {
    const a = await multipleChoice(boss.id, { ...ex, sort: i + 1 });
    await step(boss.id, { step_type: 'practice', activity_id: a.id }, i + 2);
  }
  return { firstQuestSlug: 'what-is-japanese' };
}

// ---------- Katakana foreign words ----------
const FOREIGN_WORDS: [string, string, string][] = [
  ['コーヒー', 'koohii', 'coffee'],
  ['テレビ', 'terebi', 'TV'],
  ['アメリカ', 'amerika', 'America'],
  ['パン', 'pan', 'bread'],
  ['ケーキ', 'keeki', 'cake'],
  ['ネコ', 'neko', 'cat'],
];
async function seedForeignWords(areaId: string, requiredQuestId: string | null, sortOrder: number) {
  const quest = await insert<{ id: string }>('quests', {
    area_id: areaId, slug: 'katakana-foreign-words', title: 'Katakana: Foreign words',
    learning_goal: 'Read real loan words', quest_type: 'main', xp_reward: 60,
    required_quest_id: requiredQuestId, skills_trained: ['reading', 'listening'], status: 'published', sort_order: sortOrder,
  });
  const meanings = FOREIGN_WORDS.map((w) => w[2]);
  let s = 0;
  await step(quest.id, { step_type: 'explanation', title: 'Loan words', body_md: 'Katakana spells foreign words. Sound them out — you may already know them!' }, s++);
  for (const [jp, romaji, en] of FOREIGN_WORDS) {
    const item = await insert<{ id: string }>('learning_items', {
      item_type: 'vocabulary', japanese_text: jp, kana_reading: jp, romaji, english_meaning: en, tts_text: jp,
      difficulty: 2, tags: ['seed', 'katakana', 'loanword'], status: 'published',
    });
    await db.from('quest_items').insert({ quest_id: quest.id, item_id: item.id, sort_order: s });
    await step(quest.id, { step_type: 'example', japanese_text: jp, kana_reading: jp, romaji, english_meaning: en, tts_text: jp }, s++);
  }
  for (const [i, [jp, , en]] of FOREIGN_WORDS.slice(0, 4).entries()) {
    const act = await multipleChoice(quest.id, { prompt: `What does ${jp} mean?`, japanese: jp, correct: en, distractors: pickDistractors(meanings, en), sort: i });
    await step(quest.id, { step_type: 'practice', activity_id: act.id }, s++);
  }
  return quest.id;
}

// ---------- First Conversation ----------
async function seedFirstConversation(courseId: string) {
  const area = await insert<{ id: string }>('areas', {
    course_id: courseId, slug: 'first-conversation', title: 'First Conversation', subtitle: 'Say your first words',
    theme_icon: '💬', theme_color: 'sky', status: 'published', sort_order: 3,
  });

  let prev: string | null = null;
  let sort = 0;

  async function phraseQuest(slug: string, title: string, goal: string, phrases: [string, string, string][]) {
    const quest = await insert<{ id: string }>('quests', {
      area_id: area.id, slug, title, learning_goal: goal, quest_type: 'main', xp_reward: 55,
      required_quest_id: prev, skills_trained: ['reading', 'listening'], status: 'published', sort_order: sort++,
    });
    const meanings = phrases.map((p) => p[2]);
    let s = 0;
    for (const [jp, romaji, en] of phrases) {
      const item = await insert<{ id: string }>('learning_items', {
        item_type: 'phrase', japanese_text: jp, kana_reading: jp, romaji, english_meaning: en, tts_text: jp,
        difficulty: 2, tags: ['seed', 'phrase'], status: 'published',
      });
      await db.from('quest_items').insert({ quest_id: quest.id, item_id: item.id, sort_order: s });
      await step(quest.id, { step_type: 'example', japanese_text: jp, kana_reading: jp, romaji, english_meaning: en, tts_text: jp }, s++);
    }
    for (const [i, [jp, , en]] of phrases.entries()) {
      const act = await multipleChoice(quest.id, { prompt: `What does ${jp} mean?`, japanese: jp, correct: en, distractors: pickDistractors(meanings, en), sort: i });
      await step(quest.id, { step_type: 'practice', activity_id: act.id }, s++);
      const listen = await multipleChoice(quest.id, { prompt: 'Listen and choose the meaning', tts: jp, type: 'listen_and_choose', correct: en, distractors: pickDistractors(meanings, en), sort: i + 100 });
      await step(quest.id, { step_type: 'practice', activity_id: listen.id }, s++);
    }
    prev = quest.id;
    return quest.id;
  }

  await phraseQuest('greetings', 'Greetings', 'Greet people at any time of day', [
    ['こんにちは', 'konnichiwa', 'hello / good afternoon'],
    ['おはようございます', 'ohayou gozaimasu', 'good morning'],
    ['こんばんは', 'konbanwa', 'good evening'],
  ]);
  await phraseQuest('thanks', 'Thanks & apologies', 'Say thank you and sorry', [
    ['ありがとうございます', 'arigatou gozaimasu', 'thank you'],
    ['どういたしまして', 'douitashimashite', 'you’re welcome'],
    ['ごめんなさい', 'gomennasai', 'I’m sorry'],
  ]);
  await phraseQuest('sumimasen', 'Excuse me', 'Get attention politely', [
    ['すみません', 'sumimasen', 'excuse me / sorry'],
    ['はい', 'hai', 'yes'],
    ['いいえ', 'iie', 'no'],
  ]);

  // Grammar: 私は___です
  const grammar = await insert<{ id: string }>('quests', {
    area_id: area.id, slug: 'watashi-wa-desu', title: 'I am ___ (私は___です)', learning_goal: 'Introduce yourself',
    quest_type: 'main', xp_reward: 70, required_quest_id: prev, skills_trained: ['reading', 'writing'], status: 'published', sort_order: sort++,
  });
  const grammarItems: [string, string, string, string, string][] = [
    // japanese, kana, romaji, english, tts
    ['私', 'わたし', 'watashi', 'I / me', 'わたし'],
    ['は', 'は', 'wa (topic particle)', 'topic marker (says “as for…”)', 'わ'],
    ['です', 'です', 'desu', 'to be (polite)', 'です'],
  ];
  let gs = 0;
  await step(grammar.id, { step_type: 'explanation', title: 'The topic + です pattern', body_md: 'To say “I am Mack”, use **私 は マック です**. 私 = I, は marks the topic (pronounced “wa”), です = am/is.' }, gs++);
  for (const [jp, kana, romaji, en, tts] of grammarItems) {
    const item = await insert<{ id: string }>('learning_items', {
      item_type: jp === '私' ? 'vocabulary' : 'grammar', japanese_text: jp, kana_reading: kana, romaji, english_meaning: en, tts_text: tts,
      difficulty: 2, tags: ['seed', 'grammar'], status: 'published',
    });
    await db.from('quest_items').insert({ quest_id: grammar.id, item_id: item.id, sort_order: gs });
    await step(grammar.id, { step_type: 'example', japanese_text: jp, kana_reading: kana, romaji, english_meaning: en, tts_text: tts }, gs++);
  }
  await step(grammar.id, { step_type: 'example', japanese_text: '私はマックです。', kana_reading: 'わたしはマックです。', romaji: 'watashi wa Makku desu.', english_meaning: 'I am Mack.', tts_text: 'わたしはマックです' }, gs++);
  const sb = await sentenceBuilder(grammar.id, { prompt: 'Build: “I am Mack.”', tokens: ['私', 'は', 'マック', 'です'], distractors: ['を', 'か'], sort: 0 });
  await step(grammar.id, { step_type: 'practice', activity_id: sb.id }, gs++);
  const mc = await multipleChoice(grammar.id, { prompt: 'Which particle marks the topic?', correct: 'は', distractors: ['を', 'か', 'の'], sort: 1 });
  await step(grammar.id, { step_type: 'practice', activity_id: mc.id }, gs++);
  prev = grammar.id;

  // Self-Introduction Boss
  const boss = await insert<{ id: string }>('quests', {
    area_id: area.id, slug: 'self-introduction-boss', title: 'Self-Introduction Boss', learning_goal: 'Put it all together',
    quest_type: 'boss', xp_reward: 160, pass_threshold: 0.8, required_quest_id: prev, skills_trained: ['reading', 'listening', 'writing'], status: 'published', sort_order: sort++,
  });
  let bs = 0;
  const bossMC = [
    { prompt: 'What does こんにちは mean?', correct: 'hello', distractors: ['thank you', 'sorry', 'good morning'] },
    { prompt: 'What does ありがとうございます mean?', correct: 'thank you', distractors: ['hello', 'excuse me', 'yes'] },
    { prompt: 'How do you say “excuse me”?', correct: 'すみません', distractors: ['こんばんは', 'いいえ', 'どういたしまして'] },
    { prompt: 'Which means “to be” (polite)?', correct: 'です', distractors: ['は', '私', 'を'] },
  ];
  for (const q of bossMC) {
    const a = await multipleChoice(boss.id, { ...q, sort: bs });
    await step(boss.id, { step_type: 'practice', activity_id: a.id }, bs++);
  }
  const bsb = await sentenceBuilder(boss.id, { prompt: 'Build: “I am Mack.”', tokens: ['私', 'は', 'マック', 'です'], distractors: ['を', 'ね'], sort: bs });
  await step(boss.id, { step_type: 'practice', activity_id: bsb.id }, bs++);

  return { bossId: boss.id };
}

// ---------- badges ----------
async function seedBadges(
  bosses: {
    hiragana: string; katakana: string; selfIntro: string; numbers: string; vocab: string; kanji: string; grammar: string;
    n4Vocab: string; n4Kanji: string; n4Grammar: string;
  },
  firstQuestSlug: string,
) {
  const badges = [
    { slug: 'first-steps', title: 'First Steps', description: 'Completed your first quest.', icon_emoji: '👣' },
    { slug: 'hiragana-hero', title: 'Hiragana Hero', description: 'Defeated the Hiragana Boss.', icon_emoji: '🌸' },
    { slug: 'katakana-conqueror', title: 'Katakana Conqueror', description: 'Defeated the Katakana Boss.', icon_emoji: '⚔️' },
    { slug: 'self-intro-star', title: 'Self-Intro Star', description: 'Passed the Self-Introduction Boss.', icon_emoji: '⭐' },
    { slug: 'number-ninja', title: 'Number Ninja', description: 'Defeated the Numbers Boss.', icon_emoji: '🔢' },
    { slug: 'word-collector', title: 'Word Collector', description: 'Defeated the Vocabulary Boss.', icon_emoji: '📚' },
    { slug: 'kanji-conqueror', title: 'Kanji Conqueror', description: 'Defeated the Kanji Boss.', icon_emoji: '🎋' },
    { slug: 'grammar-guru', title: 'Grammar Guru', description: 'Defeated the Grammar Boss — full N5 complete!', icon_emoji: '🏆' },
    { slug: 'n4-wordsmith', title: 'N4 Wordsmith', description: 'Defeated the N4 Vocabulary Boss.', icon_emoji: '🗂️' },
    { slug: 'n4-kanji-master', title: 'N4 Kanji Master', description: 'Defeated the N4 Kanji Boss.', icon_emoji: '🌳' },
    { slug: 'n4-champion', title: 'N4 Champion', description: 'Defeated the N4 Grammar Boss — full N4 complete!', icon_emoji: '🎌' },
    { slug: 'streak-3', title: 'On a Roll', description: 'Reached a 3-day streak.', icon_emoji: '🔥' },
    { slug: 'streak-7', title: 'Week Warrior', description: 'Reached a 7-day streak.', icon_emoji: '⚡' },
    { slug: 'first-review', title: 'First Battle', description: 'Won your first review battle.', icon_emoji: '🛡️' },
    { slug: 'level-5', title: 'Rising Star', description: 'Reached level 5.', icon_emoji: '🌟' },
  ];
  for (const b of badges) await db.from('badges').upsert({ ...b, status: 'published' }, { onConflict: 'slug' });

  async function attachId(questId: string, badgeSlug: string) {
    const { data: badge } = await db.from('badges').select('id').eq('slug', badgeSlug).single();
    if (badge) await db.from('quests').update({ badge_id: badge.id }).eq('id', questId);
  }
  const { data: firstBadge } = await db.from('badges').select('id').eq('slug', 'first-steps').single();
  if (firstBadge) await db.from('quests').update({ badge_id: firstBadge.id }).eq('slug', firstQuestSlug);

  await attachId(bosses.hiragana, 'hiragana-hero');
  await attachId(bosses.katakana, 'katakana-conqueror');
  await attachId(bosses.selfIntro, 'self-intro-star');
  await attachId(bosses.numbers, 'number-ninja');
  await attachId(bosses.vocab, 'word-collector');
  await attachId(bosses.kanji, 'kanji-conqueror');
  await attachId(bosses.grammar, 'grammar-guru'); // the final N5 milestone
  await attachId(bosses.n4Vocab, 'n4-wordsmith');
  await attachId(bosses.n4Kanji, 'n4-kanji-master');
  await attachId(bosses.n4Grammar, 'n4-champion'); // the final N4 milestone
}

// ---------- generic vocab area (numbers, everyday words) ----------
async function seedVocabArea(
  courseId: string,
  cfg: { slug: string; title: string; subtitle: string; icon: string; color: string; sort: number; tag: string; jlpt?: number },
  themes: VocabTheme[],
  boss: { slug: string; title: string; xp: number },
) {
  const jlpt = cfg.jlpt ?? 5;
  const area = await insert<{ id: string }>('areas', {
    course_id: courseId, slug: cfg.slug, title: cfg.title, subtitle: cfg.subtitle,
    theme_icon: cfg.icon, theme_color: cfg.color, status: 'published', sort_order: cfg.sort,
  });

  let prev: string | null = null;
  let order = 0;
  const all: { jp: string; kana: string; en: string; id: string }[] = [];
  const allMeanings = themes.flatMap((t) => t.words.map((w) => w.en));

  for (const theme of themes) {
    const quest = await insert<{ id: string }>('quests', {
      area_id: area.id, slug: `${cfg.tag}-${theme.slug}`, title: theme.title, learning_goal: theme.goal,
      quest_type: 'main', xp_reward: 55, required_quest_id: prev,
      skills_trained: ['reading', 'listening'], status: 'published', sort_order: order++,
    });
    let s = 0;
    await step(quest.id, { step_type: 'explanation', title: theme.title, body_md: theme.goal + '. Tap 🔊 to hear each word.' }, s++);
    for (const w of theme.words) {
      const item = await insert<{ id: string }>('learning_items', {
        item_type: 'vocabulary', japanese_text: w.jp, kana_reading: w.kana, romaji: w.romaji,
        english_meaning: w.en, tts_text: w.kana, jlpt_level: w.jlpt ?? jlpt, difficulty: jlpt <= 4 ? 3 : 2,
        tags: ['seed', cfg.tag], status: 'published',
      });
      all.push({ jp: w.jp, kana: w.kana, en: w.en, id: item.id });
      await db.from('quest_items').insert({ quest_id: quest.id, item_id: item.id, sort_order: s });
      await step(quest.id, { step_type: 'example', japanese_text: w.jp, kana_reading: w.kana, romaji: w.romaji, english_meaning: w.en, tts_text: w.kana }, s++);
    }
    // Practice: meaning MC + listening + a couple of typed readings.
    for (const [i, w] of theme.words.slice(0, 4).entries()) {
      const mc = await multipleChoice(quest.id, { prompt: `What does ${w.jp} mean?`, japanese: w.jp, correct: w.en, distractors: pickDistractors(allMeanings, w.en), sort: i });
      await step(quest.id, { step_type: 'practice', activity_id: mc.id }, s++);
    }
    for (const [i, w] of theme.words.slice(0, 2).entries()) {
      const ty = await typingActivity(quest.id, { prompt: `Type the reading of ${w.jp}`, japanese: w.jp, correct: w.kana, accepted: [w.romaji], sort: 10 + i });
      await step(quest.id, { step_type: 'practice', activity_id: ty.id }, s++);
    }
    prev = quest.id;
  }

  // Boss: meaning MC across a sample.
  const bossQuest = await insert<{ id: string }>('quests', {
    area_id: area.id, slug: boss.slug, title: boss.title, learning_goal: 'Prove your new words',
    quest_type: 'boss', xp_reward: boss.xp, pass_threshold: 0.8, required_quest_id: prev,
    skills_trained: ['reading', 'listening'], status: 'published', sort_order: order,
  });
  const picks = shuffle(all).slice(0, 10);
  for (const [i, w] of picks.entries()) {
    await db.from('quest_items').insert({ quest_id: bossQuest.id, item_id: w.id, sort_order: i });
    const mc = await multipleChoice(bossQuest.id, { prompt: `What does ${w.jp} mean?`, japanese: w.jp, correct: w.en, distractors: pickDistractors(allMeanings, w.en), sort: i });
    await step(bossQuest.id, { step_type: 'practice', activity_id: mc.id }, i);
  }
  return { areaId: area.id, bossId: bossQuest.id };
}

// ---------- kanji area ----------
async function seedKanjiArea(
  courseId: string,
  sort: number,
  themes: KanjiTheme[],
  cfg: { slug: string; title: string; subtitle: string; icon: string; color: string; tag: string; jlpt: number; bossSlug: string; bossTitle: string; bossXp: number } = {
    slug: 'kanji-grove', title: 'Kanji Grove', subtitle: 'Your first ~80 kanji', icon: '🎋', color: 'rose',
    tag: 'kanji', jlpt: 5, bossSlug: 'kanji-boss', bossTitle: 'Kanji Boss', bossXp: 200,
  },
) {
  const area = await insert<{ id: string }>('areas', {
    course_id: courseId, slug: cfg.slug, title: cfg.title, subtitle: cfg.subtitle,
    theme_icon: cfg.icon, theme_color: cfg.color, status: 'published', sort_order: sort,
  });

  let prev: string | null = null;
  let order = 0;
  const all: { kanji: string; meaning: string; kana: string; romaji: string; id: string }[] = [];
  const allMeanings = themes.flatMap((t) => t.kanji.map((k) => k.meaning));

  for (const theme of themes) {
    const quest = await insert<{ id: string }>('quests', {
      area_id: area.id, slug: `${cfg.tag}-${theme.slug}`, title: theme.title, learning_goal: theme.goal,
      quest_type: 'main', xp_reward: 60, required_quest_id: prev,
      skills_trained: ['reading'], status: 'published', sort_order: order++,
    });
    let s = 0;
    await step(quest.id, { step_type: 'explanation', title: theme.title, body_md: theme.goal + '. Each card shows the meaning, readings and a memory hook.' }, s++);
    for (const k of theme.kanji) {
      const item = await insert<{ id: string }>('learning_items', {
        item_type: 'kanji', japanese_text: k.kanji, kana_reading: k.kana, romaji: k.romaji,
        english_meaning: k.meaning, tts_text: k.kana, onyomi: k.onyomi, kunyomi: k.kunyomi,
        stroke_count: k.strokes, radical: k.radical, mnemonic_md: k.mnemonic,
        jlpt_level: cfg.jlpt, difficulty: cfg.jlpt <= 4 ? 4 : 3, tags: ['seed', 'kanji', cfg.tag], status: 'published',
      });
      all.push({ kanji: k.kanji, meaning: k.meaning, kana: k.kana, romaji: k.romaji, id: item.id });
      await db.from('quest_items').insert({ quest_id: quest.id, item_id: item.id, sort_order: s });
      await step(quest.id, {
        step_type: 'example', title: k.kanji, japanese_text: k.kanji, kana_reading: k.kana, romaji: k.romaji,
        english_meaning: k.meaning, tts_text: k.kana, body_md: `**Meaning:** ${k.meaning}  \n**On:** ${k.onyomi || '—'} · **Kun:** ${k.kunyomi || '—'} · **Strokes:** ${k.strokes}  \n${k.mnemonic}`,
      }, s++);
    }
    for (const [i, k] of theme.kanji.slice(0, 5).entries()) {
      const mc = await multipleChoice(quest.id, { prompt: `What does ${k.kanji} mean?`, japanese: k.kanji, correct: k.meaning, distractors: pickDistractors(allMeanings, k.meaning), sort: i });
      await step(quest.id, { step_type: 'practice', activity_id: mc.id }, s++);
    }
    for (const [i, k] of theme.kanji.slice(0, 3).entries()) {
      const ty = await typingActivity(quest.id, { prompt: `Type a reading of ${k.kanji}`, japanese: k.kanji, correct: k.kana, accepted: [k.romaji], sort: 10 + i });
      await step(quest.id, { step_type: 'practice', activity_id: ty.id }, s++);
    }
    prev = quest.id;
  }

  const bossQuest = await insert<{ id: string }>('quests', {
    area_id: area.id, slug: cfg.bossSlug, title: cfg.bossTitle, learning_goal: 'Read kanji at a glance',
    quest_type: 'boss', xp_reward: cfg.bossXp, pass_threshold: 0.8, required_quest_id: prev,
    skills_trained: ['reading'], status: 'published', sort_order: order,
  });
  const picks = shuffle(all).slice(0, 12);
  for (const [i, k] of picks.entries()) {
    await db.from('quest_items').insert({ quest_id: bossQuest.id, item_id: k.id, sort_order: i });
    const mc = await multipleChoice(bossQuest.id, { prompt: `What does ${k.kanji} mean?`, japanese: k.kanji, correct: k.meaning, distractors: pickDistractors(allMeanings, k.meaning), sort: i });
    await step(bossQuest.id, { step_type: 'practice', activity_id: mc.id }, i);
  }
  return { areaId: area.id, bossId: bossQuest.id };
}

// ---------- grammar area ----------
async function seedGrammarArea(
  courseId: string,
  sort: number,
  points: GrammarPoint[],
  cfg: { slug: string; title: string; subtitle: string; icon: string; color: string; tag: string; jlpt: number; bossSlug: string; bossTitle: string; bossXp: number } = {
    slug: 'grammar-gate', title: 'Grammar Gate', subtitle: 'Particles & sentence patterns', icon: '⛩️', color: 'indigo',
    tag: 'grammar', jlpt: 5, bossSlug: 'grammar-boss', bossTitle: 'Grammar Boss', bossXp: 200,
  },
) {
  const area = await insert<{ id: string }>('areas', {
    course_id: courseId, slug: cfg.slug, title: cfg.title, subtitle: cfg.subtitle,
    theme_icon: cfg.icon, theme_color: cfg.color, status: 'published', sort_order: sort,
  });

  let prev: string | null = null;
  let order = 0;

  for (const p of points) {
    const quest = await insert<{ id: string }>('quests', {
      area_id: area.id, slug: `${cfg.tag}-${p.slug}`, title: p.title, learning_goal: p.goal,
      quest_type: 'main', xp_reward: 60, required_quest_id: prev,
      skills_trained: ['reading', 'writing'], status: 'published', sort_order: order++,
    });
    let s = 0;
    await step(quest.id, { step_type: 'explanation', title: p.title, body_md: p.explanation }, s++);
    for (const it of p.items) {
      const item = await insert<{ id: string }>('learning_items', {
        item_type: 'grammar', japanese_text: it.jp, kana_reading: it.kana, romaji: it.romaji,
        english_meaning: it.en, tts_text: it.kana, jlpt_level: cfg.jlpt, difficulty: cfg.jlpt <= 4 ? 3 : 2,
        tags: ['seed', 'grammar', cfg.tag], status: 'published',
      });
      await db.from('quest_items').insert({ quest_id: quest.id, item_id: item.id, sort_order: s });
    }
    if (p.example) {
      await step(quest.id, { step_type: 'example', japanese_text: p.example.jp, kana_reading: p.example.kana, romaji: p.example.romaji, english_meaning: p.example.en, tts_text: p.example.kana }, s++);
    }
    if (p.builder) {
      const sb = await sentenceBuilder(quest.id, { prompt: p.builder.prompt, tokens: p.builder.tokens, distractors: p.builder.distractors, sort: 0 });
      await step(quest.id, { step_type: 'practice', activity_id: sb.id }, s++);
    }
    if (p.quiz) {
      const mc = await multipleChoice(quest.id, { prompt: p.quiz.prompt, correct: p.quiz.correct, distractors: p.quiz.distractors, sort: 1 });
      await step(quest.id, { step_type: 'practice', activity_id: mc.id }, s++);
    }
    prev = quest.id;
  }

  // Grammar boss: a spread of builders + MC drawn from the points.
  const bossQuest = await insert<{ id: string }>('quests', {
    area_id: area.id, slug: cfg.bossSlug, title: cfg.bossTitle, learning_goal: 'Put the pieces together',
    quest_type: 'boss', xp_reward: cfg.bossXp, pass_threshold: 0.8, required_quest_id: prev,
    skills_trained: ['reading', 'writing'], status: 'published', sort_order: order,
  });
  let bs = 0;
  for (const p of points.filter((x) => x.builder).slice(0, 6)) {
    const sb = await sentenceBuilder(bossQuest.id, { prompt: p.builder!.prompt, tokens: p.builder!.tokens, distractors: p.builder!.distractors, sort: bs });
    await step(bossQuest.id, { step_type: 'practice', activity_id: sb.id }, bs++);
  }
  for (const p of points.filter((x) => x.quiz).slice(0, 4)) {
    const mc = await multipleChoice(bossQuest.id, { prompt: p.quiz!.prompt, correct: p.quiz!.correct, distractors: p.quiz!.distractors, sort: bs });
    await step(bossQuest.id, { step_type: 'practice', activity_id: mc.id }, bs++);
  }
  return { areaId: area.id, bossId: bossQuest.id };
}

// ---------- main ----------
async function main() {
  await wipe();

  // ===== Course 1: JLPT N5 =====
  const n5 = await insert<{ id: string }>('courses', {
    slug: 'jlpt-n5', title: 'JLPT N5 — Zero to Beginner',
    description: 'Start from absolute zero: kana, first words, ~80 kanji and core grammar.',
    status: 'published', sort_order: 0, jlpt_level: 5, required_course_id: null,
  });
  console.log('• Course: JLPT N5 created');

  const { firstQuestSlug } = await seedStartVillage(n5.id);
  console.log('• Start Village seeded');

  const hira = await seedKanaRows(n5.id, { slug: 'hiragana-forest', title: 'Hiragana Forest', subtitle: 'Master all 46 hiragana', icon: '🌲', color: 'emerald', sort: 1, tag: 'hiragana', rows: HIRAGANA_ROWS });
  const hiraBoss = await kanaBoss(hira.areaId, hira.allChars, { slug: 'hiragana-boss', title: 'Hiragana Boss', xp: 150, requiredQuestId: hira.prevQuestId, sortOrder: hira.sortNext });
  console.log(`• Hiragana Forest seeded (${hira.allChars.length} kana)`);

  const kata = await seedKanaRows(n5.id, { slug: 'katakana-gate', title: 'Katakana Gate', subtitle: 'Read foreign words', icon: '🏯', color: 'violet', sort: 2, tag: 'katakana', rows: KATAKANA_ROWS });
  const foreignQuestId = await seedForeignWords(kata.areaId, kata.prevQuestId, kata.sortNext);
  const kataBoss = await kanaBoss(kata.areaId, kata.allChars, { slug: 'katakana-boss', title: 'Katakana Boss', xp: 150, requiredQuestId: foreignQuestId, sortOrder: kata.sortNext + 1 });
  console.log(`• Katakana Gate seeded (${kata.allChars.length} kana + loan words)`);

  const conv = await seedFirstConversation(n5.id);
  console.log('• First Conversation seeded');

  const numbers = await seedVocabArea(
    n5.id,
    { slug: 'numbers-time', title: 'Numbers & Time', subtitle: 'Count, tell time, name the days', icon: '🕐', color: 'amber', sort: 4, tag: 'numbers' },
    NUMBER_THEMES,
    { slug: 'numbers-boss', title: 'Numbers Boss', xp: 150 },
  );
  console.log('• Numbers & Time seeded');

  const vocab = await seedVocabArea(
    n5.id,
    { slug: 'everyday-words', title: 'Everyday Words', subtitle: 'Core N5 vocabulary', icon: '🏘️', color: 'teal', sort: 5, tag: 'vocab' },
    VOCAB_THEMES,
    { slug: 'vocab-boss', title: 'Vocabulary Boss', xp: 200 },
  );
  console.log('• Everyday Words seeded');

  const kanji = await seedKanjiArea(n5.id, 6, KANJI_THEMES);
  console.log('• Kanji Grove seeded');

  const grammar = await seedGrammarArea(n5.id, 7, GRAMMAR_POINTS);
  console.log('• Grammar Gate seeded — N5 course complete');

  // ===== Course 2: JLPT N4 (unlocked once N5 is cleared) =====
  const n4 = await insert<{ id: string }>('courses', {
    slug: 'jlpt-n4', title: 'JLPT N4 — Beginner to Elementary',
    description: '~140 more kanji, ~180 words, and the grammar backbone: て-form, conditionals, passive, causative and keigo.',
    status: 'published', sort_order: 1, jlpt_level: 4, required_course_id: n5.id,
  });
  console.log('• Course: JLPT N4 created');

  const n4Vocab = await seedVocabArea(
    n4.id,
    { slug: 'n4-words', title: 'N4 Words', subtitle: 'Vocabulary for real conversations', icon: '🗂️', color: 'cyan', sort: 0, tag: 'n4-vocab', jlpt: 4 },
    N4_VOCAB_THEMES,
    { slug: 'n4-vocab-boss', title: 'N4 Vocabulary Boss', xp: 250 },
  );
  console.log('• N4 Words seeded');

  const n4Kanji = await seedKanjiArea(n4.id, 1, N4_KANJI_THEMES, {
    slug: 'n4-kanji-forest', title: 'N4 Kanji Forest', subtitle: '~140 more kanji', icon: '🌳', color: 'lime',
    tag: 'n4-kanji', jlpt: 4, bossSlug: 'n4-kanji-boss', bossTitle: 'N4 Kanji Boss', bossXp: 300,
  });
  console.log('• N4 Kanji Forest seeded');

  const n4Grammar = await seedGrammarArea(n4.id, 2, N4_GRAMMAR_POINTS, {
    slug: 'n4-grammar-temple', title: 'N4 Grammar Temple', subtitle: 'て-form, conditionals, passive & keigo', icon: '🏯', color: 'orange',
    tag: 'n4-grammar', jlpt: 4, bossSlug: 'n4-grammar-boss', bossTitle: 'N4 Grammar Boss', bossXp: 300,
  });
  console.log('• N4 Grammar Temple seeded — N4 course complete');

  await seedBadges(
    {
      hiragana: hiraBoss, katakana: kataBoss, selfIntro: conv.bossId, numbers: numbers.bossId,
      vocab: vocab.bossId, kanji: kanji.bossId, grammar: grammar.bossId,
      n4Vocab: n4Vocab.bossId, n4Kanji: n4Kanji.bossId, n4Grammar: n4Grammar.bossId,
    },
    firstQuestSlug,
  );
  console.log('• badges seeded');

  console.log('\n✅ Seed complete — JLPT N5 & N4 as separate courses. Sign in and head to the Roadmap!');
}

main().catch((e) => {
  console.error('\n❌ Seed failed:', e.message);
  process.exit(1);
});
