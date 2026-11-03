"use client";

import { useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import dynamic from "next/dynamic";
import { Dumbbell, MessageCircle, Plus, SmilePlus } from "lucide-react";

import { RecordActionsMenu } from "@/components/record-actions-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  maxPersonalTrainingMediaCount,
  maxPersonalTrainingMediaSizeBytes,
  personalTrainingCategories,
  personalTrainingCategoryLabel,
  personalTrainingMediaTypes,
  type PersonalTraining,
  type PersonalTrainingComment,
  type PersonalTrainingInput,
  type PersonalTrainingMedia,
  type PersonalTrainingMediaType,
  type PersonalTrainingReaction,
} from "@/domain/personal-training";
import type { Member } from "@/domain/training";

const quickReactions: Array<{ value: PersonalTrainingReaction; label: string }> = [
  { value: "💪", label: "Força" },
  { value: "🔥", label: "Fogo" },
  { value: "👏", label: "Aplausos" },
  { value: "❤️", label: "Coração" },
  { value: "⚡", label: "Energia" },
];

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

function blankInput(): PersonalTrainingInput {
  return {
    category: "gym",
    title: "",
    occurredAt: new Date().toISOString().slice(0, 16),
    durationMinutes: 45,
    perceivedLoad: 5,
    notes: "",
    media: [],
  };
}

function toLocalInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function fileToPersonalTrainingMedia(file: File): Promise<PersonalTrainingMedia> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a mídia."));
    reader.onload = () =>
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type as PersonalTrainingMediaType,
        dataUrl: String(reader.result),
        sizeBytes: file.size,
      });
    reader.readAsDataURL(file);
  });
}

