/** Shared content-data types for the seed. Keeping the (large) datasets in
 * typed modules keeps scripts/seed.ts focused on generation logic. */

/** A kana character: [glyph, romaji]. */
export type KanaChar = [string, string];
export type KanaRow = { slug: string; title: string; chars: KanaChar[] };

/** A vocabulary / phrase entry. */
export type Vocab = {
  jp: string; // surface form (may include kanji)
  kana: string; // reading in kana (also used as TTS)
  romaji: string;
  en: string;
  jlpt?: number;
};
export type VocabTheme = {
  slug: string;
  title: string;
  goal: string;
  words: Vocab[];
};

/** A kanji entry with the rich fields the schema supports. */
export type Kanji = {
  kanji: string;
  meaning: string; // primary English meaning(s)
  kana: string; // a common reading, used for TTS
  romaji: string;
  onyomi: string; // katakana on-readings (comma separated)
  kunyomi: string; // hiragana kun-readings
  strokes: number;
  radical: string;
  mnemonic: string;
};
export type KanjiTheme = {
  slug: string;
  title: string;
  goal: string;
  kanji: Kanji[];
};

/** A grammar point: a short explanation, the items it introduces, and an
 * optional sentence-builder drill. */
export type GrammarPoint = {
  slug: string;
  title: string;
  goal: string;
  explanation: string; // markdown
  items: Vocab[]; // particles / words this point teaches (become learning_items)
  example?: { jp: string; kana: string; romaji: string; en: string };
  builder?: { prompt: string; tokens: string[]; distractors: string[] };
  quiz?: { prompt: string; correct: string; distractors: string[] };
};
