import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canDeletePlay,
  createPlay,
  getVisiblePlays,
  updatePlay,
} from "../src/domain/playbook.ts";
import { seedMembers } from "../src/domain/training.ts";

const input = {
  title: "Flood direita",
  unit: "attack" as const,
  description: "Leitura de níveis contra cobertura profunda.",
  tags: ["passe", "red zone"],
  status: "draft" as const,
  elements: [
    {
      id: "qb",
      kind: "player" as const,
      label: "QB",
      x: 48,
      y: 72,
      side: "offense" as const,
    },
    {
      id: "route-1",
      kind: "route" as const,
      fromPlayerId: "qb",
      points: [
        { x: 48, y: 68 },
        { x: 70, y: 35 },
      ],
      color: "#58cfff",
    },
  ],
};

test("somente coaches ativos criam e editam jogadas", () => {
  const roster = seedMembers();
  const play = createPlay(input, roster[1]);
  assert.equal(play.authorId, "coach-demo");
  assert.throws(() => createPlay(input, roster[0]));

  const updated = updatePlay(play, { ...input, title: "Flood esquerda" }, roster[1]);
  assert.equal(updated.title, "Flood esquerda");
  assert.throws(() => updatePlay(play, input, roster[0]));
});

test("atletas consultam somente jogadas publicadas e exclusão é administrativa", () => {
  const roster = seedMembers();
  const draft = createPlay(input, roster[1]);
  const published = { ...draft, id: "published", status: "published" as const };

  assert.deepEqual(
    getVisiblePlays([draft, published], roster[0]).map((play) => play.id),
    ["published"],
  );
  assert.equal(canDeletePlay(roster[1]), true);
  assert.equal(canDeletePlay(roster[0]), false);
});
