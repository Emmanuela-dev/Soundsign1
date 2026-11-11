// ─────────────────────────────────────────────────────────────────────────────
// videoUtils.js — Word-to-sign resolver
//
// Design principles:
//  1. NEVER drop a spoken word — if no word-sign exists, fingerspell it.
//     This eliminates every avatar pause caused by unknown vocabulary.
//  2. STOP_WORDS is minimal (only "a", "an", "the") — everything else either
//     maps to a sign or gets fingerspelled.
//  3. SYNONYM_MAP is loaded from /public/synonyms.json — the single source of
//     truth shared with the backend. Do NOT add entries to the inline object
//     below; edit synonyms.json instead so both sides stay in sync.
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Known word database ────────────────────────────────────────────────────
// Exact lowercase keys matching /public/videos/words/<Title Case>.mp4
export const KNOWN_WORDS = new Set([
  "after","again","against","age","all","alone","also","and","ask","at",
  "be","beautiful","before","best","better","busy","but","bye","can",
  "cannot","change","college","come","computer","day","distance","do",
  "do not","does not","eat","engineer","fight","finish","from","glitter",
  "go","god","gold","good","great","hand","hands","happy","hello","help",
  "her","here","his","home","homepage","how","invent","it","keep",
  "language","laugh","learn","me","more","my","name","next","not","now",
  "of","on","our","out","pretty","right","sad","safe","see","self",
  "sign","sing","so","sound","stay","study","talk","television",
  "thank you","thank","that","they","this","those","time","to","type",
  "us","walk","wash","way","we","welcome","what","when","where","which",
  "who","whole","whose","why","will","with","without","words","work",
  "world","wrong","you","your","yourself",
]);

// ── 2. Stop-words (MINIMAL — only pure articles with zero sign value) ─────────
// Everything else maps to a sign or gets fingerspelled — no silent drops.
const STOP_WORDS = new Set(["a", "an", "the"]);

// ── 3. Pronoun / core function-word map ───────────────────────────────────────
const PRONOUN_MAP = {
  i:"me", my:"my", your:"your", you:"you",
  his:"his", her:"her", our:"our", their:"they",
  we:"we", us:"us", it:"it",
  he:"his", she:"her", them:"they",
};

// ── 4. Contraction expansion ──────────────────────────────────────────────────
const CONTRACTIONS = {
  "don't":"do not","dont":"do not",
  "doesn't":"does not","doesnt":"does not",
  "can't":"cannot","cant":"cannot",
  "won't":"will not","wont":"will not",
  "isn't":"not","isnt":"not",
  "aren't":"not","arent":"not",
  "wasn't":"not","wasnt":"not",
  "weren't":"not","werent":"not",
  "i'm":"me","im":"me",
  "you're":"you","youre":"you",
  "he's":"his","hes":"his",
  "she's":"her","shes":"her",
  "it's":"it","its":"it",
  "we're":"we","were":"we",
  "they're":"they","theyre":"they",
  "that's":"that","thats":"that",
  "what's":"what","whats":"what",
  "where's":"where","wheres":"where",
  "who's":"who","whos":"who",
  "how's":"how","hows":"how",
  "let's":"us","lets":"us",
  "thanks":"thank you","thankyou":"thank you",
  "bye-bye":"bye","byebye":"bye",
  "hi":"hello","hey":"hello","greetings":"hello",
  "will not":"not","won't":"not",
  "have not":"not","haven't":"not","havent":"not",
  "has not":"not","hasn't":"not","hasnt":"not",
  "had not":"not","hadn't":"not","hadnt":"not",
  "could not":"not","couldn't":"not","couldnt":"not",
  "should not":"not","shouldn't":"not","shouldnt":"not",
  "would not":"not","wouldn't":"not","wouldnt":"not",
  "must not":"not","mustn't":"not","mustnt":"not",
  "need not":"not","needn't":"not","neednt":"not",
};

