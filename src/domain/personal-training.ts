import type { Member } from "./training.ts";

export const personalTrainingCategories = [
  "gym",
  "run",
  "crossfit",
  "recovery",
  "other",
] as const;

export type PersonalTrainingCategory = (typeof personalTrainingCategories)[number];
export type PersonalTrainingReaction = string;
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
export type PersonalTrainingComment = {
  id: string;
  authorId: string;
  message: string;
  createdAt: string;
  updatedAt: string | null;
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
  reactions: Record<string, string[]>;
  comments: PersonalTrainingComment[];
};
export type PersonalTrainingInput = Omit<
  PersonalTraining,
  "id" | "authorId" | "reactions" | "comments"
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

function assertCommentMessage(message: string) {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) throw new Error("Escreva um comentário antes de publicar.");
  if (normalizedMessage.length > 800) {
    throw new Error("O comentário pode ter no máximo 800 caracteres.");
  }
  return normalizedMessage;
}

function canComment(member: Member) {
  return member.status === "active";
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
    comments: [],
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
  const normalizedReaction = reaction.trim();
  if (!normalizedReaction || normalizedReaction.length > 16) {
    throw new Error("Escolha uma reação válida.");
  }
  const isCurrentReaction = training.reactions[normalizedReaction]?.includes(memberId);
  const reactions = Object.fromEntries(
    Object.entries(training.reactions).map(([emoji, memberIds]) => [
      emoji,
      memberIds.filter((id) => id !== memberId),
    ]),
  );
  if (!isCurrentReaction) {
    reactions[normalizedReaction] = [
      ...(reactions[normalizedReaction] ?? []),
      memberId,
    ];
  }
  return {
    ...training,
    reactions,
  };
}

export function addPersonalTrainingComment(
  training: PersonalTraining,
  message: string,
  actor: Member,
): PersonalTraining {
  if (!canComment(actor)) throw new Error("Somente integrantes ativos podem comentar.");
  const now = new Date().toISOString();
  return {
    ...training,
    comments: [
      ...(training.comments ?? []),
      {
        id: crypto.randomUUID(),
        authorId: actor.id,
        message: assertCommentMessage(message),
        createdAt: now,
        updatedAt: null,
      },
    ],
  };
}

export function updatePersonalTrainingComment(
  training: PersonalTraining,
  commentId: string,
  message: string,
  actor: Member,
): PersonalTraining {
  if (!canComment(actor)) throw new Error("Somente integrantes ativos podem comentar.");
  const comment = (training.comments ?? []).find((item) => item.id === commentId);
  if (!comment) throw new Error("Comentário não encontrado.");
  if (comment.authorId !== actor.id) {
    throw new Error("Você só pode editar seus próprios comentários.");
  }
  return {
    ...training,
    comments: (training.comments ?? []).map((item) =>
      item.id === commentId
        ? {
            ...item,
            message: assertCommentMessage(message),
            updatedAt: new Date().toISOString(),
          }
        : item,
    ),
  };
}

export function deletePersonalTrainingComment(
  training: PersonalTraining,
  commentId: string,
  actor: Member,
): PersonalTraining {
  if (!canComment(actor)) throw new Error("Somente integrantes ativos podem comentar.");
  const comment = (training.comments ?? []).find((item) => item.id === commentId);
  if (!comment) throw new Error("Comentário não encontrado.");
  if (comment.authorId !== actor.id && !actor.isAdmin) {
    throw new Error("Você só pode excluir seus próprios comentários.");
  }
  return {
    ...training,
    comments: (training.comments ?? []).filter((item) => item.id !== commentId),
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
      comments: [],
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
      comments: [],
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
        typeof training.reactions === "object" &&
        Object.values(training.reactions).every(
          (memberIds) =>
            Array.isArray(memberIds) &&
            memberIds.every((memberId: unknown) => typeof memberId === "string"),
        ) &&
        (training.comments === undefined ||
          (Array.isArray(training.comments) &&
            training.comments.every((comment: unknown) => {
              if (!comment || typeof comment !== "object") return false;
              const item = comment as Record<string, unknown>;
              return (
                typeof item.id === "string" &&
                typeof item.authorId === "string" &&
                typeof item.message === "string" &&
                typeof item.createdAt === "string" &&
                (item.updatedAt === null || typeof item.updatedAt === "string")
              );
            }))),
    )
  );
}
