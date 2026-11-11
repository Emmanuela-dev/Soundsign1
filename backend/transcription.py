import os
import logging
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Load environment variables
load_dotenv(Path(__file__).resolve().with_name(".env"))

# Check for Gemini SDK availability
genai_client_type = None

try:
    from google import genai
    from google.genai import types
    genai_client_type = "genai"
except ImportError:
    try:
        import google.generativeai as genai_module
        genai_client_type = "generativeai"
    except ImportError:
        genai_client_type = None

api_key = os.getenv("GEMINI_API_KEY")

# ── ISL & Clinical Medical vocabulary — uppercase versions of words with sign videos or clinical tokens ──
_VOCAB_UPPER = sorted([
    "AFTER", "AGAIN", "AGAINST", "AGE", "ALL", "ALLERGY", "ALONE", "ALSO", "AND", "ASK", "AT",
    "BE", "BEAUTIFUL", "BEFORE", "BEST", "BETTER", "BLEED", "BREATHE", "BUSY", "BUT", "BYE",
    "CAN", "CANNOT", "CHANGE", "CHEST", "COLLEGE", "COME", "COMPUTER",
    "DAY", "DISTANCE", "DIZZY", "DO", "DO NOT", "DOCTOR", "DOES NOT",
    "EAT", "ENGINEER", "FEVER", "FIGHT", "FINISH", "FROM", "GLITTER",
    "GO", "GOD", "GOLD", "GOOD", "GREAT",
    "HAND", "HANDS", "HAPPY", "HEAD", "HEART", "HELLO", "HELP", "HER", "HERE", "HIS",
    "HOME", "HOMEPAGE", "HOSPITAL", "HOW",
    "INJECTION", "INVENT", "IT", "KEEP", "LANGUAGE", "LAUGH", "LEARN",
    "ME", "MEDICINE", "MORE", "MY", "NAME", "NEXT", "NOT", "NOW", "NURSE",
    "OF", "ON", "OUR", "OUT", "PAIN", "PILL", "PRETTY", "RIGHT", "SAD", "SAFE", "SCALE", "SEE", "SELF",
    "SIGN", "SING", "SO", "SOUND", "STAY", "STOMACH", "STUDY", "SURGERY",
    "TALK", "TELEVISION", "THANK", "THANK YOU", "THAT", "THEY",
    "THIS", "THOSE", "TIME", "TO", "TYPE",
    "US", "WALK", "WASH", "WAY", "WE", "WELCOME",
    "WHAT", "WHEN", "WHERE", "WHICH", "WHO", "WHOLE", "WHOSE", "WHY", "WILL",
    "WITH", "WITHOUT", "WORDS", "WORK", "WORLD", "WRONG",
    "YOU", "YOUR", "YOURSELF",
])
_VOCAB_SET = set(_VOCAB_UPPER)
_VOCAB_LIST_STR = ", ".join(_VOCAB_UPPER)

ISL_SYSTEM_INSTRUCTION = f"""
You are an expert Clinical Sign Language (ISL/ASL) Medical Gloss Translator for the MedSoundSigns healthcare platform.
Your job is to convert doctor and nurse clinical dialogue into precise, life-saving sign gloss notation using ONLY signs that exist in the supported vocabulary below.

SUPPORTED SIGN VOCABULARY ({len(_VOCAB_UPPER)} words):
{_VOCAB_LIST_STR}

Clinical Grammar & Triage Rules:
1. MEDICAL ORDER: Use standard Time — Location — Symptom/Object — Severity (1-10) — Verb syntax.
   - Place time words (NOW, TODAY, BEFORE, AFTER, NEXT) at the BEGINNING.
   - Place anatomical locations (HEAD, CHEST, STOMACH, HEART) before the symptom.
   - Place question words (WHAT, WHERE, WHY, WHO, WHEN, HOW) at the END of the question.
2. CAPITALIZATION: Output every sign word in UPPERCASE only.
3. CLINICAL VOCABULARY MAPPING: Every output word MUST appear in the SUPPORTED SIGN VOCABULARY list above.
   - Map clinical synonyms: HURT/ACHE → PAIN, MEDS/DRUG/TABLET → MEDICINE, BLOOD → BLEED, INHALE/EXHALE → BREATHE, PHYSICIAN → DOCTOR, CLINIC → HOSPITAL.
   - For medications, dosages, and anatomical terms outside the lexicon, fingerspell them using hyphenated uppercase letters (e.g. Aspirin → A-S-P-I-R-I-N, Penicillin → P-E-N-I-C-I-L-L-I-N, 500mg → 5-0-0-M-G).
4. OMIT: Articles (A, AN, THE) and auxiliary verbs (IS, ARE, AM, WAS, WERE, HAVE, HAS, HAD, WILL BE).
5. NEGATION: Place NOT or DO NOT after the symptom or at the end.
6. OUTPUT FORMAT: Output ONLY the sign gloss string — no markdown, no quotes, no explanation.

Clinical Examples:
Doctor: "Where does it hurt?"                                   → PAIN WHERE
Doctor: "How severe is your chest pain from 1 to 10?"           → CHEST PAIN SCALE 1 10 WHAT
Doctor: "Are you feeling dizzy right now?"                      → NOW DIZZY YOU FEEL
Doctor: "Do you have any difficulty breathing?"                 → BREATHE HARD YOU HAVE
Doctor: "Are you allergic to penicillin?"                       → P-E-N-I-C-I-L-L-I-N ALLERGY YOU HAVE
Doctor: "Please take this medicine after eating."               → EAT AFTER THIS MEDICINE TAKE
Doctor: "We need to check your heart and blood pressure."       → YOUR HEART CHECK WE MUST
Doctor: "The nurse will give you an injection."                 → NURSE INJECTION GIVE WILL
Doctor: "Hello, I am Doctor John, I will help you today."       → HELLO ME DOCTOR J-O-H-N TODAY HELP YOU
Doctor: "Please stay still and breathe slowly."                 → STAY STILL BREATHE SLOW
"""


