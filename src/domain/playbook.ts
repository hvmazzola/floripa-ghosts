import type { Member, Unit } from "./training.ts";

export type PlayStatus = "draft" | "published";
export type PlayPoint = { x: number; y: number };
export type RouteStyle = "broken" | "curve";
export type RouteLineStyle = "solid" | "dashed" | "motion";
export type PlaySnapGuide = "scrimmage" | "midfield" | "horizontal" | "vertical";
export const playFieldGeometry = {
  height: 700,
  scrimmageY: 70,
  midfieldX: 50,
  routeYards: 20,
  endZoneYards: 10,
} as const;

export function getFieldHashmarkYards() {
  const markedYards = new Set([0, 7, 10, 15, playFieldGeometry.routeYards]);

  return Array.from(
    { length: playFieldGeometry.routeYards + 1 },
    (_, yard) => yard,
  ).filter((yard) => !markedYards.has(yard));
}

export function getVisibleFieldMarkers(endZoneMode: boolean) {
  return endZoneMode ? [7, 0] : [15, 10, 7, 0];
}
export type PlayerElement = {
  id: string;
  kind: "player";
  label: string;
  x: number;
  y: number;
  side: "offense" | "defense";
  color?: string;
};
export type RouteElement = {
  id: string;
  kind: "route";
  fromPlayerId: string;
  points: PlayPoint[];
  color: string;
  style?: RouteStyle;
  lineStyle?: RouteLineStyle;
  curveControls?: { in: PlayPoint; out: PlayPoint }[];
};
export type ZoneElement = {
  id: string;
  kind: "zone";
  defenderId: string;
  center: PlayPoint;
  radiusX: number;
  radiusY: number;
};
export type ManCoverageElement = {
  id: string;
  kind: "man-coverage";
  defenderId: string;
  attackerId: string;
};
export type PlayElement =
  PlayerElement | RouteElement | ZoneElement | ManCoverageElement;

export function nextPlayerLabel(elements: PlayElement[]) {
  const usedNumbers = new Set(
    elements.flatMap((element) => {
      if (element.kind !== "player" || !/^\d+$/.test(element.label)) return [];
      return [Number(element.label)];
    }),
  );
  let label = 0;
  while (usedNumbers.has(label)) label += 1;
  return String(label);
}

export type PlayFieldHistoryTransition = {
  elements: PlayElement[];
  past: PlayElement[][];
  future: PlayElement[][];
};

export function undoPlayFieldHistory(
  elements: PlayElement[],
  past: PlayElement[][],
  future: PlayElement[][],
): PlayFieldHistoryTransition {
  const previous = past.at(-1);
  if (!previous) return { elements, past, future };

  return {
    elements: previous,
    past: past.slice(0, -1),
    future: [...future, elements].slice(-50),
  };
}

export function redoPlayFieldHistory(
  elements: PlayElement[],
  past: PlayElement[][],
  future: PlayElement[][],
): PlayFieldHistoryTransition {
  const next = future.at(-1);
  if (!next) return { elements, past, future };

  return {
    elements: next,
    past: [...past, elements].slice(-50),
    future: future.slice(0, -1),
  };
}
export type Play = {
  id: string;
  title: string;
  unit: Exclude<Unit, "both">;
  description: string;
  tags: string[];
  status: PlayStatus;
  authorId: string;
  updatedAt: string;
  elements: PlayElement[];
};
export type PlayInput = Omit<Play, "id" | "authorId" | "updatedAt">;

export const playUnitLabel: Record<Play["unit"], string> = {
  attack: "Ataque",
  defense: "Defesa",
};

function canManagePlays(member: Member) {
  return member.status === "active" && member.roles.includes("coach");
}

function validPoint(point: PlayPoint) {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= 0 &&
    point.x <= 100 &&
    point.y >= 0 &&
    point.y <= 100
  );
}

function clampPoint(point: PlayPoint): PlayPoint {
  return {
    x: Math.max(0, Math.min(100, point.x)),
    y: Math.max(0, Math.min(100, point.y)),
  };
}

export function startRoute(
  elements: PlayElement[],
  fromPlayerId: string,
  destination: PlayPoint,
  style: RouteStyle,
  options: { lineStyle?: RouteLineStyle; color?: string } = {},
): PlayElement[] {
  const player = elements.find(
    (element): element is PlayerElement =>
      element.kind === "player" && element.id === fromPlayerId,
  );
  if (!player || player.side !== "offense") return elements;
  return [
    ...elements.filter(
      (element) =>
        !(
          (element.kind === "zone" || element.kind === "man-coverage") &&
          element.defenderId === fromPlayerId
        ),
    ),
    {
      id: crypto.randomUUID(),
      kind: "route",
      fromPlayerId,
      points: [{ x: player.x, y: player.y }, clampPoint(destination)],
      color: options.color ?? "#58cfff",
      style,
      lineStyle: options.lineStyle ?? "solid",
    },
  ];
}

