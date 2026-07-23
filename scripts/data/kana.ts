import type { KanaRow } from './types';

/** Complete hiragana: base 46 + dakuten/handakuten + yōon combinations. */
export const HIRAGANA_ROWS: KanaRow[] = [
  // --- base ---
  { slug: 'vowels', title: 'Vowels あいうえお', chars: [['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o']] },
  { slug: 'k', title: 'K-row かきくけこ', chars: [['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko']] },
  { slug: 's', title: 'S-row さしすせそ', chars: [['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so']] },
  { slug: 't', title: 'T-row たちつてと', chars: [['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to']] },
  { slug: 'n', title: 'N-row なにぬねの', chars: [['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no']] },
  { slug: 'h', title: 'H-row はひふへほ', chars: [['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho']] },
  { slug: 'm', title: 'M-row まみむめも', chars: [['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo']] },
  { slug: 'y', title: 'Y-row やゆよ', chars: [['や', 'ya'], ['ゆ', 'yu'], ['よ', 'yo']] },
  { slug: 'r', title: 'R-row らりるれろ', chars: [['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro']] },
  { slug: 'w', title: 'W-row & ん', chars: [['わ', 'wa'], ['を', 'wo'], ['ん', 'n']] },
  // --- dakuten / handakuten ---
  { slug: 'g', title: 'G-row がぎぐげご', chars: [['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'], ['ご', 'go']] },
  { slug: 'z', title: 'Z-row ざじずぜぞ', chars: [['ざ', 'za'], ['じ', 'ji'], ['ず', 'zu'], ['ぜ', 'ze'], ['ぞ', 'zo']] },
  { slug: 'd', title: 'D-row だぢづでど', chars: [['だ', 'da'], ['ぢ', 'ji'], ['づ', 'zu'], ['で', 'de'], ['ど', 'do']] },
  { slug: 'b', title: 'B-row ばびぶべぼ', chars: [['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'], ['ぼ', 'bo']] },
  { slug: 'p', title: 'P-row ぱぴぷぺぽ', chars: [['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'], ['ぽ', 'po']] },
  // --- yōon combinations ---
  {
    slug: 'combo-1',
    title: 'Combos きゃ〜りょ',
    chars: [
      ['きゃ', 'kya'], ['きゅ', 'kyu'], ['きょ', 'kyo'],
      ['しゃ', 'sha'], ['しゅ', 'shu'], ['しょ', 'sho'],
      ['ちゃ', 'cha'], ['ちゅ', 'chu'], ['ちょ', 'cho'],
      ['にゃ', 'nya'], ['にゅ', 'nyu'], ['にょ', 'nyo'],
      ['ひゃ', 'hya'], ['ひゅ', 'hyu'], ['ひょ', 'hyo'],
      ['みゃ', 'mya'], ['みゅ', 'myu'], ['みょ', 'myo'],
      ['りゃ', 'rya'], ['りゅ', 'ryu'], ['りょ', 'ryo'],
    ],
  },
  {
    slug: 'combo-2',
    title: 'Voiced combos ぎゃ〜ぴょ',
    chars: [
      ['ぎゃ', 'gya'], ['ぎゅ', 'gyu'], ['ぎょ', 'gyo'],
      ['じゃ', 'ja'], ['じゅ', 'ju'], ['じょ', 'jo'],
      ['びゃ', 'bya'], ['びゅ', 'byu'], ['びょ', 'byo'],
      ['ぴゃ', 'pya'], ['ぴゅ', 'pyu'], ['ぴょ', 'pyo'],
    ],
  },
];