def get_gemini_client():
    if not api_key or api_key == "your_gemini_api_key_here":
        return None, "GEMINI_API_KEY is not configured in backend/.env"

    if genai_client_type == "genai":
        return genai.Client(api_key=api_key), None
    elif genai_client_type == "generativeai":
        genai_module.configure(api_key=api_key)
        model = genai_module.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=ISL_SYSTEM_INSTRUCTION,
        )
        return model, None
    else:
        return None, "Google Gemini SDK (google-genai) is not installed."


import re
import json as _json

STOP_WORDS = {
    "a", "an", "the", "is", "are", "was", "were", "am", "been", "being"
}

PRONOUN_MAP = {
    "i": "ME",
    "my": "MY",
    "me": "ME",
    "your": "YOUR",
    "you": "YOU",
    "his": "HIS",
    "her": "HER",
    "our": "OUR",
    "their": "THEY",
}

KNOWN_WORDS = {
    "after", "again", "against", "age", "all", "allergy", "alone", "also", "and", "ask", "at",
    "be", "beautiful", "before", "best", "better", "bleed", "breathe", "busy", "but", "bye", "can",
    "cannot", "change", "chest", "college", "come", "computer", "day", "distance", "dizzy", "do",
    "do not", "doctor", "does not", "eat", "engineer", "fever", "fight", "finish", "from", "glitter",
    "go", "god", "gold", "good", "great", "hand", "hands", "happy", "head", "heart", "hello", "help",
    "her", "here", "his", "home", "homepage", "hospital", "how", "injection", "invent", "it", "keep",
    "language", "laugh", "learn", "me", "medicine", "more", "my", "name", "next", "not", "now", "nurse",
    "of", "on", "our", "out", "pain", "pill", "pretty", "right", "sad", "safe", "scale", "see", "self",
    "sign", "sing", "so", "sound", "stay", "stomach", "study", "surgery", "talk", "television",
    "thank you", "thank", "that", "they", "this", "those", "time", "to", "type",
    "us", "walk", "wash", "way", "we", "welcome", "what", "when", "where", "which",
    "who", "whole", "whose", "why", "will", "with", "without", "words", "work",
    "world", "wrong", "you", "your", "yourself"
}

CONTRACTIONS_MAP = {
    "don't": "do not", "dont": "do not",
    "doesn't": "does not", "doesnt": "does not",
    "can't": "cannot", "cant": "cannot",
    "won't": "will not", "wont": "will not",
    "isn't": "not", "isnt": "not",
    "aren't": "not", "arent": "not",
    "wasn't": "not", "wasnt": "not",
    "weren't": "not", "werent": "not",
    "i'm": "me", "im": "me",
    "you're": "you", "youre": "you",
    "he's": "his", "hes": "his",
    "she's": "her", "shes": "her",
    "it's": "it", "its": "it",
    "we're": "we", "were": "we",
    "they're": "they", "theyre": "they",
    "that's": "that", "thats": "that",
    "what's": "what", "whats": "what",
    "where's": "where", "wheres": "where",
    "who's": "who", "whos": "who",
    "how's": "how", "hows": "how",
    "let's": "us", "lets": "us",
    "thankyou": "thank you", "thanks": "thank you",
    "bye-bye": "bye", "byebye": "bye",
    "greetings": "hello", "hi": "hello", "hey": "hello",
}