// ── 5. SYNONYM_MAP — loaded from /public/synonyms.json (single source of truth)
// ─────────────────────────────────────────────────────────────────────────────
// The canonical mappings live in /public/synonyms.json, which is also read by
// the Python backend, so both sides always agree.
//
// We start with a built-in snapshot so resolution works synchronously from the
// very first frame (before the async fetch resolves). The fetch then merges any
// additions from the JSON on top. To add or change a mapping, edit synonyms.json
// only — do NOT add entries to the object below.
// ─────────────────────────────────────────────────────────────────────────────
export let SYNONYM_MAP = {

  // ── Greetings ──────────────────────────────────────────────────────────────
  hi:"hello", hey:"hello", greetings:"hello", howdy:"hello",
  "good morning":"hello", "good afternoon":"hello", "good evening":"hello",
  morning:"hello", afternoon:"hello", evening:"hello",
  goodbye:"bye", farewell:"bye", "see you":"bye", ciao:"bye",
  "take care":"bye", later:"bye",
  thanks:"thank you", thankyou:"thank you", ty:"thank you",
  cheers:"thank you", grateful:"thank you",

  // ── People / pronouns ──────────────────────────────────────────────────────
  myself:"me", himself:"his", herself:"her", itself:"it",
  themselves:"they", ourselves:"our",
  everyone:"they", everybody:"they", someone:"they", somebody:"they",
  anyone:"they", anybody:"they", nobody:"not",
  people:"they", person:"name", man:"name", woman:"name",
  boy:"name", girl:"name", child:"name", children:"they",
  family:"home", friend:"name", friends:"they",

  // ── Places ────────────────────────────────────────────────────────────────
  house:"home", apartment:"home", room:"home", office:"work",
  school:"college", university:"college", campus:"college",
  city:"world", town:"world", country:"world", nation:"world",
  street:"way", road:"way", path:"way",
  store:"home", shop:"home", market:"home", bank:"home",
  hospital:"home", church:"home", library:"college",
  park:"out", outside:"out", inside:"home",
  here:"here", there:"way", everywhere:"world",

  // ── Time ──────────────────────────────────────────────────────────────────
  today:"now", tonight:"now", now:"now", currently:"now",
  soon:"next", immediately:"now", instantly:"now",
  yesterday:"before", last:"before", previous:"before", prior:"before",
  tomorrow:"next", later:"next", soon:"next", upcoming:"next",
  always:"will", never:"not", sometimes:"now", often:"more",
  hour:"time", minute:"time", second:"time", moment:"time",
  daily:"day", weekly:"day", monthly:"time", yearly:"time",
  morning:"day", afternoon:"day", evening:"time", night:"time",
  clock:"time", calendar:"time", schedule:"time",
  early:"before", late:"after", midnight:"now",

  // ── Verbs — communication ─────────────────────────────────────────────────
  speak:"talk", speaking:"talk", spoke:"talk", spoken:"talk",
  says:"talk", said:"talk", saying:"talk", say:"talk",
  tell:"talk", tells:"talk", told:"talk", telling:"talk",
  ask:"ask", asks:"ask", asked:"ask", asking:"ask",
  answer:"talk", respond:"talk", reply:"talk",
  chat:"talk", chatting:"talk", converse:"talk",
  announce:"talk", report:"talk", present:"talk",
  discuss:"talk", explain:"talk", describe:"talk",
  read:"see", reads:"see", reading:"see",
  write:"type", writes:"type", writing:"type", wrote:"type",
  text:"type", message:"talk", email:"type", call:"talk",
  shout:"talk", whisper:"talk", scream:"talk",
  broadcast:"talk", declare:"talk", state:"talk",

  // ── Verbs — movement ──────────────────────────────────────────────────────
  go:"go", goes:"go", going:"go", went:"go", gone:"go",
  come:"come", comes:"come", coming:"come", came:"come",
  move:"go", moving:"go", moved:"go",
  leave:"go", leaves:"go", leaving:"go", left:"go",
  run:"walk", running:"walk", ran:"walk",
  walk:"walk", walks:"walk", walking:"walk", walked:"walk",
  drive:"go", driving:"go", drove:"go",
  travel:"go", travels:"go", travelling:"go", travelled:"go",
  return:"come", returns:"come", returning:"come", returned:"come",
  arrive:"come", arrives:"come", arriving:"come", arrived:"come",
  enter:"come", exit:"go", depart:"go",
  bring:"come", take:"go", carry:"go",
  follow:"go", lead:"go", pass:"go",

  // ── Verbs — thinking / knowing ───────────────────────────────────────────
  know:"see", knows:"see", knowing:"see", knew:"see", known:"see",
  think:"see", thought:"see", thinking:"see",
  believe:"see", feel:"see", understand:"see",
  remember:"see", forgot:"see", forget:"see",
  imagine:"see", consider:"see", decide:"see",
  learn:"learn", teach:"learn", study:"study",
  realize:"see", notice:"see", discover:"see",
  wonder:"see", guess:"see", hope:"good",
  wish:"good", want:"go", need:"go",
  expect:"see", find:"see", check:"see",

  // ── Verbs — actions ───────────────────────────────────────────────────────
  do:"do", does:"do", doing:"do", did:"do",
  make:"invent", makes:"invent", making:"invent", made:"invent",
  create:"invent", creates:"invent", creating:"invent", created:"invent",
  build:"invent", builds:"invent", building:"invent", built:"invent",
  develop:"invent", develops:"invent", developing:"invent",
  design:"invent", designs:"invent", designing:"invent",
  start:"go", begin:"go", begins:"go", began:"go",
  finish:"finish", end:"finish", stop:"finish", complete:"finish",
  continue:"go", keep:"keep", keeps:"keep",
  help:"help", helps:"help", helping:"help", helped:"help",
  assist:"help", support:"help", save:"safe",
  use:"do", uses:"do", using:"do", used:"do",
  get:"go", gets:"go", getting:"go", got:"go",
  give:"help", gives:"help", giving:"help", gave:"help",
  show:"see", shows:"see", showing:"see", showed:"see",
  open:"go", close:"finish", start:"go",
  play:"sing", playing:"sing", played:"sing",
  win:"great", won:"great", beat:"great",
  lose:"sad", lost:"sad",
  buy:"go", sell:"go", pay:"go",
  put:"go", set:"go", place:"home",
  try:"go", tried:"go", attempt:"go",
  fail:"wrong", failed:"wrong", wrong:"wrong",
  change:"change", changes:"change", changing:"change", changed:"change",
  add:"more", added:"more", increase:"more",
  remove:"out", delete:"finish", clear:"finish",
  fix:"change", repair:"change", update:"change",
  test:"see", check:"see", verify:"see",
  share:"help", send:"go", receive:"come",
  join:"come", meet:"come", gather:"come",
  wait:"stay", waiting:"stay", stayed:"stay",
  rest:"stay", sit:"stay", stand:"go",
  happen:"go", occur:"go", appear:"come",

  // ── Verbs — senses / body ─────────────────────────────────────────────────
  see:"see", seen:"see", saw:"see", sees:"see", seeing:"see",
  look:"see", looks:"see", looking:"see", watch:"see",
  hear:"sound", heard:"sound", hearing:"sound", listen:"sound",
  smell:"see", taste:"eat", touch:"hand", feel:"see",
  eat:"eat", eats:"eat", eating:"eat", ate:"eat", eaten:"eat",
  drink:"eat", drank:"eat", drinking:"eat",
  sleep:"stay", wake:"go", rest:"stay",
  walk:"walk", run:"walk", jump:"go", dance:"sing",
  sing:"sing", laugh:"laugh", cry:"sad", smile:"happy",
  hurt:"sad", pain:"sad",

  // ── Verbs — work / creation ───────────────────────────────────────────────
  work:"work", works:"work", working:"work", worked:"work",
  job:"work", task:"work", project:"work",
  type:"type", typing:"type", typed:"type",
  code:"type", coding:"type", program:"type", programming:"type",
  compute:"computer", computing:"computer",
  invent:"invent", inventing:"invent", invented:"invent",
  produce:"invent", produce:"invent",
  clean:"wash", cleaning:"wash", washes:"wash", washed:"wash",

  // ── Adjectives — positive ─────────────────────────────────────────────────
  good:"good", great:"great", excellent:"great", awesome:"great",
  amazing:"great", wonderful:"great", fantastic:"great",
  perfect:"great", best:"best", better:"better",
  nice:"good", fine:"good", okay:"good", ok:"good",
  beautiful:"beautiful", pretty:"pretty", lovely:"beautiful",
  happy:"happy", glad:"happy", joyful:"happy", excited:"happy",
  safe:"safe", secure:"safe", okay:"safe",
  right:"right", correct:"right", true:"right",
  new:"next", fresh:"good", young:"good",
  fast:"great", quick:"great", smart:"great", strong:"great",
  big:"more", large:"more", huge:"more",
  clear:"right", bright:"great", light:"good",
  easy:"good", simple:"good", ready:"go",
  free:"out", open:"go", alive:"go",
  real:"right", sure:"right",
  important:"great", special:"beautiful", unique:"great",
  interesting:"great", useful:"help", helpful:"help",

  // ── Adjectives — negative ─────────────────────────────────────────────────
  bad:"wrong", terrible:"wrong", awful:"wrong", horrible:"wrong",
  sad:"sad", unhappy:"sad", upset:"sad", angry:"fight",
  wrong:"wrong", false:"wrong", incorrect:"wrong",
  old:"before", slow:"stay",
  small:"me", little:"me", tiny:"me",
  hard:"fight", difficult:"fight", tough:"fight",
  busy:"busy", tired:"sad", sick:"sad",
  lost:"sad", confused:"sad", broken:"wrong",
  alone:"alone", lonely:"alone",

  // ── Nouns — common ───────────────────────────────────────────────────────
  thing:"it", stuff:"it", object:"it", item:"it",
  idea:"see", plan:"see", problem:"fight", issue:"fight",
  question:"what", answer:"talk", reason:"why",
  way:"way", method:"way", system:"work",
  life:"go", world:"world", earth:"world",
  water:"wash", food:"eat", money:"go",
  news:"talk", story:"talk", information:"talk", data:"computer",
  fact:"right", truth:"right",
  door:"home", window:"see",
  car:"go", train:"go", bus:"go", plane:"go",
  book:"learn", paper:"type", letter:"name",
  number:"name", word:"words",

  // ── News / broadcast domain ───────────────────────────────────────────────
  "breaking news":"now", breaking:"now",
  live:"now", latest:"now", recent:"now",
  report:"talk", reporting:"talk", reporter:"talk", anchor:"talk",
  broadcast:"talk", broadcasting:"talk",
  update:"change", updates:"change", updated:"change",
  event:"go", events:"go", incident:"go", occurred:"go",
  statement:"talk", press:"talk", conference:"talk",
  interview:"talk", source:"name", official:"right",
  confirmed:"right", denied:"not", claims:"talk",
  according:"talk", following:"go",
  politics:"work", government:"work", president:"name",
  minister:"name", official:"name", leader:"name",
  election:"go", vote:"go", law:"right", policy:"work",
  economy:"work", economic:"work", market:"work",
  health:"safe", medical:"safe", hospital:"home",
  disease:"sad", virus:"sad", pandemic:"sad",
  climate:"world", weather:"now", temperature:"now",
  disaster:"sad", flood:"sad", earthquake:"sad", fire:"sad",
  war:"fight", conflict:"fight", peace:"safe",
  police:"safe", crime:"fight", court:"right",
  company:"work", business:"work", industry:"work",
  million:"more", billion:"more", thousand:"more",
  percent:"more", rate:"more", number:"name",

  // ── Technology domain ─────────────────────────────────────────────────────
  phone:"computer", smartphone:"computer", mobile:"computer",
  laptop:"computer", tablet:"computer", screen:"see", device:"computer",
  software:"computer", app:"computer", application:"computer",
  website:"homepage", internet:"homepage", online:"homepage",
  network:"computer", server:"computer", database:"computer",
  engineer:"engineer", developer:"engineer", programmer:"engineer",
  technology:"computer", tech:"computer", digital:"computer",
  video:"see", audio:"sound", music:"sing",
  tv:"television", radio:"sound", media:"talk",
  sign:"sign", language:"language",
  translate:"sign", translation:"sign", interpreter:"sign",
  deaf:"sign", hearing:"sound", mute:"sign",

  // ── Prepositions that have signs ──────────────────────────────────────────
  in:"home", inside:"home",
  at:"at",
  on:"on",
  of:"of",
  to:"to",
  from:"from",
  with:"with",
  without:"without",
  for:"go",
  about:"talk",
  after:"after",
  before:"before",
  between:"with",
  against:"against",
  during:"now",
  through:"go",
  around:"world",
  over:"out",
  under:"home",
  near:"here",
  into:"home",
  onto:"on",
  upon:"on",
  within:"home",
  across:"go",
  behind:"after",
  beyond:"out",
  beside:"with",
  toward:"go",

  // ── Conjunctions / discourse markers ──────────────────────────────────────
  and:"and", but:"but", or:"but", nor:"not",
  so:"so", yet:"but", although:"but",
  because:"why", since:"before", until:"after",
  while:"now", when:"when", where:"where",
  if:"but", unless:"not", whether:"but",
  however:"but", therefore:"so", thus:"so",
  also:"also", too:"also", as:"so",
  then:"next", finally:"finish", lastly:"finish",
  first:"go", second:"next", third:"next",
  next:"next", again:"again", still:"stay",

  // ── Question words ────────────────────────────────────────────────────────
  what:"what", which:"which", who:"who", whom:"who",
  whose:"whose", where:"where", when:"when",
  why:"why", how:"how",
  "how many":"more", "how much":"more",

  // ── Numbers as words ──────────────────────────────────────────────────────
  zero:"0", one:"1", two:"2", three:"3", four:"4",
  five:"5", six:"6", seven:"7", eight:"8", nine:"9",
  ten:"1", hundred:"more", thousand:"more",
  first:"1", second:"2", third:"3",

  // ── Misc ─────────────────────────────────────────────────────────────────
  please:"help", sorry:"sad", excuse:"help", pardon:"help",
  yes:"right", yeah:"right", yep:"right", sure:"right", okay:"good",
  no:"not", nope:"not", never:"not",
  very:"great", really:"great", quite:"more", just:"so",
  only:"me", even:"so", already:"finish",
  still:"stay", yet:"but", soon:"next",
  maybe:"but", perhaps:"but", probably:"right",
  else:"out",
};

