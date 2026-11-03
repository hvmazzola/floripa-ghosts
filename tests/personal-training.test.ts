import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createPersonalTraining,
  togglePersonalTrainingReaction,
} from "../src/domain/personal-training.ts";
import { seedMembers } from "../src/domain/training.ts";

const input = {
  category: "gym" as const,
  title: "Força de membros inferiores",
  occurredAt: "2026-11-02T08:00:00-03:00",
  durationMinutes: 60,
  perceivedLoad: 7,
  notes: "Treino de pernas e estabilidade.",
};

test("somente integrantes com atribuição de atleta registram treino pessoal", () => {
  const roster = seedMembers();
  const training = createPersonalTraining(input, roster[0], roster);
  assert.equal(training.authorId, "mazzola");
  assert.throws(() => createPersonalTraining(input, roster[1], roster));
});

test("reações são individuais e podem ser desfeitas", () => {
  const roster = seedMembers();
  const training = createPersonalTraining(input, roster[0], roster);
  const reacted = togglePersonalTrainingReaction(training, "athlete-1", "🔥");
  assert.deepEqual(reacted.reactions["🔥"], ["athlete-1"]);

  const undone = togglePersonalTrainingReaction(reacted, "athlete-1", "🔥");
  assert.deepEqual(undone.reactions["🔥"], []);
});