export function branchRoute(
  elements: PlayElement[],
  sourceRouteId: string,
  origin: PlayPoint,
  destination: PlayPoint,
  style: RouteStyle,
  options: { lineStyle?: RouteLineStyle; color?: string } = {},
): PlayElement[] {
  const source = elements.find(
    (element): element is RouteElement =>
      element.kind === "route" && element.id === sourceRouteId,
  );
  if (!source) return elements;
  return [
    ...elements,
    {
      id: crypto.randomUUID(),
      kind: "route",
      fromPlayerId: source.fromPlayerId,
      points: [clampPoint(origin), clampPoint(destination)],
      color: options.color ?? "#58cfff",
      style,
      lineStyle: options.lineStyle ?? "solid",
    },
  ];
}

export function appendRoutePoint(
  elements: PlayElement[],
  routeId: string,
  point: PlayPoint,
): PlayElement[] {
  return elements.map((element) =>
    element.kind === "route" && element.id === routeId
      ? { ...element, points: [...element.points, clampPoint(point)] }
      : element,
  );
}

export function simplifyCurvePoints(points: PlayPoint[], maxAnchors = 6): PlayPoint[] {
  if (points.length <= maxAnchors) return points;
  return Array.from({ length: maxAnchors }, (_, index) => {
    const sourceIndex = Math.round((index * (points.length - 1)) / (maxAnchors - 1));
    return points[sourceIndex];
  });
}

export function simplifyCurveRoute(
  elements: PlayElement[],
  routeId: string,
): PlayElement[] {
  return elements.map((element) =>
    element.kind === "route" && element.id === routeId && element.style === "curve"
      ? {
          ...element,
          points: simplifyCurvePoints(element.points),
          curveControls: undefined,
        }
      : element,
  );
}

export function movePlayerAndAttachedRoutes(
  elements: PlayElement[],
  playerId: string,
  x: number,
  y: number,
): PlayElement[] {
  const player = elements.find(
    (element): element is PlayerElement =>
      element.kind === "player" && element.id === playerId,
  );
  if (!player) return elements;
  const destination = clampPoint({ x, y });
  const offset = { x: destination.x - player.x, y: destination.y - player.y };
  return elements.map((element) => {
    if (element.kind === "player" && element.id === playerId) {
      return { ...element, ...destination };
    }
    if (element.kind === "route" && element.fromPlayerId === playerId) {
      return {
        ...element,
        points: element.points.map((point) =>
          clampPoint({ x: point.x + offset.x, y: point.y + offset.y }),
        ),
        curveControls: element.curveControls?.map((control) => ({
          in: clampPoint({ x: control.in.x + offset.x, y: control.in.y + offset.y }),
          out: clampPoint({ x: control.out.x + offset.x, y: control.out.y + offset.y }),
        })),
      };
    }
    return element;
  });
}

export function updatePlayer(
  elements: PlayElement[],
  playerId: string,
  updates: Partial<Pick<PlayerElement, "label" | "color">>,
): PlayElement[] {
  return elements.map((element) => {
    if (element.kind !== "player" || element.id !== playerId) return element;
    const player = { ...element, ...updates };
    if (Object.hasOwn(updates, "color") && updates.color === undefined) {
      const { color: _color, ...withoutColor } = player;
      return withoutColor;
    }
    return player;
  });
}

export function updatePlayerSide(
  elements: PlayElement[],
  playerId: string,
  side: PlayerElement["side"],
): PlayElement[] {
  return elements.map((element) =>
    element.kind === "player" && element.id === playerId
      ? { ...element, side }
      : element,
  );
}

function playerById(elements: PlayElement[], playerId: string) {
  return elements.find(
    (element): element is PlayerElement =>
      element.kind === "player" && element.id === playerId,
  );
}

function removeDefenderDrawings(elements: PlayElement[], defenderId: string) {
  return elements.filter(
    (element) =>
      !(
        (element.kind === "route" && element.fromPlayerId === defenderId) ||
        ((element.kind === "zone" || element.kind === "man-coverage") &&
          element.defenderId === defenderId)
      ),
  );
}

export function startZone(
  elements: PlayElement[],
  defenderId: string,
  center: PlayPoint,
): PlayElement[] {
  const defender = playerById(elements, defenderId);
  if (!defender || defender.side !== "defense") return elements;

  return [
    ...removeDefenderDrawings(elements, defenderId),
    {
      id: crypto.randomUUID(),
      kind: "zone",
      defenderId,
      center: clampPoint(center),
      radiusX: 12,
      radiusY: 9,
    },
  ];
}