// ── Async merge from canonical synonyms.json ─────────────────────────────────
// Fetches /public/synonyms.json and merges it into SYNONYM_MAP so any entry
// added to the JSON file is picked up without changing this JS file.
// The fetch is fire-and-forget; synchronous resolution keeps working during load.
(async () => {
  try {
    const res = await fetch("/synonyms.json");
    if (!res.ok) return;
    const data = await res.json();
    // Merge — JSON values take precedence over the inline snapshot above
    for (const [k, v] of Object.entries(data)) {
      if (k !== "_comment" && typeof v === "string") {
        SYNONYM_MAP[k] = v;
      }
    }
  } catch {
    // Network unavailable — inline snapshot remains active, no disruption
  }
})();

// ── 6. Suffix stemmer ─────────────────────────────────────────────────────────
const stem = (word) => {
  if (word.endsWith("ing")) {
    const s = word.slice(0, -3);
    if (KNOWN_WORDS.has(s)) return s;
    if (KNOWN_WORDS.has(s + "e")) return s + "e";
  }
  if (word.endsWith("tion") || word.endsWith("sion")) {
    const s = word.slice(0, -4);
    if (KNOWN_WORDS.has(s)) return s;
  }
  if (word.endsWith("ness")) {
    const s = word.slice(0, -4);
    if (KNOWN_WORDS.has(s)) return s;
  }
  if (word.endsWith("ment")) {
    const s = word.slice(0, -4);
    if (KNOWN_WORDS.has(s)) return s;
  }
  if (word.endsWith("ful")) {
    const s = word.slice(0, -3);
    if (KNOWN_WORDS.has(s)) return s;
  }
  if (word.endsWith("less")) {
    const s = word.slice(0, -4);
    if (KNOWN_WORDS.has(s)) return s;
  }
  if (word.endsWith("ly")) {
    const s = word.slice(0, -2);
    if (KNOWN_WORDS.has(s)) return s;
  }
  if (word.endsWith("ed")) {
    const s = word.slice(0, -2);
    if (KNOWN_WORDS.has(s)) return s;
    if (KNOWN_WORDS.has(s.slice(0, -1))) return s.slice(0, -1);
  }
  if (word.endsWith("er") || word.endsWith("or")) {
    const s = word.slice(0, -2);
    if (KNOWN_WORDS.has(s)) return s;
  }
  if (word.endsWith("est")) {
    const s = word.slice(0, -3);
    if (KNOWN_WORDS.has(s)) return s;
  }
  if (word.endsWith("es")) {
    const s = word.slice(0, -2);
    if (KNOWN_WORDS.has(s)) return s;
  }
  if (word.endsWith("s")) {
    const s = word.slice(0, -1);
    if (KNOWN_WORDS.has(s)) return s;
  }
  return null;
};