/** Complete katakana: base 46 + dakuten/handakuten + yōon combinations. */
export const KATAKANA_ROWS: KanaRow[] = [
  { slug: 'vowels', title: 'Vowels アイウエオ', chars: [['ア', 'a'], ['イ', 'i'], ['ウ', 'u'], ['エ', 'e'], ['オ', 'o']] },
  { slug: 'k', title: 'K-row カキクケコ', chars: [['カ', 'ka'], ['キ', 'ki'], ['ク', 'ku'], ['ケ', 'ke'], ['コ', 'ko']] },
  { slug: 's', title: 'S-row サシスセソ', chars: [['サ', 'sa'], ['シ', 'shi'], ['ス', 'su'], ['セ', 'se'], ['ソ', 'so']] },
  { slug: 't', title: 'T-row タチツテト', chars: [['タ', 'ta'], ['チ', 'chi'], ['ツ', 'tsu'], ['テ', 'te'], ['ト', 'to']] },
  { slug: 'n', title: 'N-row ナニヌネノ', chars: [['ナ', 'na'], ['ニ', 'ni'], ['ヌ', 'nu'], ['ネ', 'ne'], ['ノ', 'no']] },
  { slug: 'h', title: 'H-row ハヒフヘホ', chars: [['ハ', 'ha'], ['ヒ', 'hi'], ['フ', 'fu'], ['ヘ', 'he'], ['ホ', 'ho']] },
  { slug: 'm', title: 'M-row マミムメモ', chars: [['マ', 'ma'], ['ミ', 'mi'], ['ム', 'mu'], ['メ', 'me'], ['モ', 'mo']] },
  { slug: 'yrw', title: 'Y/R/W rows', chars: [['ヤ', 'ya'], ['ユ', 'yu'], ['ヨ', 'yo'], ['ラ', 'ra'], ['リ', 'ri'], ['ル', 'ru'], ['レ', 're'], ['ロ', 'ro'], ['ワ', 'wa'], ['ヲ', 'wo'], ['ン', 'n']] },
  { slug: 'g', title: 'G-row ガギグゲゴ', chars: [['ガ', 'ga'], ['ギ', 'gi'], ['グ', 'gu'], ['ゲ', 'ge'], ['ゴ', 'go']] },
  { slug: 'z', title: 'Z-row ザジズゼゾ', chars: [['ザ', 'za'], ['ジ', 'ji'], ['ズ', 'zu'], ['ゼ', 'ze'], ['ゾ', 'zo']] },
  { slug: 'd', title: 'D-row ダヂヅデド', chars: [['ダ', 'da'], ['ヂ', 'ji'], ['ヅ', 'zu'], ['デ', 'de'], ['ド', 'do']] },
  { slug: 'b', title: 'B-row バビブベボ', chars: [['バ', 'ba'], ['ビ', 'bi'], ['ブ', 'bu'], ['ベ', 'be'], ['ボ', 'bo']] },
  { slug: 'p', title: 'P-row パピプペポ', chars: [['パ', 'pa'], ['ピ', 'pi'], ['プ', 'pu'], ['ペ', 'pe'], ['ポ', 'po']] },
  {
    slug: 'combo-1',
    title: 'Combos キャ〜リョ',
    chars: [
      ['キャ', 'kya'], ['キュ', 'kyu'], ['キョ', 'kyo'],
      ['シャ', 'sha'], ['シュ', 'shu'], ['ショ', 'sho'],
      ['チャ', 'cha'], ['チュ', 'chu'], ['チョ', 'cho'],
      ['ニャ', 'nya'], ['ニュ', 'nyu'], ['ニョ', 'nyo'],
      ['ヒャ', 'hya'], ['ヒュ', 'hyu'], ['ヒョ', 'hyo'],
      ['ミャ', 'mya'], ['ミュ', 'myu'], ['ミョ', 'myo'],
      ['リャ', 'rya'], ['リュ', 'ryu'], ['リョ', 'ryo'],
    ],
  },
  {
    slug: 'combo-2',
    title: 'Voiced combos ギャ〜ピョ',
    chars: [
      ['ギャ', 'gya'], ['ギュ', 'gyu'], ['ギョ', 'gyo'],
      ['ジャ', 'ja'], ['ジュ', 'ju'], ['ジョ', 'jo'],
      ['ビャ', 'bya'], ['ビュ', 'byu'], ['ビョ', 'byo'],
      ['ピャ', 'pya'], ['ピュ', 'pyu'], ['ピョ', 'pyo'],
    ],
  },
];
