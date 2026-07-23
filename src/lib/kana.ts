/**
 * Kana/romaji normalization for answer grading. Pure, unit-tested.
 *
 * The goal is lenient comparison: a learner typing "shi", "si", or "し" should
 * all match a target of "し". We convert everything to a canonical hiragana
 * form, then compare.
 */

// Katakana → hiragana (shift the Unicode block).
export function katakanaToHiragana(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    // Katakana 0x30A1–0x30F6 → hiragana 0x3041–0x3096
    if (code >= 0x30a1 && code <= 0x30f6) {
      out += String.fromCodePoint(code - 0x60);
    } else if (ch === 'ー') {
      out += 'ー'; // long-vowel mark handled later
    } else {
      out += ch;
    }
  }
  return out;
}

// Longest-first romaji → hiragana syllable map.
const ROMAJI_MAP: Record<string, string> = {
  // digraphs with y
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ', sya: 'しゃ', syu: 'しゅ', syo: 'しょ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ', zya: 'じゃ', zyu: 'じゅ', zyo: 'じょ',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  // special consonant readings
  shi: 'し', si: 'し', chi: 'ち', ti: 'ち', tsu: 'つ', tu: 'つ', fu: 'ふ', hu: 'ふ', ji: 'じ', zi: 'じ',
  // k
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  // s
  sa: 'さ', su: 'す', se: 'せ', so: 'そ',
  za: 'ざ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  // t
  ta: 'た', te: 'て', to: 'と',
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  // n
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  // h
  ha: 'は', hi: 'ひ', he: 'へ', ho: 'ほ',
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  // m
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  // y
  ya: 'や', yu: 'ゆ', yo: 'よ',
  // r
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  // w
  wa: 'わ', wo: 'を', we: 'うぇ', wi: 'うぃ',
  // vowels
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
};

const MAX_KEY = 3;

/** Replace macrons with a doubled/long-vowel romaji form before conversion. */
function expandMacrons(s: string): string {
  return s
    .replace(/ā/g, 'aa')
    .replace(/ī/g, 'ii')
    .replace(/ū/g, 'uu')
    .replace(/ē/g, 'ee')
    .replace(/ō/g, 'ou');
}

/**
 * Convert a romaji string to hiragana. Unknown characters pass through. Handles
 * っ (double consonant), ん (n / n'), and long vowels via doubling.
 */
export function romajiToHiragana(input: string): string {
  let s = expandMacrons(input.toLowerCase());
  // Long-vowel katakana mark → repeat previous vowel is handled at compare time;
  // here we just drop stray marks.
  let out = '';
  let i = 0;

  while (i < s.length) {
    const c = s[i];

    // ん: standalone n not starting a syllable, or explicit n'
    if (c === 'n') {
      const next = s[i + 1];
      if (next === "'" || next === undefined) {
        out += 'ん';
        i += next === "'" ? 2 : 1;
        continue;
      }
      // "n" followed by a non-vowel, non-y consonant → ん
      if (!'aiueoy'.includes(next)) {
        out += 'ん';
        i += 1;
        continue;
      }
    }

    // Small tsu: doubled consonant (kk, tt, ss, pp, …), but not "nn"
    if (
      c !== 'n' &&
      !'aiueo'.includes(c) &&
      s[i + 1] === c
    ) {
      out += 'っ';
      i += 1;
      continue;
    }

    // Greedy longest match against the syllable map.
    let matched = false;
    for (let len = MAX_KEY; len >= 1; len--) {
      const chunk = s.slice(i, i + len);
      if (ROMAJI_MAP[chunk]) {
        out += ROMAJI_MAP[chunk];
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += c;
      i += 1;
    }
  }
  return out;
}

// Map every hiragana to its trailing vowel (for long-vowel handling).
const VOWEL_OF: Record<string, string> = {};
{
  const rows: [string, string][] = [
    ['ぁあかさたなはまやらわがざだばぱゃ', 'あ'],
    ['ぃいきしちにひみりぎじぢびぴ', 'い'],
    ['ぅうくすつぬふむゆるぐずづぶぷゅ', 'う'],
    ['ぇえけせてねへめれげぜでべぺ', 'え'],
    ['ぉおこそとのほもよろをごぞどぼぽょ', 'お'],
  ];
  for (const [chars, v] of rows) for (const ch of chars) VOWEL_OF[ch] = v;
}

/** Resolve the long-vowel mark ー by repeating the preceding vowel sound. */
function resolveChoonpu(hira: string): string {
  let out = '';
  for (const ch of hira) {
    if (ch === 'ー') {
      const prev = out[out.length - 1];
      out += VOWEL_OF[prev] ?? '';
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Canonicalize long "o": a う following an お-row kana represents a long o and is
 * folded to お, so おう/おお/ō/oo all compare equal. (Acceptable over-merge for
 * lenient grading.)
 */
function foldLongO(hira: string): string {
  let out = '';
  for (const ch of hira) {
    if (ch === 'う' && VOWEL_OF[out[out.length - 1]] === 'お') out += 'お';
    else out += ch;
  }
  return out;
}

/**
 * Canonicalize any answer (kana or romaji) to a comparable hiragana string:
 * trim, NFKC, lowercase, strip whitespace/punctuation, katakana→hiragana,
 * romaji→hiragana, and resolve long-vowel marks.
 */
export function normalizeAnswer(input: string): string {
  let s = (input ?? '').normalize('NFKC').trim().toLowerCase();
  s = s.replace(/[\s.,!?、。！？]/g, '');
  s = katakanaToHiragana(s);
  // If the string still contains latin letters, treat it as romaji.
  if (/[a-z]/.test(s)) s = romajiToHiragana(s);
  s = resolveChoonpu(s);
  s = foldLongO(s);
  return s;
}

/** Levenshtein distance (for "almost!" hinting). */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}
