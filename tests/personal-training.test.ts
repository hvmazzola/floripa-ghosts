import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createPersonalTraining,
  togglePersonalTrainingReaction,
  validatePersonalTrainingMedia,
} from "../src/domain/personal-training.ts";
import { seedMembers } from "../src/domain/training.ts";

const input = {
  category: "gym" as const,
  title: "Força de membros inferiores",
  occurredAt: "2026-11-02T08:00:00-03:00",
  durationMinutes: 60,
  perceivedLoad: 7,
  notes: "Treino de pernas e estabilidade.",
  media: [],
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

test("mídias pessoais aceitam apenas formatos suportados, até cinco arquivos de 10 MB", () => {
  const media = validatePersonalTrainingMedia([
    {
      id: "media-1",
      name: "corrida.webp",
      mimeType: "image/webp",
      dataUrl: "data:image/webp;base64,YWJj",
      sizeBytes: 3,
    },
  ]);
  assert.equal(media[0].name, "corrida.webp");

  assert.throws(() =>
    validatePersonalTrainingMedia([
      {
        id: "media-2",
        name: "arquivo.pdf",
        mimeType: "application/pdf" as never,
        dataUrl: "data:application/pdf;base64,YWJj",
        sizeBytes: 3,
      },
    ]),
  );
  assert.throws(() =>
    validatePersonalTrainingMedia(
      Array.from({ length: 6 }, (_, index) => ({
        id: `media-${index}`,
        name: `foto-${index}.jpg`,
        mimeType: "image/jpeg",
        dataUrl: "data:image/jpeg;base64,YWJj",
        sizeBytes: 3,
      })),
    ),
  );
});