export function addManCoverage(
  elements: PlayElement[],
  defenderId: string,
  attackerId: string,
): PlayElement[] {
  const defender = playerById(elements, defenderId);
  const attacker = playerById(elements, attackerId);
  if (
    !defender ||
    !attacker ||
    defender.side !== "defense" ||
    attacker.side !== "offense"
  ) {
    return elements;
  }

  return [
    ...elements.filter(
      (element) =>
        !(
          (element.kind === "route" && element.fromPlayerId === defenderId) ||
          (element.kind === "zone" && element.defenderId === defenderId) ||
          (element.kind === "man-coverage" &&
            element.defenderId === defenderId &&
            element.attackerId === attackerId)
        ),
    ),
    {
      id: crypto.randomUUID(),
      kind: "man-coverage",
      defenderId,
      attackerId,
    },
  ];
}

export function moveZone(
  elements: PlayElement[],
  zoneId: string,
  center: PlayPoint,
): PlayElement[] {
  return elements.map((element) =>
    element.kind === "zone" && element.id === zoneId
      ? { ...element, center: clampPoint(center) }
      : element,
  );
}

export function resizeZone(
  elements: PlayElement[],
  zoneId: string,
  radiusX: number,
  radiusY: number,
): PlayElement[] {
  return elements.map((element) =>
    element.kind === "zone" && element.id === zoneId
      ? { ...element, radiusX: Math.max(4, radiusX), radiusY: Math.max(4, radiusY) }
      : element,
  );
}

export function updateRouteColor(
  elements: PlayElement[],
  routeId: string,
  color: string,
): PlayElement[] {
  return elements.map((element) =>
    element.kind === "route" && element.id === routeId
      ? { ...element, color }
      : element,
  );
}

export function moveRoutePoint(
  elements: PlayElement[],
  routeId: string,
  pointIndex: number,
  point: PlayPoint,
): PlayElement[] {
  return elements.map((element) =>
    element.kind === "route" && element.id === routeId
      ? {
          ...element,
          points: element.points.map((current, index) =>
            index === pointIndex ? clampPoint(point) : current,
          ),
        }
      : element,
  );
}

export function snapPlayerPosition(
  elements: PlayElement[],
  playerId: string,
  point: PlayPoint,
  tolerance = 2,
): { point: PlayPoint; guides: PlaySnapGuide[] } {
  const others = elements.filter(
    (element): element is PlayerElement =>
      element.kind === "player" && element.id !== playerId,
  );
  let snapped = clampPoint(point);
  const guides: PlaySnapGuide[] = [];
  if (Math.abs(snapped.y - playFieldGeometry.scrimmageY) <= tolerance) {
    snapped = { ...snapped, y: playFieldGeometry.scrimmageY };
    guides.push("scrimmage");
  }
  if (!guides.includes("scrimmage")) {
    const horizontal = others.find(
      (player) => Math.abs(player.y - snapped.y) <= tolerance,
    );
    if (horizontal) {
      snapped = { ...snapped, y: horizontal.y };
      guides.push("horizontal");
    }
  }
  if (Math.abs(snapped.x - playFieldGeometry.midfieldX) <= tolerance) {
    snapped = { ...snapped, x: playFieldGeometry.midfieldX };
    guides.push("midfield");
  } else {
    const vertical = others.find(
      (player) => Math.abs(player.x - snapped.x) <= tolerance,
    );
    if (vertical) {
      snapped = { ...snapped, x: vertical.x };
      guides.push("vertical");
    }
  }
  return { point: snapped, guides };
}

function normalizeInput(input: PlayInput): PlayInput {
  if (!input.title.trim()) throw new Error("Informe o nome da jogada.");
  if (!(["attack", "defense"] as const).includes(input.unit)) {
    throw new Error("Escolha a unidade da jogada.");
  }
  if (!(["draft", "published"] as const).includes(input.status)) {
    throw new Error("Escolha um status válido.");
  }
  if (!input.elements.some((element) => element.kind === "player")) {
    throw new Error("Inclua pelo menos um jogador no desenho.");
  }
  const elements = input.elements.map((element) =>
    element.kind === "route" && !element.style
      ? { ...element, style: "broken" as const }
      : element,
  );
  for (const element of elements) {
    if (element.kind === "player") {
      if (!element.label.trim() || !validPoint(element)) {
        throw new Error("Revise os jogadores posicionados no campo.");
      }
    } else if (
      element.kind === "route" &&
      (!element.fromPlayerId ||
        element.points.length < 2 ||
        !element.points.every(validPoint) ||
        !(["broken", "curve"] as const).includes(element.style ?? "broken"))
    ) {
      throw new Error("Cada rota precisa ter pelo menos dois pontos válidos.");
    } else if (
      element.kind === "zone" &&
      (!validPoint(element.center) || element.radiusX < 4 || element.radiusY < 4)
    ) {
      throw new Error("Revise a área de zona desenhada.");
    } else if (
      element.kind === "man-coverage" &&
      (!element.defenderId || !element.attackerId)
    ) {
      throw new Error("Revise a marcação homem a homem.");
    }
  }
  return {
    ...input,
    elements,
    title: input.title.trim(),
    description: input.description.trim(),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
  };
}

