import type { Member, Unit } from "./training.ts";

export type PlayStatus = "draft" | "published";
export type PlayPoint = { x: number; y: number };
export type PlayerElement = {
  id: string;
  kind: "player";
  label: string;
  x: number;
  y: number;
  side: "offense" | "defense";
};
export type RouteElement = {
  id: string;
  kind: "route";
  fromPlayerId: string;
  points: PlayPoint[];
  color: string;
};
export type PlayElement = PlayerElement | RouteElement;
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
  for (const element of input.elements) {
    if (element.kind === "player") {
      if (!element.label.trim() || !validPoint(element)) {
        throw new Error("Revise os jogadores posicionados no campo.");
      }
    } else if (
      !element.fromPlayerId ||
      element.points.length < 2 ||
      !element.points.every(validPoint)
    ) {
      throw new Error("Cada rota precisa ter pelo menos dois pontos válidos.");
    }
  }
  return {
    ...input,
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
          color: "#93d36a",
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
