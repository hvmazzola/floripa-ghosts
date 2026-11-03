import type { Member } from "./training.ts";

export const personalTrainingCategories = [
  "gym",
  "run",
  "crossfit",
  "recovery",
  "other",
] as const;

export type PersonalTrainingCategory = (typeof personalTrainingCategories)[number];
export type PersonalTrainingReaction = "💪" | "🔥" | "👏";
export const personalTrainingMediaTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
] as const;
export const maxPersonalTrainingMediaCount = 5;
export const maxPersonalTrainingMediaSizeBytes = 10 * 1024 * 1024;

export type PersonalTrainingMediaType = (typeof personalTrainingMediaTypes)[number];
export type PersonalTrainingMedia = {
  id: string;
  name: string;
  mimeType: PersonalTrainingMediaType;
  dataUrl: string;
  sizeBytes: number;
};
export type PersonalTraining = {
  id: string;
  authorId: string;
  category: PersonalTrainingCategory;
  title: string;
  occurredAt: string;
  durationMinutes: number;
  perceivedLoad: number;
  notes: string;
  media: PersonalTrainingMedia[];
  reactions: Record<PersonalTrainingReaction, string[]>;
};
export type PersonalTrainingInput = Omit<
  PersonalTraining,
  "id" | "authorId" | "reactions"
>;

export const personalTrainingCategoryLabel: Record<PersonalTrainingCategory, string> = {
  gym: "Academia",
  run: "Corrida",
  crossfit: "Crossfit",
  recovery: "Recuperação",
  other: "Outro",
};

function emptyReactions(): PersonalTraining["reactions"] {
  return { "💪": [], "🔥": [], "👏": [] };
}

export function validatePersonalTrainingMedia(
  media: PersonalTrainingMedia[],
): PersonalTrainingMedia[] {
  if (media.length > maxPersonalTrainingMediaCount) {
    throw new Error("Adicione no máximo cinco mídias por treino.");
  }
  return media.map((item) => {
    if (!personalTrainingMediaTypes.includes(item.mimeType)) {
      throw new Error("Envie imagens JPG, PNG, WebP ou vídeos MP4, WebM.");
    }
    if (!Number.isInteger(item.sizeBytes) || item.sizeBytes < 1) {
      throw new Error("Não foi possível validar o tamanho da mídia.");
    }
    if (item.sizeBytes > maxPersonalTrainingMediaSizeBytes) {
      throw new Error("Cada mídia pode ter no máximo 10 MB.");
    }
    if (
      !item.name.trim() ||
      !item.dataUrl.startsWith(`data:${item.mimeType};base64,`)
    ) {
      throw new Error("Não foi possível processar a mídia enviada.");
    }
    return { ...item, name: item.name.trim() };
  });
}

function normalizeInput(input: PersonalTrainingInput) {
  if (!personalTrainingCategories.includes(input.category)) {
    throw new Error("Escolha um tipo de treino pessoal.");
  }
  if (!input.title.trim()) throw new Error("Informe o nome do treino.");
  if (!Number.isFinite(Date.parse(input.occurredAt))) {
    throw new Error("Informe uma data e horário válidos.");
  }
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 1) {
    throw new Error("Informe uma duração válida.");
  }
  if (
    !Number.isInteger(input.perceivedLoad) ||
    input.perceivedLoad < 1 ||
    input.perceivedLoad > 10
  ) {
    throw new Error("A carga percebida deve ficar entre 1 e 10.");
  }
  return {
    ...input,
    title: input.title.trim(),
    notes: input.notes.trim(),
    media: validatePersonalTrainingMedia(input.media),
  };
}

export function canRegisterPersonalTraining(member: Member) {
  return member.status === "active" && member.roles.includes("athlete");
}

export function createPersonalTraining(
  input: PersonalTrainingInput,
  author: Member,
  roster: Member[],
): PersonalTraining {
  if (!canRegisterPersonalTraining(author)) {
    throw new Error("Somente atletas ativos podem registrar treinos pessoais.");
  }
  if (!roster.some((member) => member.id === author.id)) {
    throw new Error("Integrante não encontrado no elenco.");
  }
  return {
    id: crypto.randomUUID(),
    authorId: author.id,
    ...normalizeInput(input),
    reactions: emptyReactions(),
  };
}

export function updatePersonalTraining(
  training: PersonalTraining,
  input: PersonalTrainingInput,
  actor: Member,
): PersonalTraining {
  if (training.authorId !== actor.id || !canRegisterPersonalTraining(actor)) {
    throw new Error("Você só pode editar seus próprios treinos pessoais.");
  }
  return { ...training, ...normalizeInput(input) };
}

export function togglePersonalTrainingReaction(
  training: PersonalTraining,
  memberId: string,
  reaction: PersonalTrainingReaction,
): PersonalTraining {
  const memberIds = training.reactions[reaction] ?? [];
  return {
    ...training,
    reactions: {
      ...training.reactions,
      [reaction]: memberIds.includes(memberId)
        ? memberIds.filter((id) => id !== memberId)
        : [...memberIds, memberId],
    },
  };
}

export function seedPersonalTrainings(): PersonalTraining[] {
  return [
    {
      id: "personal-mazzola-run",
      authorId: "mazzola",
      category: "run",
      title: "Corrida leve de recuperação",
      occurredAt: "2026-11-01T08:00:00-03:00",
      durationMinutes: 35,
      perceivedLoad: 4,
      notes: "Ritmo confortável para soltar as pernas.",
      media: [],
      reactions: { "💪": ["athlete-1"], "🔥": [], "👏": ["coach-demo"] },
    },
    {
      id: "personal-athlete-1-gym",
      authorId: "athlete-1",
      category: "gym",
      title: "Força e estabilidade",
      occurredAt: "2026-10-31T18:30:00-03:00",
      durationMinutes: 60,
      perceivedLoad: 7,
      notes: "Agachamento, posterior e core.",
      media: [],
      reactions: { "💪": ["mazzola"], "🔥": ["coach-demo"], "👏": [] },
    },
  ];
}

export function isPersonalTrainingList(value: unknown): value is PersonalTraining[] {
  return (
    Array.isArray(value) &&
    value.every(
      (training) =>
        training &&
        typeof training.id === "string" &&
        typeof training.authorId === "string" &&
        personalTrainingCategories.includes(training.category) &&
        typeof training.title === "string" &&
        typeof training.occurredAt === "string" &&
        typeof training.durationMinutes === "number" &&
        typeof training.perceivedLoad === "number" &&
        typeof training.notes === "string" &&
        (training.media === undefined ||
          (Array.isArray(training.media) &&
            training.media.every((item: unknown) => {
              if (!item || typeof item !== "object") return false;
              const media = item as Record<string, unknown>;
              return (
                typeof media.id === "string" &&
                typeof media.name === "string" &&
                typeof media.mimeType === "string" &&
                personalTrainingMediaTypes.includes(
                  media.mimeType as PersonalTrainingMediaType,
                ) &&
                typeof media.dataUrl === "string" &&
                typeof media.sizeBytes === "number"
              );
            }))) &&
        training.reactions &&
        ["💪", "🔥", "👏"].every(
          (reaction) =>
            Array.isArray(training.reactions[reaction]) &&
            training.reactions[reaction].every(
              (memberId: unknown) => typeof memberId === "string",
            ),
        ),
    )
  );
}