# ── Load shared synonym map from synonyms.json ────────────────────────────────
# This file is the single source of truth shared with the frontend videoUtils.js.
# Values in the JSON are lowercase (frontend convention); we uppercase them here
# for the backend rule-based gloss output.
_SYNONYMS_PATH = Path(__file__).resolve().parent.parent / "frontend" / "public" / "synonyms.json"
SYNONYM_MAP: dict = {}

def _load_synonyms():
    """Load and uppercase synonym values from the shared synonyms.json file."""
    global SYNONYM_MAP
    try:
        with open(_SYNONYMS_PATH, "r", encoding="utf-8") as f:
            raw = _json.load(f)
        SYNONYM_MAP = {
            k: v.upper()
            for k, v in raw.items()
            if k != "_comment" and isinstance(v, str)
        }
        logging.info(f"[synonyms] Loaded {len(SYNONYM_MAP)} mappings from synonyms.json")
    except Exception as e:
        logging.warning(f"[synonyms] Could not load synonyms.json ({e}). Using empty map — AI gloss still works.")
        SYNONYM_MAP = {}

_load_synonyms()


def resolve_word_sign(word):
    expanded = CONTRACTIONS_MAP.get(word, None)
    if expanded and expanded in KNOWN_WORDS:
        return expanded.upper()

    if word in KNOWN_WORDS:
        return word.upper()
    if word in SYNONYM_MAP:
        return SYNONYM_MAP[word]

    # Suffix Stemming
    if word.endswith("ing"):
        stem = word[:-3]
        if stem in KNOWN_WORDS:
            return stem.upper()
        if (stem + "e") in KNOWN_WORDS:
            return (stem + "e").upper()
    if word.endswith("ed"):
        stem = word[:-2]
        if stem in KNOWN_WORDS:
            return stem.upper()
        if (stem[:-1]) in KNOWN_WORDS:
            return (stem[:-1]).upper()
    if word.endswith("s"):
        stem = word[:-1]
        if stem in KNOWN_WORDS:
            return stem.upper()

    return None


def _fingerspell(word: str) -> str:
    """Return a hyphen-separated letter sequence for fingerspelling, e.g. 'john' → 'J-O-H-N'."""
    letters = [c for c in word.upper() if c.isalpha()]
    return "-".join(letters) if letters else word.upper()


def sanitise_gloss(gloss: str) -> str:
    """
    Post-process a raw gloss string (from AI or rule-based) to ensure every
    token is either in the supported sign vocabulary or fingerspelled.

    Steps:
    1. Strip markdown artefacts and quotes the model sometimes emits.
    2. For each token that is NOT in _VOCAB_SET:
       a. Check SYNONYM_MAP for a supported alternative.
       b. If still unsupported, check if it looks like a proper noun / unknown
          word and fingerspell it.
    3. Return the cleaned uppercase gloss string.
    """
    if not gloss:
        return gloss

    # Strip common AI artefacts
    clean = gloss.strip().strip('"\'`').strip()
    # Remove markdown bold/italic markers
    clean = re.sub(r"[*_]{1,2}", "", clean)

    tokens = clean.split()
    result = []

    for token in tokens:
        # Hyphens already in a fingerspell sequence like J-O-H-N — keep as-is
        if re.match(r"^[A-Z]-([A-Z]-)*[A-Z]$", token):
            result.append(token)
            continue

        upper = token.upper()

        # Already supported
        if upper in _VOCAB_SET:
            result.append(upper)
            continue

        # Try synonym map (values are already uppercase in SYNONYM_MAP)
        syn = SYNONYM_MAP.get(upper.lower())
        if syn and syn in _VOCAB_SET:
            result.append(syn)
            continue

        # Digits pass through directly
        if token.isdigit():
            result.append(token)
            continue

        # Multi-word token already matched above — fingerspell anything else
        result.append(_fingerspell(upper))

    return " ".join(result)


# ── ISL grammar reorder sets (mirrors videoUtils.js reorderToISLGrammar) ──────
_ISL_TIME_WORDS    = {"NOW","TODAY","TOMORROW","YESTERDAY","BEFORE","AFTER","NEXT","DAY",
                      "TIME","MORNING","NIGHT","WEEK","MONTH","YEAR","SOON","LATE","EARLY"}
