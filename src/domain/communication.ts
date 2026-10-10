import type { Member, Role } from "./training";
import { getVideoEmbedUrl } from "../lib/video-embed.ts";

export type TeamPostKind = "announcement" | "feedback";

export type TeamPost = {
  id: string;
  kind: TeamPostKind;
  authorId: string;
  recipientIds: string[];
  title: string;
  message: string;
  videoUrl: string;
  createdAt: string;
  readByMemberIds: string[];
  hiddenByMemberIds: string[];
};

export type TeamPostInput = Pick<
  TeamPost,
  "kind" | "recipientIds" | "title" | "message" | "videoUrl"
>;

export function canDeleteTeamPost(isAdmin: boolean) {
  return isAdmin;
}

export function isTeamPostReadByMember(post: TeamPost, memberId: string) {
  return post.readByMemberIds.includes(memberId);
}

export function markTeamPostRead(
  post: TeamPost,
  memberId: string,
  read: boolean,
): TeamPost {
  const readByMemberIds = read
    ? [...new Set([...post.readByMemberIds, memberId])]
    : post.readByMemberIds.filter((id) => id !== memberId);
  return { ...post, readByMemberIds };
}

export function markAllTeamPostsRead(posts: TeamPost[], memberId: string) {
  return posts.map((post) => markTeamPostRead(post, memberId, true));
}

export function hideTeamPostForMember(post: TeamPost, memberId: string): TeamPost {
  return {
    ...post,
    videoUrl: typeof post.videoUrl === "string" ? post.videoUrl : "",
    hiddenByMemberIds: [...new Set([...post.hiddenByMemberIds, memberId])],
  };
}

export function normalizeTeamPosts(posts: TeamPost[]): TeamPost[] {
  return posts.map((post) => ({
    ...post,
    recipientIds: Array.isArray(post.recipientIds)
      ? [...new Set(post.recipientIds.filter((id) => typeof id === "string"))]
      : typeof (post as TeamPost & { recipientId?: unknown }).recipientId === "string"
        ? [(post as TeamPost & { recipientId: string }).recipientId]
        : [],
    readByMemberIds: Array.isArray(post.readByMemberIds) ? post.readByMemberIds : [],
    hiddenByMemberIds: Array.isArray(post.hiddenByMemberIds)
      ? post.hiddenByMemberIds
      : [],
  }));
}

export function seedTeamPosts(): TeamPost[] {
  return [
    {
      id: "post-welcome",
      kind: "announcement",
      authorId: "coach-demo",
      recipientIds: [],
      title: "Bem-vindos à central do Ghosts",
      message:
        "Acompanhem a agenda, confirmem presença e registrem o que aconteceu em cada treino.",
      videoUrl: "",
      createdAt: "2026-09-18T18:00:00.000Z",
      readByMemberIds: [],
      hiddenByMemberIds: [],
    },
    {
      id: "post-feedback-mazzola",
      kind: "feedback",
      authorId: "coach-demo",
      recipientIds: ["mazzola"],
      title: "Feedback de treino",
      message:
        "Boa leitura de jogo no último encontro. Vamos manter a atenção nos cortes curtos.",
      videoUrl: "",
      createdAt: "2026-09-19T18:00:00.000Z",
      readByMemberIds: [],
      hiddenByMemberIds: [],
    },
  ];
}

export function createTeamPost(
  input: TeamPostInput,
  role: Role,
  authorId: string,
  roster: Member[],
): TeamPost {
  if (role !== "coach") throw new Error("Somente coaches podem publicar mensagens.");
  if (!input.title.trim() || !input.message.trim()) {
    throw new Error("Título e mensagem são obrigatórios.");
  }
  const recipientIds = [...new Set(input.recipientIds)];
  if (
    input.kind === "feedback" &&
    (!recipientIds.length ||
      recipientIds.some(
        (id) =>
          !roster.some(
            (member) =>
              member.id === id &&
              member.roles.includes("athlete") &&
              member.status === "active",
          ),
      ))
  ) {
    throw new Error("Escolha um atleta ativo para receber o feedback.");
  }
  if (
    input.kind === "feedback" &&
    input.videoUrl.trim() &&
    !getVideoEmbedUrl(input.videoUrl)
  ) {
    throw new Error("Use um link do YouTube ou Vimeo para o vídeo de referência.");
  }
  return {
    id: `post-${crypto.randomUUID()}`,
    kind: input.kind,
    authorId,
    recipientIds: input.kind === "feedback" ? recipientIds : [],
    title: input.title.trim(),
    message: input.message.trim(),
    videoUrl: input.kind === "feedback" ? input.videoUrl.trim() : "",
    createdAt: new Date().toISOString(),
    readByMemberIds: [],
    hiddenByMemberIds: [],
  };
}

export function isTeamPostList(value: unknown): value is TeamPost[] {
  return (
    Array.isArray(value) &&
    value.every(
      (post) =>
        post &&
        typeof post.id === "string" &&
        (post.kind === "announcement" || post.kind === "feedback") &&
        typeof post.authorId === "string" &&
        (post.recipientIds === undefined ||
          (Array.isArray(post.recipientIds) &&
            post.recipientIds.every((id: unknown) => typeof id === "string"))) &&
        ((post as TeamPost & { recipientId?: unknown }).recipientId === undefined ||
          (post as TeamPost & { recipientId?: unknown }).recipientId === null ||
          typeof (post as TeamPost & { recipientId?: unknown }).recipientId ===
            "string") &&
        typeof post.title === "string" &&
        typeof post.message === "string" &&
        (post.videoUrl === undefined || typeof post.videoUrl === "string") &&
        typeof post.createdAt === "string" &&
        (post.readByMemberIds === undefined ||
          (Array.isArray(post.readByMemberIds) &&
            post.readByMemberIds.every((id: unknown) => typeof id === "string"))) &&
        (post.hiddenByMemberIds === undefined ||
          (Array.isArray(post.hiddenByMemberIds) &&
            post.hiddenByMemberIds.every((id: unknown) => typeof id === "string"))),
    )
  );
}
