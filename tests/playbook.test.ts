import assert from "node:assert/strict";
import { test } from "node:test";

import {
  appendRoutePoint,
  addManCoverage,
  branchRoute,
  canDeletePlay,
  createPlay,
  getVisiblePlays,
  getFieldHashmarkYards,
  getVisibleFieldMarkers,
  movePlayerAndAttachedRoutes,
  moveZone,
  moveRoutePoint,
  normalizePlayList,
  playFieldGeometry,
  seedPlays,
  snapPlayerPosition,
  simplifyCurvePoints,
  startRoute,
  startZone,
  nextPlayerLabel,
  redoPlayFieldHistory,
  undoPlayFieldHistory,
  updatePlayerSide,
  updatePlayer,
  updateRouteColor,
  updatePlay,
  type PlayerElement,
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
      style: "broken" as const,
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

test("novo jogador usa o menor número disponível no campo", () => {
  const elements: PlayerElement[] = [
    { id: "zero", kind: "player", label: "0", x: 20, y: 70, side: "offense" },
    { id: "two", kind: "player", label: "2", x: 50, y: 70, side: "offense" },
    { id: "word", kind: "player", label: "QB", x: 80, y: 70, side: "offense" },
  ];

  assert.equal(nextPlayerLabel(elements), "1");
  assert.equal(
    nextPlayerLabel(elements.filter((element) => element.label !== "0")),
    "0",
  );
});

test("modo end zone oculta as marcações de 10 e 15 jardas", () => {
  assert.deepEqual(getVisibleFieldMarkers(false), [15, 10, 7, 0]);
  assert.deepEqual(getVisibleFieldMarkers(true), [7, 0]);
});

test("histórico do campo refaz somente a última alteração desfeita", () => {
  const before = input.elements;
  const after = startRoute(before, "qb", { x: 58, y: 44 }, "curve");
  const undone = undoPlayFieldHistory(after, [before], []);

  assert.deepEqual(undone.elements, before);
  assert.deepEqual(undone.future, [after]);

  const redone = redoPlayFieldHistory(undone.elements, undone.past, undone.future);
  assert.deepEqual(redone.elements, after);
  assert.deepEqual(redone.past, [before]);
  assert.deepEqual(redone.future, []);
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

test("desenho de rota ancora no jogador, recebe pontos e acompanha o deslocamento", () => {
  const elements = [
    {
      id: "qb",
      kind: "player" as const,
      label: "QB",
      x: 40,
      y: 70,
      side: "offense" as const,
    },
  ];
  const withRoute = startRoute(elements, "qb", { x: 54, y: 50 }, "broken");
  const route = withRoute[1];

  assert.equal(route.kind, "route");
  if (route.kind !== "route") return;
  assert.deepEqual(route.points, [
    { x: 40, y: 70 },
    { x: 54, y: 50 },
  ]);
  assert.equal(route.style, "broken");

  const withBreak = appendRoutePoint(withRoute, route.id, { x: 70, y: 50 });
  const moved = movePlayerAndAttachedRoutes(withBreak, "qb", 50, 60);
  const movedRoute = moved.find((element) => element.id === route.id);

  assert.deepEqual(movedRoute && movedRoute.kind === "route" ? movedRoute.points : [], [
    { x: 50, y: 60 },
    { x: 64, y: 40 },
    { x: 80, y: 40 },
  ]);
});

test("jogador permite rótulo e cor próprios dentro da jogada", () => {
  const updated = updatePlayer(input.elements, "qb", {
    label: "C",
    color: "#facc15",
  });
  const player = updated.find(
    (element): element is PlayerElement =>
      element.kind === "player" && element.id === "qb",
  );

  assert.deepEqual(player, { ...input.elements[0], label: "C", color: "#facc15" });
});

test("jogador pode remover a cor própria e voltar ao padrão", () => {
  const colored = updatePlayer(input.elements, "qb", { color: "#dc2626" });
  const restored = updatePlayer(colored, "qb", { color: undefined });
  const player = restored.find(
    (element): element is PlayerElement =>
      element.kind === "player" && element.id === "qb",
  );

  assert.deepEqual(player, input.elements[0]);
});

test("cor da rota selecionada pode ser alterada sem afetar as demais", () => {
  const elements = startRoute(input.elements, "qb", { x: 68, y: 48 }, "broken");
  const route = elements.at(-1);
  assert.equal(route?.kind, "route");
  if (!route || route.kind !== "route") return;

  const updated = updateRouteColor(elements, route.id, "#b91c1c");
  const updatedRoute = updated.at(-1);
  assert.equal(updatedRoute?.kind, "route");
  assert.equal(updatedRoute?.kind === "route" && updatedRoute.color, "#b91c1c");
  assert.deepEqual(updated[0], input.elements[0]);
});

test("zona remove rota e marcações homem a homem do mesmo defensor", () => {
  const withRoute = startRoute(input.elements, "qb", { x: 62, y: 44 }, "broken");
  const withDefender = updatePlayerSide(withRoute, "qb", "defense");
  const withZone = startZone(withDefender, "qb", { x: 50, y: 32 });

  assert.equal(
    withZone.some((element) => element.kind === "route"),
    false,
  );
  const withMan = addManCoverage(
    [
      ...updatePlayerSide(input.elements, "qb", "defense"),
      {
        id: "wr-1",
        kind: "player" as const,
        label: "WR",
        x: 22,
        y: 60,
        side: "offense" as const,
      },
    ],
    "qb",
    "wr-1",
  );
  const zoneAfterMan = startZone(withMan, "qb", { x: 50, y: 32 });
  assert.equal(
    zoneAfterMan.some((element) => element.kind === "man-coverage"),
    false,
  );
  const zone = withZone.find((element) => element.kind === "zone");
  assert.deepEqual(zone && zone.kind === "zone" ? zone.center : null, { x: 50, y: 32 });
});

test("marcação homem a homem permite múltiplos alvos e substitui a zona", () => {
  const withDefender = [
    ...updatePlayerSide(input.elements, "qb", "defense"),
    {
      id: "wr-1",
      kind: "player" as const,
      label: "WR",
      x: 22,
      y: 60,
      side: "offense" as const,
    },
    {
      id: "wr-2",
      kind: "player" as const,
      label: "WR",
      x: 78,
      y: 60,
      side: "offense" as const,
    },
  ];
  const withZone = startZone(withDefender, "qb", { x: 50, y: 32 });
  const firstMark = addManCoverage(withZone, "qb", "wr-1");
  const multipleMarks = addManCoverage(firstMark, "qb", "wr-2");

  assert.equal(
    multipleMarks.some((element) => element.kind === "zone"),
    false,
  );
  assert.equal(
    multipleMarks.filter((element) => element.kind === "man-coverage").length,
    2,
  );
});

test("mudar o lado do jogador preserva os desenhos existentes", () => {
  const withRoute = startRoute(input.elements, "qb", { x: 62, y: 44 }, "broken");
  const changed = updatePlayerSide(withRoute, "qb", "defense");

  assert.equal(
    changed.some((element) => element.kind === "route"),
    true,
  );
  assert.equal(
    changed.find((element) => element.kind === "player" && element.id === "qb")?.kind,
    "player",
  );
  assert.equal(
    changed.find(
      (element) =>
        element.kind === "player" && element.id === "qb" && element.side === "defense",
    )?.id,
    "qb",
  );
});

test("zona pode ser reposicionada sem alterar o defensor", () => {
  const withDefender = updatePlayerSide(input.elements, "qb", "defense");
  const withZone = startZone(withDefender, "qb", { x: 50, y: 32 });
  const zone = withZone.find((element) => element.kind === "zone");
  if (!zone || zone.kind !== "zone") return;

  const moved = moveZone(withZone, zone.id, { x: 56, y: 28 });
  const movedZone = moved.find(
    (element): element is Extract<typeof element, { kind: "zone" }> =>
      element.kind === "zone" && element.id === zone.id,
  );
  assert.deepEqual(movedZone?.center ?? null, { x: 56, y: 28 });
});

test("uma rota pode gerar ramificação em qualquer ponto sem apagar o traçado original", () => {
  const elements = startRoute(
    [
      {
        id: "qb",
        kind: "player" as const,
        label: "QB",
        x: 40,
        y: 70,
        side: "offense" as const,
      },
    ],
    "qb",
    { x: 58, y: 46 },
    "broken",
  );
  const original = elements[1];
  assert.equal(original.kind, "route");
  if (original.kind !== "route") return;

  const withBranch = branchRoute(
    elements,
    original.id,
    original.points[1],
    { x: 28, y: 44 },
    "curve",
  );
  const branch = withBranch.at(-1);

  assert.equal(withBranch.length, 3);
  assert.deepEqual(original.points, [
    { x: 40, y: 70 },
    { x: 58, y: 46 },
  ]);
  assert.deepEqual(branch && branch.kind === "route" ? branch.points : [], [
    { x: 58, y: 46 },
    { x: 28, y: 44 },
  ]);
});

test("traço livre de curva preserva início e fim com poucas âncoras editáveis", () => {
  const points = Array.from({ length: 15 }, (_, index) => ({
    x: 20 + index * 4,
    y: 70 - index * 2,
  }));
  const anchors = simplifyCurvePoints(points);

  assert.equal(anchors[0].x, 20);
  assert.equal(anchors.at(-1)?.x, 76);
  assert.ok(anchors.length <= 6);
});

test("um ponto selecionado de rota pode ser movido sem alterar os demais", () => {
  const elements = startRoute(
    [
      {
        id: "qb",
        kind: "player" as const,
        label: "QB",
        x: 40,
        y: 70,
        side: "offense" as const,
      },
    ],
    "qb",
    { x: 58, y: 46 },
    "broken",
  );
  const route = elements[1];
  assert.equal(route.kind, "route");
  if (route.kind !== "route") return;

  const moved = moveRoutePoint(elements, route.id, 1, { x: 64, y: 38 });
  const updated = moved[1];
  assert.deepEqual(updated.kind === "route" ? updated.points : [], [
    { x: 40, y: 70 },
    { x: 64, y: 38 },
  ]);
});

test("rota guarda estilo de linha e alerta", () => {
  const elements = [
    {
      id: "qb",
      kind: "player" as const,
      label: "QB",
      x: 40,
      y: 70,
      side: "offense" as const,
    },
    {
      id: "wr",
      kind: "player" as const,
      label: "WR",
      x: 68,
      y: 64,
      side: "offense" as const,
    },
  ];
  const withRoute = startRoute(elements, "qb", { x: 58, y: 46 }, "curve", {
    lineStyle: "dashed",
    color: "#e05252",
  });
  const route = withRoute.at(-1);
  assert.equal(route?.kind === "route" ? route.lineStyle : undefined, "dashed");
  assert.equal(route?.kind === "route" ? route.color : undefined, "#e05252");
});

test("jogadas de exemplo usam a paleta azul para as rotas", () => {
  const routeColors = seedPlays().flatMap((play) =>
    play.elements.flatMap((element) =>
      element.kind === "route" ? [element.color] : [],
    ),
  );

  assert.equal(routeColors.includes("#93d36a"), false);
});

test("rotas verdes legadas são migradas para azul ao carregar o playbook", () => {
  const [play] = seedPlays();
  const legacy = {
    ...play,
    elements: play.elements.map((element) =>
      element.kind === "route" ? { ...element, color: "#93d36a" } : element,
    ),
  };

  const [normalized] = normalizePlayList([legacy]);
  assert.equal(
    normalized.elements.every(
      (element) => element.kind !== "route" || element.color !== "#93d36a",
    ),
    true,
  );
});

test("movimentação encaixa jogador na scrimmage antes dos demais alinhamentos", () => {
  const elements = [
    {
      id: "qb",
      kind: "player" as const,
      label: "QB",
      x: 40,
      y: 70,
      side: "offense" as const,
    },
    {
      id: "wr",
      kind: "player" as const,
      label: "WR",
      x: 68,
      y: 64,
      side: "offense" as const,
    },
  ];

  assert.deepEqual(snapPlayerPosition(elements, "qb", { x: 66.8, y: 70.8 }), {
    point: { x: 68, y: 70 },
    guides: ["scrimmage", "vertical"],
  });
  assert.deepEqual(snapPlayerPosition(elements, "qb", { x: 66.8, y: 64.8 }), {
    point: { x: 68, y: 64 },
    guides: ["horizontal", "vertical"],
  });
  assert.deepEqual(snapPlayerPosition(elements, "qb", { x: 50.8, y: 40 }), {
    point: { x: 50, y: 40 },
    guides: ["midfield"],
  });
});

test("geometria do campo privilegia espaço de rota e reserva a end zone ofensiva", () => {
  assert.deepEqual(playFieldGeometry, {
    height: 700,
    scrimmageY: 70,
    midfieldX: 50,
    routeYards: 20,
    endZoneYards: 10,
  });
});

test("hashmarks centrais cobrem cada jarda entre a linha de scrimmage e o topo", () => {
  assert.deepEqual(
    getFieldHashmarkYards(),
    [1, 2, 3, 4, 5, 6, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19],
  );
});