_ISL_QUESTION_WORDS = {"WHAT","WHERE","WHY","WHO","WHOM","WHOSE","WHEN","HOW","WHICH"}
_ISL_NEGATION_WORDS = {"NOT","DO NOT","DOES NOT","CANNOT","WITHOUT","WRONG"}
_ISL_SUBJECT_WORDS  = {"ME","YOU","WE","THEY","US"}


def _reorder_to_isl_grammar(tokens: list) -> list:
    """
    Reorder UPPERCASE gloss tokens into approximate ISL word order:
        Time → Subject → Content → Negation → Question
    Mirrors the reorderToISLGrammar function in frontend/src/components/videoUtils.js.
    """
    if len(tokens) <= 1:
        return tokens

    time_slot, subject_slot, content_slot, neg_slot, question_slot = [], [], [], [], []
    subject_filled = False

    for tok in tokens:
        if tok in _ISL_TIME_WORDS:
            time_slot.append(tok)
        elif tok in _ISL_QUESTION_WORDS:
            question_slot.append(tok)
        elif tok in _ISL_NEGATION_WORDS:
            neg_slot.append(tok)
        elif tok in _ISL_SUBJECT_WORDS and not subject_filled:
            subject_slot.append(tok)
            subject_filled = True
        else:
            content_slot.append(tok)

    return time_slot + subject_slot + content_slot + neg_slot + question_slot


def rule_based_isl_gloss(text):
    """Fallback rule-based ISL gloss converter when AI is unavailable."""
    # Expand contractions in raw text first
    clean_text = text.lower()
    for contraction, expansion in CONTRACTIONS_MAP.items():
        clean_text = re.sub(r"\b" + re.escape(contraction) + r"\b", expansion, clean_text)

    words = re.findall(r"\b[\w\'-]+\b", clean_text)
    gloss_tokens = []

    for word in words:
        if word in STOP_WORDS:
            continue
        mapped = PRONOUN_MAP.get(word, None)
        if mapped:
            gloss_tokens.append(mapped)
            continue

        resolved = resolve_word_sign(word)
        if resolved:
            gloss_tokens.append(resolved)
        elif word.isdigit():
            gloss_tokens.append(word)
        else:
            # Unsupported word — fingerspell rather than emitting a raw uppercase
            # token that has no corresponding sign video
            gloss_tokens.append(_fingerspell(word))

    # Apply ISL grammar reordering before sanitising
    ordered = _reorder_to_isl_grammar(gloss_tokens)
    raw = " ".join(ordered)
    # Run sanitiser to catch any residual unsupported tokens
    return sanitise_gloss(raw)


def text_to_isl_gloss(text):
    """Convert English text to ISL gloss notation.
    Tries Google Gemini AI first; falls back to rule-based parser.
    Both paths run through sanitise_gloss() so unsupported tokens are
    replaced with supported synonyms or fingerspelled before reaching
    the frontend.
    """
    if not text.strip():
        return "", None, "empty"

    client_obj, err = get_gemini_client()
    if err or client_obj is None:
        logging.info(f"Gemini AI client unavailable ({err}). Using rule-based ISL gloss fallback.")
        return rule_based_isl_gloss(text), None, "rule_based"

    try:
        if genai_client_type == "genai":
            response = client_obj.models.generate_content(
                model="gemini-1.5-flash",
                contents=f"Translate to ISL gloss: '{text}'",
                config=types.GenerateContentConfig(
                    system_instruction=ISL_SYSTEM_INSTRUCTION,
                    temperature=0.1,
                    max_output_tokens=200,
                ),
            )
            gloss = (response.text or "").strip()
        else:
            response = client_obj.generate_content(
                f"Translate to ISL gloss: '{text}'",
                generation_config=genai_module.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=200,
                ),
            )
            gloss = (response.text or "").strip()

        if gloss:
            return sanitise_gloss(gloss), None, "gemini_ai"
        else:
            return rule_based_isl_gloss(text), None, "rule_based"

    except Exception as e:
        logging.warning(f"Gemini API error ({e}). Falling back to rule-based ISL translation.")
        return rule_based_isl_gloss(text), None, "rule_based"


@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json()
    text = data.get("text", "")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    isl_gloss, error, mode = text_to_isl_gloss(text)

    if error and not isl_gloss:
        return jsonify({"error": error, "isl": ""}), 500

    return jsonify({"isl": isl_gloss, "mode": mode})


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "ISL Translator"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
