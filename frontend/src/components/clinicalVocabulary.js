export const CLINICAL_VOCABULARY_VERSION = "1.0.0";
export const CLINICAL_VOCABULARY_REVIEW_STATUS = "pending_clinical_review";

export const CLINICAL_VOCABULARY = {
  locale: "en-US",
  complaints: [
    {
      id: "chest_pain",
      label: "Chest Pain",
      phrase: "I have severe chest pain.",
      aliases: ["chest pain", "pain in my chest", "my chest hurts"],
    },
    {
      id: "breathe",
      label: "Can't Breathe",
      phrase: "I cannot breathe properly.",
      aliases: ["trouble breathing", "difficulty breathing", "I can't catch my breath"],
    },
    {
      id: "bleed",
      label: "Bleeding",
      phrase: "I am bleeding.",
      aliases: ["bleeding", "I am losing blood"],
    },
    {
      id: "dizzy",
      label: "Dizzy / Faint",
      phrase: "I feel very dizzy and faint.",
      aliases: ["dizzy", "lightheaded", "feel faint"],
    },
    {
      id: "allergy",
      label: "Severe Allergy",
      phrase: "I am having a severe allergic reaction.",
      aliases: ["allergic reaction", "severe allergy"],
    },
    {
      id: "fever",
      label: "High Fever",
      phrase: "I have a very high fever.",
      aliases: ["fever", "high temperature"],
    },
    {
      id: "seizure",
      label: "Seizure / Fit",
      phrase: "I had a seizure.",
      aliases: ["seizure", "fit"],
    },
    {
      id: "emergency",
      label: "Emergency Help",
      phrase: "Please call emergency help immediately.",
      aliases: ["emergency", "call emergency help"],
    },
    {
      id: "medicine",
      label: "Need Medicine",
      phrase: "I urgently need my prescribed medicine.",
      aliases: ["need medicine", "need my medication"],
    },
  ],
  locations: [
    { id: "chest", label: "Chest", aliases: ["chest area"] },
    { id: "head", label: "Head", aliases: [] },
    { id: "stomach", label: "Stomach", aliases: ["abdomen", "belly"] },
    { id: "back", label: "Back", aliases: [] },
    { id: "neck", label: "Neck", aliases: [] },
    { id: "throat", label: "Throat", aliases: [] },
    { id: "arm", label: "Arm", aliases: [] },
    { id: "leg", label: "Leg", aliases: [] },
    { id: "eye", label: "Eye", aliases: [] },
    { id: "ear", label: "Ear", aliases: [] },
    { id: "whole_body", label: "Whole Body", aliases: ["all over"] },
  ],
  painLevels: [
    { id: "pain_0", score: 0, label: "None", aliases: [] },
    { id: "pain_2", score: 2, label: "Mild", aliases: [] },
    { id: "pain_4", score: 4, label: "Moderate", aliases: [] },
    { id: "pain_6", score: 6, label: "Severe", aliases: [] },
    { id: "pain_8", score: 8, label: "Very Severe", aliases: [] },
    { id: "pain_10", score: 10, label: "Worst", aliases: [] },
  ],
  durations: [
    { id: "just_now", label: "Just now", aliases: ["started just now"] },
    { id: "few_minutes", label: "A few minutes", aliases: ["minutes"] },
    { id: "30_minutes", label: "30 minutes", aliases: ["half an hour"] },
    { id: "one_to_two_hours", label: "1–2 hours", aliases: ["one to two hours"] },
    { id: "half_day", label: "Half a day", aliases: ["12 hours"] },
    { id: "over_day", label: "Over a day", aliases: ["more than a day"] },
  ],
  history: [
    { id: "heart_disease", label: "Heart disease", aliases: [] },
    { id: "diabetes", label: "Diabetes", aliases: [] },
    { id: "asthma", label: "Asthma", aliases: [] },
    { id: "high_blood_pressure", label: "High blood pressure", aliases: ["hypertension"] },
    { id: "epilepsy", label: "Epilepsy", aliases: [] },
    { id: "none", label: "None", aliases: [], exclusive: true },
  ],
  allergies: [
    { id: "penicillin", label: "Penicillin", aliases: [] },
    { id: "aspirin", label: "Aspirin", aliases: [] },
    { id: "ibuprofen", label: "Ibuprofen", aliases: [] },
    { id: "sulfa_drugs", label: "Sulfa drugs", aliases: ["sulfa medication"] },
    { id: "latex", label: "Latex", aliases: [] },
    { id: "none", label: "None", aliases: [], exclusive: true },
  ],
};

export const CLINICAL_RECOGNITION_CASES = [
  {
    id: "common-chest-pain-phrase",
    category: "complaints",
    input: "My chest hurts",
    expectedTermId: "chest_pain",
    confirmationRequired: true,
    reviewStatus: CLINICAL_VOCABULARY_REVIEW_STATUS,
  },
  {
    id: "common-breathing-phrase",
    category: "complaints",
    input: "I can't catch my breath",
    expectedTermId: "breathe",
    confirmationRequired: true,
    reviewStatus: CLINICAL_VOCABULARY_REVIEW_STATUS,
  },
  {
    id: "negated-chest-pain",
    category: "complaints",
    input: "I do not have chest pain",
    expectedTermId: null,
    confirmationRequired: true,
    reviewStatus: CLINICAL_VOCABULARY_REVIEW_STATUS,
  },
  {
    id: "ambiguous-unwell-phrase",
    category: "complaints",
    input: "I feel unwell",
    expectedTermId: null,
    confirmationRequired: true,
    reviewStatus: CLINICAL_VOCABULARY_REVIEW_STATUS,
  },
];

function normalizeTerm(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolveClinicalTerm(category, input) {
  const options = CLINICAL_VOCABULARY[category];
  if (!Array.isArray(options) || typeof input !== "string") return null;

  const normalizedInput = normalizeTerm(input);
  if (!normalizedInput) return null;

  const matches = options.filter((option) =>
    [option.label, ...(option.aliases || [])].some(
      (term) => normalizeTerm(term) === normalizedInput,
    ),
  );
  return matches.length === 1 ? matches[0] : null;
}