export function createPlay(input: PlayInput, actor: Member): Play {
  if (!canManagePlays(actor)) {
    throw new Error("Somente coaches ativos podem criar jogadas.");
  }
  return {
    id: crypto.randomUUID(),
    authorId: actor.id,
    updatedAt: new Date().toISOString(),
    ...normalizeInput(input),
  };
}

export function updatePlay(play: Play, input: PlayInput, actor: Member): Play {
  if (!canManagePlays(actor)) {
    throw new Error("Somente coaches ativos podem editar jogadas.");
  }
  return { ...play, ...normalizeInput(input), updatedAt: new Date().toISOString() };
}

export function canDeletePlay(member: Member) {
  return member.status === "active" && member.isAdmin;
}

export function getVisiblePlays(plays: Play[], actor: Member) {
  return actor.roles.includes("coach")
    ? plays
    : plays.filter((play) => play.status === "published");
}

export function seedPlays(): Play[] {
  return [
    {
      id: "play-flood-right",
      title: "Flood direita",
      unit: "attack",
      description: "Conceito de três níveis para atacar a lateral direita.",
      tags: ["passe", "red zone"],
      status: "published",
      authorId: "coach-demo",
      updatedAt: "2026-11-03T15:00:00-03:00",
      elements: [
        { id: "qb", kind: "player", label: "QB", x: 49, y: 76, side: "offense" },
        { id: "c", kind: "player", label: "C", x: 49, y: 64, side: "offense" },
        { id: "wr-1", kind: "player", label: "WR", x: 22, y: 67, side: "offense" },
        { id: "wr-2", kind: "player", label: "WR", x: 77, y: 67, side: "offense" },
        { id: "r", kind: "player", label: "R", x: 62, y: 76, side: "offense" },
        {
          id: "route-flood",
          kind: "route",
          fromPlayerId: "wr-2",
          points: [
            { x: 77, y: 63 },
            { x: 86, y: 43 },
            { x: 86, y: 20 },
          ],
          color: "#58cfff",
          style: "broken",
        },
        {
          id: "route-under",
          kind: "route",
          fromPlayerId: "r",
          points: [
            { x: 62, y: 72 },
            { x: 72, y: 58 },
            { x: 82, y: 58 },
          ],
          color: "#58cfff",
          style: "broken",
        },
      ],
    },
    {
      id: "play-zone-match",
      title: "Match Cover 2",
      unit: "defense",
      description: "Ajuste de zona com leitura do primeiro corte interno.",
      tags: ["zona", "cobertura"],
      status: "draft",
      authorId: "coach-demo",
      updatedAt: "2026-11-02T18:20:00-03:00",
      elements: [
        { id: "d-1", kind: "player", label: "DB", x: 25, y: 35, side: "defense" },
        { id: "d-2", kind: "player", label: "S", x: 50, y: 22, side: "defense" },
        { id: "d-3", kind: "player", label: "DB", x: 75, y: 35, side: "defense" },
        { id: "d-4", kind: "player", label: "BL", x: 42, y: 57, side: "defense" },
        { id: "d-5", kind: "player", label: "BL", x: 58, y: 57, side: "defense" },
      ],
    },
  ];
}

export function normalizePlayList(plays: Play[]): Play[] {
  return plays.map((play) => ({
    ...play,
    elements: play.elements.map((element) =>
      element.kind === "route" && element.color === "#93d36a"
        ? { ...element, color: "#58cfff" }
        : element,
    ),
  }));
}

export function isPlayList(value: unknown): value is Play[] {
  return (
    Array.isArray(value) &&
    value.every(
      (play) =>
        play &&
        typeof play.id === "string" &&
        typeof play.authorId === "string" &&
        typeof play.title === "string" &&
        (play.unit === "attack" || play.unit === "defense") &&
        typeof play.description === "string" &&
        Array.isArray(play.tags) &&
        (play.status === "draft" || play.status === "published") &&
        typeof play.updatedAt === "string" &&
        Array.isArray(play.elements),
    )
  );
}