// ── 7. Core resolver: spoken word → canonical sign word (or null) ─────────────
export const resolveWordSign = (raw) => {
  const w = raw.toLowerCase().trim();
  if (!w) return null;

  // Contraction expansion first
  const expanded = CONTRACTIONS[w];
  if (expanded) {
    if (KNOWN_WORDS.has(expanded)) return expanded;
    // expanded might itself map (e.g. "will not" → "not")
    const r2 = resolveWordSign(expanded);
    if (r2) return r2;
  }

  if (KNOWN_WORDS.has(w)) return w;
  if (PRONOUN_MAP[w] && KNOWN_WORDS.has(PRONOUN_MAP[w])) return PRONOUN_MAP[w];

  // Synonym map — check exact match first
  const syn = SYNONYM_MAP[w];
  if (syn) {
    // syn might be a digit string (e.g. "one" → "1")
    if (/^\d+$/.test(syn)) return syn;
    if (KNOWN_WORDS.has(syn)) return syn;
  }

  return stem(w);
};

// ── 8. getVideoSource ─────────────────────────────────────────────────────────
export const getVideoSource = (item) => {
  const { text, type } = item;
  if (type === "number" || /^\d+$/.test(text)) {
    return `/videos/numbers/${text}.mp4`;
  }
  if (type === "letter" || (text.length === 1 && /^[a-zA-Z]$/.test(text))) {
    return `/videos/letters/${text.toUpperCase()}.mp4`;
  }
  const titled = text.split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return `/videos/words/${titled}.mp4`;
};

