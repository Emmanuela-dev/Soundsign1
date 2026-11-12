import assert from "node:assert/strict";
import test from "node:test";
import {
  CLINICAL_RECOGNITION_CASES,
  CLINICAL_VOCABULARY,
  CLINICAL_VOCABULARY_REVIEW_STATUS,
  resolveClinicalTerm,
} from "./clinicalVocabulary.js";

const categories = Object.entries(CLINICAL_VOCABULARY)
  .filter(([, value]) => Array.isArray(value));

test("vocabulary options have unique IDs and labels per category", () => {
  for (const [category, options] of categories) {
    assert.ok(options.length > 0, `${category} should not be empty`);
    assert.equal(new Set(options.map(({ id }) => id)).size, options.length, `${category} IDs`);
    assert.equal(new Set(options.map(({ label }) => label)).size, options.length, `${category} labels`);
    for (const option of options) {
      assert.ok(option.id, `${category} option should have an ID`);
      assert.ok(option.label, `${category} option should have a label`);
      assert.ok(Array.isArray(option.aliases), `${category}.${option.id} should define aliases`);
    }
  }
});

test("recognition scenarios resolve only exact canonical terms or aliases", () => {
  for (const scenario of CLINICAL_RECOGNITION_CASES) {
    const result = resolveClinicalTerm(scenario.category, scenario.input);
    assert.equal(result?.id ?? null, scenario.expectedTermId, scenario.id);
    assert.equal(scenario.confirmationRequired, true, `${scenario.id} requires patient confirmation`);
    assert.equal(scenario.reviewStatus, CLINICAL_VOCABULARY_REVIEW_STATUS, `${scenario.id} review status`);
  }
});

test("term resolution is case- and punctuation-insensitive but does not infer negated phrases", () => {
  assert.equal(resolveClinicalTerm("complaints", "  MY CHEST HURTS! ")?.id, "chest_pain");
  assert.equal(resolveClinicalTerm("complaints", "I do not have chest pain"), null);
  assert.equal(resolveClinicalTerm("unknown_category", "chest pain"), null);
});
