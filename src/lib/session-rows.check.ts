// Variantes : chaque ligne prend l'historique de SON exercice, jamais celui de l'exercice prévu pour
// une série faite ailleurs. Lancer avec : npx tsx src/lib/session-rows.check.ts
import assert from "node:assert/strict";
import { buildSessionRows, variantOfSlot, type SessionRowGroup } from "./session-rows";

const perf = (weight: number) => [
  { sessionDate: new Date("2026-09-12"), sets: [1, 2, 3].map((n) => ({ setNumber: n, actualWeight: weight, actualReps: 12, note: null })) },
];
const history = { hack: perf(80), presse: perf(140) };
const set = (n: number, exerciseId: string) => ({
  id: `s${n}`, exerciseId, setNumber: n, actualWeight: 80, actualReps: 12, completed: true, note: null,
});
const group = (sets: SessionRowGroup["sets"], variantId: string | null): SessionRowGroup => ({
  exerciseId: "hack", exerciseOrder: 0, exercise: { name: "Hack squat", muscle: ["Jambes"], targetSets: 3 }, sets, variantId,
});

// Exercice prévu, sans variante : tout vient de son historique.
let rows = buildSessionRows(group([], null), history, 0);
assert.deepEqual(rows.map((r) => [r.exerciseId, r.previous?.actualWeight]), [["hack", 80], ["hack", 80], ["hack", 80]]);

// Variante choisie après 1 série : la série faite garde l'exercice prévu, les suivantes la presse.
rows = buildSessionRows(group([set(1, "hack")], "presse"), history, 0);
assert.deepEqual(rows.map((r) => [r.exerciseId, r.previous?.actualWeight]), [["hack", 80], ["presse", 140], ["presse", 140]]);
assert.equal(rows[1].recap[0].set?.actualWeight, 140);

// Variante déduite des séries (rendu serveur) : la dernière série décide.
assert.equal(variantOfSlot([set(1, "hack"), set(2, "presse")], "hack"), "presse");
assert.equal(variantOfSlot([set(1, "presse")], "hack", "hack"), null); // retour explicite à l'exercice prévu
assert.equal(variantOfSlot([], "hack"), null);

console.log("buildSessionRows (variantes) : OK");