// ── 9. resolveSpokenWordToSignItems ──────────────────────────────────────────
// Converts one raw spoken word into sign-clip descriptors.
// NEVER returns [] for a real word — unknown words are fingerspelled.
export const resolveSpokenWordToSignItems = (rawWord) => {
  const clean = rawWord.replace(/[.,!?;:"'(){}\[\]]/g, "").toLowerCase().trim();
  if (!clean) return [];

  // Only true articles are dropped
  if (STOP_WORDS.has(clean)) return [];

  // Numbers → digit clips
  if (/^\d+$/.test(clean)) {
    return clean.split("").map(d => ({
      text: d, type: "number", display: d, original: rawWord,
    }));
  }

  // Hyphenated compound
  if (clean.includes("-")) {
    const parts = clean.split("-").filter(Boolean);
    const items = [];
    for (const part of parts) {
      items.push(...resolveSpokenWordToSignItems(part));
    }
    return items.length ? items : fingerspell(clean, rawWord);
  }

  // Try to resolve to a known word sign
  const resolved = resolveWordSign(clean);
  if (resolved) {
    // resolved could be a multi-char digit (e.g. "10" from ten→"10") — handle
    if (/^\d+$/.test(resolved)) {
      return resolved.split("").map(d => ({
        text: d, type: "number", display: d, original: rawWord,
      }));
    }
    return [{ text: resolved, type: "word", display: resolved, original: rawWord }];
  }

  // ── FINGERSPELL every unknown word — avatar never goes idle ──────────────
  return fingerspell(clean, rawWord);
};

/** Produce individual letter-clip items for a word */
const fingerspell = (clean, original) =>
  clean.replace(/[^a-z]/g, "").toUpperCase().split("").map(l => ({
    text: l, type: "letter", display: l, original,
  }));

// ── 10. getVideoSource compat alias ──────────────────────────────────────────
export const checkVideoExists = async (src) => {
  if (src.includes("/videos/letters/") || src.includes("/videos/numbers/")) return true;
  const m = src.match(/\/videos\/words\/(.+)\.mp4$/i);
  return m ? KNOWN_WORDS.has(m[1].toLowerCase()) : true;
};

// ── 11. processISLTranslation (legacy) ───────────────────────────────────────
export const processISLTranslation = async (translation) => {
  if (!translation) return [];
  const processed = [];
  translation.split(/\s+/).filter(Boolean).forEach((word, wordIndex) => {
    resolveSpokenWordToSignItems(word).forEach(item =>
      processed.push({ ...item, wordIndex })
    );
  });
  return processed;
};

// ── 12. ISL grammar reordering ────────────────────────────────────────────────
//
// ISL follows a Topic-Comment structure with these ordering principles:
//   1. Time words → sentence-initial position
//   2. WH-question words → sentence-final position
//   3. Negation (NOT, DO NOT, DOES NOT, CANNOT) → after main content
//   4. Core word order: Subject → Object → Verb (SOV approximation)
//
// This is a lightweight local approximation used for the instant gloss panel
// while the AI backend response is in-flight. The AI (Fix 3) handles the full
// linguistic transformation for confirmed utterances.
//
// Reference: ISL grammar follows SOV/Topic-Comment structure with time-first
// ordering, consistent with documented ISL linguistic analysis and comparable
// to other South/Southeast Asian sign languages (ASL differs — ASL is SVO).

const ISL_TIME_WORDS = new Set([
  "NOW","TODAY","TOMORROW","YESTERDAY","BEFORE","AFTER","NEXT","DAY",
  "TIME","MORNING","NIGHT","WEEK","MONTH","YEAR","SOON","LATE","EARLY",
]);

const ISL_QUESTION_WORDS = new Set([
  "WHAT","WHERE","WHY","WHO","WHOM","WHOSE","WHEN","HOW","WHICH",
]);

const ISL_NEGATION_WORDS = new Set([
  "NOT","DO NOT","DOES NOT","CANNOT","WITHOUT","WRONG",
]);

const ISL_SUBJECT_WORDS = new Set([
  "ME","YOU","WE","THEY","US",
  // HIS / HER / OUR are possessive — kept in content order, not promoted
]);

/**
 * Reorder a flat array of resolved sign tokens (already UPPERCASE strings)
 * into approximate ISL word order: Time → Subject → Object/Content → Verb → Negation → Question
 *
 * @param {string[]} tokens - UPPERCASE resolved sign tokens
 * @returns {string[]} reordered tokens
 */
export const reorderToISLGrammar = (tokens) => {
  if (tokens.length <= 1) return tokens;

  const timeSlot      = [];
  const subjectSlot   = [];
  const contentSlot   = [];
  const negationSlot  = [];
  const questionSlot  = [];

  // Classify each token into its grammatical slot.
  // Tokens that span multiple words (e.g. "DO NOT") are handled as a unit
  // because resolveWordSign() already collapses contractions.
  for (const tok of tokens) {
    if (ISL_TIME_WORDS.has(tok)) {
      timeSlot.push(tok);
    } else if (ISL_QUESTION_WORDS.has(tok)) {
      questionSlot.push(tok);
    } else if (ISL_NEGATION_WORDS.has(tok)) {
      negationSlot.push(tok);
    } else if (ISL_SUBJECT_WORDS.has(tok) && subjectSlot.length === 0) {
      // Only the first subject-class token gets promoted; subsequent pronouns
      // stay in content order to avoid over-restructuring short phrases.
      subjectSlot.push(tok);
    } else {
      contentSlot.push(tok);
    }
  }

  // Assemble: Time → Subject → Content → Negation → Question
  return [
    ...timeSlot,
    ...subjectSlot,
    ...contentSlot,
    ...negationSlot,
    ...questionSlot,
  ];
};

// ── 13. convertTextToISLGlossLocally ─────────────────────────────────────────
// Converts English text to an ISL gloss string using local rules only —
// no network call required, runs synchronously.
//
// Pipeline:
//   1. Strip punctuation and tokenise
//   2. Drop stop words (a, an, the)
//   3. Resolve each word to a known sign via resolveWordSign()
//   4. Reorder tokens into ISL grammar (Time → Subject → Content → Neg → WH)
//   5. Join and return UPPERCASE gloss
export const convertTextToISLGlossLocally = (text) => {
  if (!text) return "";

  const raw_tokens = [];
  for (const raw of text.replace(/[.,!?;"']/g, "").split(/\s+/).filter(Boolean)) {
    const w = raw.toLowerCase();
    if (STOP_WORDS.has(w)) continue;
    const r = resolveWordSign(w);
    if (r) raw_tokens.push(r.toUpperCase());
    else if (/^\d+$/.test(w)) raw_tokens.push(w);
    else raw_tokens.push(w.toUpperCase());
  }

  // Apply ISL grammar reordering
  const ordered = reorderToISLGrammar(raw_tokens);
  return ordered.join(" ");
};