function PersonalTrainingEditor({
  training,
  onClose,
  onSave,
}: {
  training: PersonalTraining | null;
  onClose: () => void;
  onSave: (input: PersonalTrainingInput) => boolean;
}) {
  const [input, setInput] = useState<PersonalTrainingInput>(() =>
    training
      ? {
          category: training.category,
          title: training.title,
          occurredAt: toLocalInput(training.occurredAt),
          durationMinutes: training.durationMinutes,
          perceivedLoad: training.perceivedLoad,
          notes: training.notes,
          media: training.media ?? [],
        }
      : blankInput(),
  );
  const [submitted, setSubmitted] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const invalid = {
    title: !input.title.trim(),
    date: !Number.isFinite(Date.parse(input.occurredAt)),
    duration:
      !Number.isInteger(Number(input.durationMinutes)) || input.durationMinutes < 1,
    load:
      !Number.isInteger(Number(input.perceivedLoad)) ||
      input.perceivedLoad < 1 ||
      input.perceivedLoad > 10,
  };
  const hasInvalid = Object.values(invalid).some(Boolean);
  const invalidClass = "!border-red-500 !ring-1 !ring-red-500/60";

  const addMedia = async (files: FileList | null) => {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    if (input.media.length + selectedFiles.length > maxPersonalTrainingMediaCount) {
      setMediaError("Adicione no máximo cinco mídias por treino.");
      return;
    }
    const invalidFile = selectedFiles.find(
      (file) =>
        !personalTrainingMediaTypes.includes(file.type as PersonalTrainingMediaType) ||
        file.size > maxPersonalTrainingMediaSizeBytes,
    );
    if (invalidFile) {
      setMediaError(`“${invalidFile.name}” não é compatível ou ultrapassa 10 MB.`);
      return;
    }
    try {
      const media = await Promise.all(selectedFiles.map(fileToPersonalTrainingMedia));
      setInput((current) => ({ ...current, media: [...current.media, ...media] }));
      setMediaError("");
    } catch (error) {
      setMediaError(
        error instanceof Error ? error.message : "Não foi possível ler a mídia.",
      );
    }
  };

  return (
    <div
      className="overlay !fixed !inset-0 !z-50 !flex !items-center !justify-center bg-black/80 p-5 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="w-[min(620px,calc(100vw-40px))] rounded-2xl border border-[#313943] bg-[#111419] shadow-2xl">
        <div className="flex items-start justify-between gap-5 border-b border-[#283039] px-7 py-6 max-sm:px-5">
          <div>
            <p className="eyebrow">ROTINA PESSOAL</p>
            <h2 className="mt-1 text-xl font-bold">
              {training ? "Editar treino pessoal" : "Registrar treino pessoal"}
            </h2>
          </div>
          <button
            className="grid size-10 place-items-center rounded-full border border-[#303740] bg-[#20262c] text-2xl text-[#dbe4ea] transition-colors hover:bg-[#2a3945] hover:text-[#83dfff]"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="editor-form grid gap-4 px-7 py-6 max-sm:px-5 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[#303740] [&_input]:bg-[#0b0d10] [&_input]:p-3 [&_input]:text-[#f2f5f7] [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[#303740] [&_select]:bg-[#0b0d10] [&_select]:p-3 [&_select]:text-[#f2f5f7] [&_textarea]:min-h-28 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#303740] [&_textarea]:bg-[#0b0d10] [&_textarea]:p-3 [&_textarea]:text-[#f2f5f7]">
          <div className="form-grid">
            <label>
              <span className="field-label">Tipo</span>
              <select
                value={input.category}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    category: event.target.value as PersonalTrainingInput["category"],
                  }))
                }
              >
                {personalTrainingCategories.map((category) => (
                  <option key={category} value={category}>
                    {personalTrainingCategoryLabel[category]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">
                Nome <span className="required-mark">*</span>
                {submitted && invalid.title && (
                  <span className="error"> Campo obrigatório</span>
                )}
              </span>
              <input
                className={submitted && invalid.title ? invalidClass : undefined}
                value={input.title}
                onChange={(event) =>
                  setInput((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Ex.: Corrida de recuperação"
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              <span className="field-label">
                Data e horário <span className="required-mark">*</span>
                {submitted && invalid.date && (
                  <span className="error"> Campo obrigatório</span>
                )}
              </span>
              <input
                className={submitted && invalid.date ? invalidClass : undefined}
                type="datetime-local"
                value={input.occurredAt}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    occurredAt: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span className="field-label">
                Duração (min) <span className="required-mark">*</span>
                {submitted && invalid.duration && (
                  <span className="error"> Campo obrigatório</span>
                )}
              </span>
              <input
                className={submitted && invalid.duration ? invalidClass : undefined}
                type="number"
                min={1}
                value={input.durationMinutes}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    durationMinutes: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          <label>
            <span className="field-label">
              Carga percebida (1 a 10) <span className="required-mark">*</span>
              {submitted && invalid.load && (
                <span className="error"> Informe de 1 a 10</span>
              )}
            </span>
            <input
              className={submitted && invalid.load ? invalidClass : undefined}
              type="number"
              min={1}
              max={10}
              value={input.perceivedLoad}
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  perceivedLoad: Number(event.target.value),
                }))
              }
            />
          </label>
          <label>
            <span className="field-label">Observação</span>
            <textarea
              value={input.notes}
              onChange={(event) =>
                setInput((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Como foi o treino?"
            />
          </label>
          <div>
            <span className="field-label">Mídias do treino</span>
            <p className="mt-1 text-xs text-[#91a1ad]">
              Até 5 imagens ou vídeos curtos (JPG, PNG, WebP, MP4 ou WebM, máx. 10 MB
              cada).
            </p>
            {mediaError && <p className="error mt-1">{mediaError}</p>}
            <input
              className="mt-3 file:mr-3 file:rounded-md file:border-0 file:bg-[#173447] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#d8f5ff] hover:file:bg-[#204a62]"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              multiple
              type="file"
              onChange={(event) => {
                void addMedia(event.target.files);
                event.target.value = "";
              }}
            />
            {input.media.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {input.media.map((media) => (
                  <article
                    className="relative overflow-hidden rounded-lg border border-[#303b45] bg-[#0b0d10]"
                    key={media.id}
                  >
                    {media.mimeType.startsWith("image/") ? (
                      <img
                        alt={media.name}
                        className="aspect-video w-full object-cover"
                        src={media.dataUrl}
                      />
                    ) : (
                      <video
                        className="aspect-video w-full object-cover"
                        controls
                        src={media.dataUrl}
                      />
                    )}
                    <p className="truncate px-2 py-1.5 text-[11px] text-[#c5d0d7]">
                      {media.name}
                    </p>
                    <button
                      aria-label={`Remover ${media.name}`}
                      className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/70 text-lg text-white hover:bg-[#B91C1C]"
                      onClick={() =>
                        setInput((current) => ({
                          ...current,
                          media: current.media.filter((item) => item.id !== media.id),
                        }))
                      }
                      type="button"
                    >
                      ×
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-[#283039] pt-5">
            <button className="secondary !px-3 !py-2 !text-xs" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="primary !px-3 !py-2 !text-xs"
              onClick={() => {
                setSubmitted(true);
                if (!hasInvalid) onSave(input);
              }}
            >
              Salvar treino
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function PersonalTrainingsView({
  trainings,
  roster,
  actor,
  onCreate,
  onUpdate,
  onDelete,
  onReact,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: {
  trainings: PersonalTraining[];
  roster: Member[];
  actor: Member;
  onCreate: (input: PersonalTrainingInput) => boolean;
  onUpdate: (training: PersonalTraining, input: PersonalTrainingInput) => boolean;
  onDelete: (training: PersonalTraining) => void;
  onReact: (training: PersonalTraining, reaction: PersonalTrainingReaction) => void;
  onAddComment: (training: PersonalTraining, message: string) => boolean;
  onUpdateComment: (
    training: PersonalTraining,
    commentId: string,
    message: string,
  ) => boolean;
  onDeleteComment: (training: PersonalTraining, commentId: string) => void;
}) {
  const [editing, setEditing] = useState<PersonalTraining | null | undefined>(
    undefined,
  );
  const [pickerTrainingId, setPickerTrainingId] = useState<string | null>(null);
  const [fullPickerTrainingId, setFullPickerTrainingId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<{
    trainingId: string;
    comment: PersonalTrainingComment;
  } | null>(null);
  const [editingCommentMessage, setEditingCommentMessage] = useState("");
  const commentInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const reactionCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openReactionMenu = (trainingId: string) => {
    if (reactionCloseTimer.current) clearTimeout(reactionCloseTimer.current);
    setPickerTrainingId(trainingId);
  };
  const closeReactionMenu = () => {
    if (reactionCloseTimer.current) clearTimeout(reactionCloseTimer.current);
    reactionCloseTimer.current = setTimeout(() => {
      setPickerTrainingId(null);
      setFullPickerTrainingId(null);
    }, 120);
  };
  const canRegister = actor.status === "active" && actor.roles.includes("athlete");
  const sortedTrainings = [...trainings].sort(
    (first, second) => Date.parse(second.occurredAt) - Date.parse(first.occurredAt),
  );

  return (
    <section className="grid gap-5">
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">TIMELINE DO TIME</p>
            <h2 className="mt-1 text-xl font-bold">Rotina além do campo</h2>
            <p className="mt-2 text-sm text-[#aebbc4]">
              Compartilhe treinos pessoais e acompanhe a consistência do time.
            </p>
          </div>
          {canRegister && (
            <button className="primary" onClick={() => setEditing(null)}>
              <Dumbbell size={16} /> Registrar treino pessoal
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4" aria-label="Timeline de treinos pessoais">
        {sortedTrainings.map((training) => {
          const author = roster.find((member) => member.id === training.authorId);
          const isOwner = training.authorId === actor.id;
          const reactionSummary = Object.entries(training.reactions)
            .filter(([, memberIds]) => memberIds.length > 0)
            .sort(([, first], [, second]) => second.length - first.length);
          const totalReactions = reactionSummary.reduce(
            (total, [, memberIds]) => total + memberIds.length,
            0,
          );
          const comments = training.comments ?? [];
          return (
            <article className="panel p-5" key={training.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full border border-[#31536a] bg-[#142630] text-sm font-bold text-[#a8e9ff]">
                    {author?.initials ?? "AT"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#eaf4f9]">
                      {author?.name ?? "Atleta"}
                    </p>
                    <p className="mt-1 text-xs text-[#91a1ad]">
                      {format(parseISO(training.occurredAt), "dd MMM · HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                {isOwner && (
                  <RecordActionsMenu
                    label={`Opções de ${training.title}`}
                    actions={[
                      {
                        id: "edit",
                        label: "Editar",
                        allowed: true,
                        onSelect: () => setEditing(training),
                      },
                      {
                        id: "delete",
                        label: "Excluir",
                        allowed: true,
                        destructive: true,
                        onSelect: () => onDelete(training),
                      },
                    ]}
                  />
                )}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#173447] px-2 py-1 text-[10px] font-bold text-[#8fe0ff]">
                  {personalTrainingCategoryLabel[training.category]}
                </span>
                <span className="text-xs text-[#aebbc4]">
                  {training.durationMinutes} min
                </span>
                <span className="text-xs text-[#aebbc4]">
                  Carga {training.perceivedLoad}/10
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-[#f3f7fa]">
                {training.title}
              </h3>
              {training.notes && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#c5d0d7]">
                  {training.notes}
                </p>
              )}
              {(training.media ?? []).length > 0 && (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {training.media.map((media) => (
                    <figure
                      className="overflow-hidden rounded-lg border border-[#303b45] bg-black"
                      key={media.id}
                    >
                      {media.mimeType.startsWith("image/") ? (
                        <img
                          alt={media.name}
                          className="aspect-video w-full object-cover"
                          src={media.dataUrl}
                        />
                      ) : (
                        <video
                          className="aspect-video w-full"
                          controls
                          preload="metadata"
                          src={media.dataUrl}
                        />
                      )}
                      <figcaption className="truncate px-3 py-2 text-xs text-[#aebbc4]">
                        {media.name}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#29313a] pt-4">
                <div className="flex items-center gap-3">
                  <Popover
                    open={pickerTrainingId === training.id}
                    onOpenChange={(open) => {
                      if (open) openReactionMenu(training.id);
                      else closeReactionMenu();
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        aria-label="Reagir ao treino"
                        className="inline-flex h-8 items-center gap-1.5 rounded-md text-xs font-medium text-[#b9c7cf] transition-colors hover:text-white"
                        onMouseEnter={() => openReactionMenu(training.id)}
                        onMouseLeave={closeReactionMenu}
                        type="button"
                      >
                        <SmilePlus size={16} className="text-[#83dfff]" />
                        <span>Reagir</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="overflow-hidden !p-0"
                      onMouseEnter={() => openReactionMenu(training.id)}
                      onMouseLeave={closeReactionMenu}
                    >
                      {fullPickerTrainingId === training.id ? (
                        <EmojiPicker
                          height={390}
                          previewConfig={{ showPreview: false }}
                          searchPlaceholder="Buscar emoji"
                          theme="dark"
                          width={320}
                          onEmojiClick={(emoji) => {
                            onReact(training, emoji.emoji);
                            setPickerTrainingId(null);
                            setFullPickerTrainingId(null);
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-1 p-2">
                          {quickReactions.map(({ value, label }) => (
                            <button
                              aria-label={label}
                              className="grid size-9 place-items-center rounded-md text-lg transition-colors hover:bg-[#24313a]"
                              key={value}
                              onClick={() => {
                                onReact(training, value);
                                setPickerTrainingId(null);
                              }}
                              type="button"
                            >
                              {value}
                            </button>
                          ))}
                          <button
                            aria-label="Escolher outro emoji"
                            className="grid size-9 place-items-center rounded-md text-[#aebbc4] transition-colors hover:bg-[#24313a] hover:text-white"
                            onClick={() => setFullPickerTrainingId(training.id)}
                            type="button"
                          >
                            <Plus size={17} />
                          </button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <button
                    aria-label="Comentar"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md text-xs font-medium text-[#b9c7cf] transition-colors hover:text-white"
                    onClick={() => commentInputs.current[training.id]?.focus()}
                    type="button"
                  >
                    <MessageCircle size={16} className="text-[#83dfff]" />
                    {comments.length > 0 && <span>{comments.length}</span>}
                  </button>
                </div>
                {reactionSummary.length > 0 && (
                  <div
                    aria-label={`${totalReactions} reações`}
                    className="flex items-center text-xs text-[#b9c7cf]"
                  >
                    <div className="flex -space-x-1.5">
                      {reactionSummary.map(([emoji]) => (
                        <span
                          className="grid size-5 place-items-center rounded-full border border-[#111419] bg-[#24313a] text-[11px]"
                          key={emoji}
                        >
                          {emoji}
                        </span>
                      ))}
                    </div>
                    <span className="ml-2">{totalReactions}</span>
                  </div>
                )}
              </div>
              <section className="mt-5 border-t border-[#29313a] pt-4">
                {comments.length > 0 && (
                  <div className="grid gap-3">
                    {comments.map((comment) => {
                      const commentAuthor = roster.find(
                        (member) => member.id === comment.authorId,
                      );
                      const isEditing =
                        editingComment?.trainingId === training.id &&
                        editingComment.comment.id === comment.id;
                      const canEdit = comment.authorId === actor.id;
                      const canDelete = canEdit || actor.isAdmin;
                      return (
                        <article
                          className="rounded-lg bg-[#151a20] p-3"
                          key={comment.id}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-[#e5f0f5]">
                                {commentAuthor?.name ?? "Integrante"}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[#82929d]">
                                {format(parseISO(comment.createdAt), "dd MMM · HH:mm", {
                                  locale: ptBR,
                                })}
                                {comment.updatedAt ? " · editado" : ""}
                              </p>
                            </div>
                            <RecordActionsMenu
                              label={`Opções do comentário de ${commentAuthor?.name ?? "integrante"}`}
                              actions={[
                                {
                                  id: "edit",
                                  label: "Editar",
                                  allowed: canEdit,
                                  onSelect: () => {
                                    setEditingComment({
                                      trainingId: training.id,
                                      comment,
                                    });
                                    setEditingCommentMessage(comment.message);
                                  },
                                },
                                {
                                  id: "delete",
                                  label: "Excluir",
                                  allowed: canDelete,
                                  destructive: true,
                                  onSelect: () => onDeleteComment(training, comment.id),
                                },
                              ]}
                            />
                          </div>
                          {isEditing ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <input
                                className="min-w-0 flex-1 rounded-md border border-[#3b4b56] bg-[#0b0d10] px-3 py-2 text-sm text-white outline-none focus:border-[#58cfff]"
                                value={editingCommentMessage}
                                onChange={(event) =>
                                  setEditingCommentMessage(event.target.value)
                                }
                              />
                              <button
                                className="secondary !px-3 !py-2 !text-xs"
                                onClick={() => setEditingComment(null)}
                                type="button"
                              >
                                Cancelar
                              </button>
                              <button
                                className="primary !px-3 !py-2 !text-xs"
                                onClick={() => {
                                  if (
                                    onUpdateComment(
                                      training,
                                      comment.id,
                                      editingCommentMessage,
                                    )
                                  ) {
                                    setEditingComment(null);
                                  }
                                }}
                                type="button"
                              >
                                Salvar
                              </button>
                            </div>
                          ) : (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[#c5d0d7]">
                              {comment.message}
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
                {actor.status === "active" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-md border border-[#3b4b56] bg-[#0b0d10] px-3 py-2 text-sm text-white outline-none placeholder:text-[#74828c] focus:border-[#58cfff]"
                      placeholder="Escreva um comentário"
                      ref={(element) => {
                        commentInputs.current[training.id] = element;
                      }}
                      value={commentDrafts[training.id] ?? ""}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [training.id]: event.target.value,
                        }))
                      }
                    />
                    <button
                      className="secondary !px-3 !py-2 !text-xs"
                      onClick={() => {
                        if (onAddComment(training, commentDrafts[training.id] ?? "")) {
                          setCommentDrafts((current) => ({
                            ...current,
                            [training.id]: "",
                          }));
                        }
                      }}
                      type="button"
                    >
                      Comentar
                    </button>
                  </div>
                )}
              </section>
            </article>
          );
        })}
        {!sortedTrainings.length && (
          <section className="panel p-8 text-center text-sm text-[#91a1ad]">
            Ainda não há treinos pessoais publicados.
          </section>
        )}
      </section>

      {editing !== undefined && (
        <PersonalTrainingEditor
          training={editing}
          onClose={() => setEditing(undefined)}
          onSave={(input) => {
            const saved = editing ? onUpdate(editing, input) : onCreate(input);
            if (saved) setEditing(undefined);
            return saved;
          }}
        />
      )}
    </section>
  );
}
