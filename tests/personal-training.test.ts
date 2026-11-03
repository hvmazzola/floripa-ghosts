import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addPersonalTrainingComment,
  createPersonalTraining,
  deletePersonalTrainingComment,
  togglePersonalTrainingReaction,
  updatePersonalTrainingComment,
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

test("cada pessoa mantém uma reação por treino, pode trocar e desfazer", () => {
  const roster = seedMembers();
  const training = createPersonalTraining(input, roster[0], roster);
  const reacted = togglePersonalTrainingReaction(training, "athlete-1", "🔥");
  assert.deepEqual(reacted.reactions["🔥"], ["athlete-1"]);

  const changed = togglePersonalTrainingReaction(reacted, "athlete-1", "👏");
  assert.deepEqual(changed.reactions["🔥"], []);
  assert.deepEqual(changed.reactions["👏"], ["athlete-1"]);

  const undone = togglePersonalTrainingReaction(changed, "athlete-1", "👏");
  assert.deepEqual(undone.reactions["🔥"], []);
  assert.deepEqual(undone.reactions["👏"], []);
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

test("comentários respeitam autoria e admins podem moderar", () => {
  const roster = seedMembers();
  const training = createPersonalTraining(input, roster[0], roster);
  const withComment = addPersonalTrainingComment(training, "Bom trabalho!", roster[2]);
  const comment = withComment.comments[0];
  assert.equal(comment.authorId, "athlete-1");
  assert.equal(comment.message, "Bom trabalho!");

  const edited = updatePersonalTrainingComment(
    withComment,
    comment.id,
    "Bom trabalho, segue firme!",
    roster[2],
  );
  assert.equal(edited.comments[0].message, "Bom trabalho, segue firme!");
  assert.throws(() =>
    updatePersonalTrainingComment(edited, comment.id, "Não pode", roster[0]),
  );

  const moderated = deletePersonalTrainingComment(edited, comment.id, roster[1]);
  assert.equal(moderated.comments.length, 0);
});
