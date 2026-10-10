"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  PostContextMenu,
  type PostContextMenuState,
} from "@/components/post-context-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { VideoEmbed } from "@/components/video-embed";
import type { TeamPost, TeamPostInput } from "@/domain/communication";
import type { Member, Role } from "@/domain/training";
import { getContextMenuPosition } from "@/lib/context-menu";
import { getVideoEmbedUrl } from "@/lib/video-embed";
export function CommunicationView({
  posts,
  roster,
  role,
  actor,
  isAdmin,
  isPostRead,
  onCreate,
  onDelete,
  onHide,
  onOpen,
  onToggleRead,
}: {
  posts: TeamPost[];
  roster: Member[];
  role: Role;
  actor: Member;
  isAdmin: boolean;
  isPostRead: (post: TeamPost) => boolean;
  onCreate: (input: TeamPostInput) => void;
  onDelete: (postId: string) => void;
  onHide: (post: TeamPost) => void;
  onOpen: (post: TeamPost) => void;
  onToggleRead: (post: TeamPost, read: boolean) => void;
}) {
  const athletes = roster.filter(
    (member) => member.status === "active" && member.roles.includes("athlete"),
  );
  const [kind, setKind] = useState<TeamPost["kind"]>("announcement");
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState(false);
  const [contextMenu, setContextMenu] = useState<PostContextMenuState | null>(null);
  const visiblePosts = posts
    .filter(
      (post) =>
        role === "coach" ||
        post.kind === "announcement" ||
        post.recipientIds.includes(actor.id),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const recipientLabel = (ids: string[]) => {
    const names = ids
      .map((id) => roster.find((member) => member.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    if (!names.length) return "atletas";
    return names.length === 1 ? names[0] : `${names[0]} e mais ${names.length - 1}`;
  };
  const toggleRecipient = (memberId: string) => {
    setRecipientIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };
  const toggleUnit = (unit: "Ataque" | "Defesa") => {
    const unitMemberIds = athletes
      .filter((athlete) => athlete.units.includes(unit))
      .map((athlete) => athlete.id);
    setRecipientIds((current) =>
      unitMemberIds.every((id) => current.includes(id))
        ? current.filter((id) => !unitMemberIds.includes(id))
        : [...new Set([...current, ...unitMemberIds])],
    );
  };
  const isUnitSelected = (unit: "Ataque" | "Defesa") => {
    const unitMemberIds = athletes
      .filter((athlete) => athlete.units.includes(unit))
      .map((athlete) => athlete.id);
    return (
      unitMemberIds.length > 0 && unitMemberIds.every((id) => recipientIds.includes(id))
    );
  };
  const submit = () => {
    const hasInvalidVideo =
      kind === "feedback" && Boolean(videoUrl.trim()) && !getVideoEmbedUrl(videoUrl);
    setVideoError(hasInvalidVideo);
    if (hasInvalidVideo) return;
    onCreate({
      kind,
      recipientIds: kind === "feedback" ? recipientIds : [],
      title,
      message,
      videoUrl,
    });
    setTitle("");
    setMessage("");
    setVideoUrl("");
    setVideoError(false);
    setRecipientIds([]);
    setKind("announcement");
  };

  return (
    <section
      className={`grid gap-5 ${role === "coach" ? "xl:grid-cols-[.82fr_1.35fr]" : "grid-cols-1"}`}
      aria-label="Comunicação do time"
    >
      {role === "coach" && (
        <section className="panel h-fit p-6">
          <p className="eyebrow">COMUNICAÇÃO DO TIME</p>
          <h2 className="mt-1 text-xl font-bold">Publicar mensagem</h2>
          <div className="editor-form mt-5 grid gap-4 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[#303740] [&_input]:bg-[#0b0d10] [&_input]:p-3 [&_input]:text-[#f2f5f7] [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[#303740] [&_select]:bg-[#0b0d10] [&_select]:p-3 [&_select]:text-[#f2f5f7] [&_textarea]:min-h-28 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#303740] [&_textarea]:bg-[#0b0d10] [&_textarea]:p-3 [&_textarea]:text-[#f2f5f7]">
            <label>
              <span className="field-label">Tipo</span>
              <select
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value as TeamPost["kind"]);
                  setVideoUrl("");
                  setVideoError(false);
                  setRecipientIds([]);
                }}
              >
                <option value="announcement">Aviso para o time</option>
                <option value="feedback">Feedback para atletas</option>
              </select>
            </label>
            {kind === "feedback" && (
              <fieldset className="selection-panel">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <legend className="field-label">
                    Destinatários{" "}
                    <span
                      className={`required-mark ${recipientIds.length ? "!text-[#8b949e]" : ""}`}
                    >
                      *
                    </span>
                  </legend>
                  <div className="flex gap-2">
                    {(["Ataque", "Defesa"] as const).map((unit) => (
                      <button
                        className={`secondary !px-3 !py-1.5 !text-xs ${isUnitSelected(unit) ? "!border-[#2eb8ff] !bg-[#173447] !text-[#dff6ff]" : ""}`}
                        key={unit}
                        type="button"
                        onClick={() => toggleUnit(unit)}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-xs text-[#91a1ad]">
                  Selecione atletas ou uma unidade inteira.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {athletes.map((athlete) => (
                    <label
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#303740] bg-[#0b0d10] px-3 py-2 text-sm text-[#e7f0f4] transition-colors hover:border-[#3d7795]"
                      key={athlete.id}
                    >
                      <Checkbox
                        checked={recipientIds.includes(athlete.id)}
                        onCheckedChange={() => toggleRecipient(athlete.id)}
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {athlete.name}
                      </span>
                      <span className="text-xs text-[#91a1ad]">{athlete.units}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <label>
              <span className="field-label">Título</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Ajuste para o próximo treino"
              />
            </label>
            <label>
              <span className="field-label">Mensagem</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Escreva a orientação para o time ou para o atleta."
              />
            </label>
            {kind === "feedback" && (
              <label>
                <span className="field-label">
                  Vídeo de referência
                  {videoError && (
                    <span className="error"> Use um link do YouTube ou Vimeo</span>
                  )}
                </span>
                <input
                  className={
                    videoError ? "!border-red-500 !ring-1 !ring-red-500/60" : undefined
                  }
                  type="url"
                  value={videoUrl}
                  onChange={(event) => {
                    setVideoUrl(event.target.value);
                    setVideoError(false);
                  }}
                  placeholder="YouTube ou Vimeo"
                />
              </label>
            )}
            <button
              className="primary justify-self-start"
              disabled={
                !title.trim() ||
                !message.trim() ||
                (kind === "feedback" && !recipientIds.length)
              }
              onClick={submit}
            >
              Publicar
            </button>
          </div>
        </section>
      )}
      <section className="panel">
        <div className="panel-header border-b border-[#29313a]">
          <div>
            <p className="eyebrow">MURAL</p>
            <h2 className="mt-1">Atualizações recentes</h2>
          </div>
          <span className="pill">{visiblePosts.length} mensagens</span>
        </div>
        <div className="divide-y divide-[#29313a] px-6">
          {visiblePosts.map((post) => (
            <article
              className={`relative cursor-pointer border-l-2 py-5 pl-4 transition-colors hover:bg-[#151b21] ${post.kind === "feedback" ? "border-[#58cfff]" : "border-[#65717a]"}`}
              key={post.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpen(post)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onOpen(post);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({
                  post,
                  ...getContextMenuPosition(
                    { x: event.clientX, y: event.clientY },
                    { width: window.innerWidth, height: window.innerHeight },
                  ),
                });
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${post.kind === "feedback" ? "bg-[#183447] text-[#8fe0ff]" : "bg-[#252b31] text-[#cbd5dc]"}`}
                  >
                    {post.kind === "feedback"
                      ? `Feedback para ${recipientLabel(post.recipientIds)}`
                      : "Aviso do time"}
                  </span>
                  <div className="mt-3 flex items-center gap-2">
                    {!isPostRead(post) && (
                      <i
                        className="size-2 shrink-0 rounded-full bg-[#58cfff]"
                        aria-label="Não lida"
                      />
                    )}
                    <h3 className="text-base font-bold">{post.title}</h3>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    className="mr-8 inline-flex items-center justify-center rounded-md border border-[#B91C1C] bg-[#B91C1C] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#991B1B]"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(post.id);
                    }}
                  >
                    Excluir
                  </button>
                )}
              </div>
              <button
                className="absolute right-3 top-3 grid size-7 place-items-center rounded-full text-lg leading-none text-[#92a2ad] transition-colors hover:bg-[#28323a] hover:text-white"
                aria-label={`Excluir ${post.title} da minha lista`}
                title="Excluir da minha lista"
                onClick={(event) => {
                  event.stopPropagation();
                  onHide(post);
                }}
              >
                ×
              </button>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#c5d0d7]">
                {post.message}
              </p>
              <p className="mt-3 text-xs font-medium text-[#8fa1ad]">
                {post.kind === "feedback"
                  ? `Orientação para ${recipientLabel(post.recipientIds)}.`
                  : "Comunicado disponível para todo o time."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="text-xs font-semibold text-[#83dfff] hover:text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(post);
                  }}
                >
                  {post.kind === "feedback" ? "Abrir feedback" : "Ler aviso"}
                </button>
              </div>
              <small className="mt-3 block text-xs text-[#82909b]">
                Comissão técnica ·{" "}
                {format(parseISO(post.createdAt), "dd MMM · HH:mm", { locale: ptBR })}
              </small>
            </article>
          ))}
          {!visiblePosts.length && (
            <p className="py-10 text-sm text-[#91a1ad]">
              Nenhuma mensagem para mostrar agora.
            </p>
          )}
        </div>
        <PostContextMenu
          menu={contextMenu}
          isRead={contextMenu ? isPostRead(contextMenu.post) : false}
          onClose={() => setContextMenu(null)}
          onToggleRead={onToggleRead}
          onHide={onHide}
        />
      </section>
    </section>
  );
}

export function PostModal({
  post,
  roster,
  isRead,
  onClose,
  onHide,
  onMarkUnread,
}: {
  post: TeamPost;
  roster: Member[];
  isRead: boolean;
  onClose: () => void;
  onHide: () => void;
  onMarkUnread: () => void;
}) {
  const recipients = post.recipientIds
    .map((id) => roster.find((member) => member.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const recipientLabel =
    recipients.length === 1
      ? recipients[0]
      : recipients.length
        ? `${recipients[0]} e mais ${recipients.length - 1}`
        : "atletas";
  return (
    <div
      className="overlay !fixed !inset-0 !z-50 !flex !items-center !justify-center bg-black/80 p-5 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="w-[min(620px,calc(100vw-40px))] rounded-2xl border border-[#313943] bg-[#111419] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-modal-title"
      >
        <div className="flex items-start justify-between gap-5 border-b border-[#283039] px-7 py-6 max-sm:px-5">
          <div>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-bold ${post.kind === "feedback" ? "bg-[#183447] text-[#8fe0ff]" : "bg-[#252b31] text-[#cbd5dc]"}`}
            >
              {post.kind === "feedback"
                ? `Feedback para ${recipientLabel}`
                : "Aviso do time"}
            </span>
            <h2 className="mt-4 text-xl font-bold" id="post-modal-title">
              {post.title}
            </h2>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-[#303740] bg-[#20262c] p-0 text-2xl text-[#dbe4ea] transition-colors hover:bg-[#2a3945] hover:text-[#83dfff]"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="px-7 py-6 max-sm:px-5">
          <p className="whitespace-pre-wrap text-sm leading-7 text-[#d4dde3]">
            {post.message}
          </p>
          {post.kind === "feedback" && post.videoUrl && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8fe0ff]">
                Vídeo de referência
              </p>
              <VideoEmbed
                url={post.videoUrl}
                title={`Vídeo de referência: ${post.title}`}
              />
            </div>
          )}
          <p className="mt-6 text-xs text-[#82909b]">
            Comissão técnica ·{" "}
            {format(parseISO(post.createdAt), "dd MMMM yyyy · HH:mm", { locale: ptBR })}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-[#283039] pt-5">
            {isRead && (
              <button
                className="text-xs font-semibold text-[#83dfff] hover:text-white"
                onClick={onMarkUnread}
              >
                Marcar como não lida
              </button>
            )}
            <button
              className="text-xs font-semibold text-[#aebbc4] hover:text-white"
              onClick={onHide}
            >
              Excluir da minha lista
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
