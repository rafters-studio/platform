// Words a color label may not contain, matched case-insensitively against the
// label's words. Hyphens and spaces both separate words, so "Skin-Tone" is
// caught, and a hyphenated or multi-word term ("coca-cola") matches the same
// words in sequence. Plain color words (black, white, brown, tan) are allowed:
// they are the anchor most labels need.
export const BANNED_LABEL_TERMS: readonly string[] = [
  // peoples, nationalities, ethnicities
  "african",
  "american",
  "arab",
  "asian",
  "aboriginal",
  "caucasian",
  "chinese",
  "eskimo",
  "ethnic",
  "european",
  "french",
  "german",
  "gypsy",
  "hispanic",
  "indian",
  "indigenous",
  "irish",
  "israeli",
  "italian",
  "japanese",
  "jewish",
  "korean",
  "latino",
  "mexican",
  "native",
  "negro",
  "oriental",
  "pakistani",
  "persian",
  "race",
  "racial",
  "russian",
  "tribal",
  // skin
  "skin",
  "flesh",
  "complexion",
  "nude",
  // violence
  "assault",
  "blood",
  "bloody",
  "bruise",
  "bruised",
  "bomb",
  "bullet",
  "corpse",
  "death",
  "dead",
  "gun",
  "gore",
  "kill",
  "murder",
  "rifle",
  "shoot",
  "stab",
  "torture",
  "war",
  "weapon",
  "wound",
  // slurs
  "chink",
  "coon",
  "dyke",
  "fag",
  "faggot",
  "gook",
  "kike",
  "nigger",
  "nigga",
  "retard",
  "spic",
  "tranny",
  "wetback",
  // sexual terms
  "anal",
  "breast",
  "erotic",
  "fetish",
  "lust",
  "nipple",
  "orgasm",
  "penis",
  "porn",
  "sex",
  "sexy",
  "vagina",
  // disasters and tragedies
  "apocalypse",
  "attack",
  "catastrophe",
  "chernobyl",
  "disaster",
  "earthquake",
  "famine",
  "flood",
  "genocide",
  "hiroshima",
  "holocaust",
  "hurricane",
  "massacre",
  "pandemic",
  "september",
  "tragedy",
  "tsunami",
  // brands and trademarks
  "adidas",
  "barbie",
  "coca-cola",
  "coke",
  "disney",
  "facebook",
  "ferrari",
  "google",
  "hermes",
  "ikea",
  "instagram",
  "lego",
  "microsoft",
  "nike",
  "pantone",
  "pepsi",
  "sherwin",
  "starbucks",
  "tiffany",
  "twitter",
  // bodily terms
  "bile",
  "bowel",
  "feces",
  "mucus",
  "pee",
  "phlegm",
  "pus",
  "puke",
  "scab",
  "snot",
  "sweat",
  "urine",
  "vomit",
];

function toWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

const BANNED_TERM_WORDS: readonly (readonly string[])[] = BANNED_LABEL_TERMS.map(toWords);

// Returns the banned term a label contains, or null when it is clean.
export function bannedTermIn(label: string): string | null {
  const words = toWords(label);
  for (const term of BANNED_TERM_WORDS) {
    for (let i = 0; i + term.length <= words.length; i++) {
      if (term.every((w, j) => words[i + j] === w)) return term.join(" ");
    }
  }
  return null;
}
