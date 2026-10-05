"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { TeamPost, TeamPostInput } from "@/domain/communication";
import type { Member, Role } from "@/domain/training";
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
  const [recipientId, setRecipientId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const visiblePosts = posts
    .filter(
      (post) =>
        role === "coach" ||
        post.kind === "announcement" ||
        post.recipientId === actor.id,
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const recipientName = (recipient: string | null) =>
    roster.find((member) => member.id === recipient)?.name ?? "Atleta";
  const submit = () => {
    onCreate({
      kind,
      recipientId: kind === "feedback" ? recipientId : null,
      title,
      message,
    });
    setTitle("");
    setMessage("");
    setRecipientId("");
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
                onChange={(event) => setKind(event.target.value as TeamPost["kind"])}
              >
                <option value="announcement">Aviso para o time</option>
                <option value="feedback">Feedback individual</option>
              </select>
            </label>
            {kind === "feedback" && (
              <label>
                <span className="field-label">Atleta</span>
                <select
                  value={recipientId}
                  onChange={(event) => setRecipientId(event.target.value)}
                >
                  <option value="">Selecione um atleta</option>
                  {athletes.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.name}
                    </option>
                  ))}
                </select>
              </label>
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
            <button
              className="primary justify-self-start"
              disabled={
                !title.trim() ||
                !message.trim() ||
                (kind === "feedback" && !recipientId)
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
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${post.kind === "feedback" ? "bg-[#183447] text-[#8fe0ff]" : "bg-[#252b31] text-[#cbd5dc]"}`}
                  >
                    {post.kind === "feedback"
                      ? `Feedback para ${recipientName(post.recipientId)}`
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
                    className="inline-flex items-center justify-center rounded-md border border-[#B91C1C] bg-[#B91C1C] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#991B1B]"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(post.id);
                    }}
                  >
                    Excluir
                  </button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#c5d0d7]">
                {post.message}
              </p>
              <p className="mt-3 text-xs font-medium text-[#8fa1ad]">
                {post.kind === "feedback"
                  ? `Orientação individual para ${recipientName(post.recipientId)}.`
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
                <button
                  className="text-xs font-semibold text-[#aebbc4] hover:text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleRead(post, !isPostRead(post));
                  }}
                >
                  {isPostRead(post) ? "Marcar como não lida" : "Marcar como lida"}
                </button>
                <button
                  className="text-xs font-semibold text-[#aebbc4] hover:text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    onHide(post);
                  }}
                >
                  Ocultar para mim
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
  const recipient = post.recipientId
    ? roster.find((member) => member.id === post.recipientId)?.name
    : null;
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
                ? `Feedback para ${recipient ?? "atleta"}`
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
              Ocultar para mim
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
