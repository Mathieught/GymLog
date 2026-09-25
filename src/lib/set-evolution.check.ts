// Vérification des règles de setEvolution sur les 9 combinaisons poids × reps, plus le cas sans
// référence. Lancer avec : npx tsx src/lib/set-evolution.check.ts
import assert from "node:assert/strict";
import { setEvolution } from "./set-evolution";

const tones = (reps: number, weight: number, prevReps: number, prevWeight: number) =>
  setEvolution({ reps, weight }, { reps: prevReps, weight: prevWeight }).map((b) => b.tone);

assert.deepEqual(tones(10, 62.5, 10, 60), ["up"]); // 1. poids ↑
assert.deepEqual(tones(10, 60, 8, 60), ["up"]); // 2. reps ↑
assert.deepEqual(tones(10, 62.5, 8, 60), ["up", "up"]); // 3. poids ↑ reps ↑
assert.deepEqual(tones(6, 62.5, 8, 60), ["up", "neutral"]); // 4. poids ↑ reps ↓ (baisse normale)
assert.deepEqual(tones(8, 60, 8, 60), ["neutral"]); // 5. identique
assert.deepEqual(tones(6, 60, 8, 60), ["down"]); // 6. reps ↓
assert.deepEqual(tones(10, 57.5, 8, 60), ["down", "up"]); // 7. poids ↓ reps ↑
assert.deepEqual(tones(6, 57.5, 8, 60), ["down", "down"]); // 8. poids ↓ reps ↓
assert.deepEqual(tones(8, 57.5, 8, 60), ["down"]); // 9. poids ↓
assert.deepEqual(setEvolution({ reps: 8, weight: 60 }, undefined), [{ tone: "neutral", label: "Nouvelle" }]);
assert.deepEqual(setEvolution({ reps: 8, weight: 60 }, { reps: 8, weight: 60 }), [{ tone: "neutral", label: "=" }]);
assert.deepEqual(setEvolution({ reps: 25, weight: 0 }, { reps: 20, weight: 0 }, true), [{ tone: "up", label: "+5 min" }]);

console.log("setEvolution : OK");
