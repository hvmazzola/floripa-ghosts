"use client";
import { useLayoutEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import {
  activityTypeLabel,
  createMember,
  createTraining,
  editTraining,
  emptyActivity,
  finishTrainingExecution,
  getNextTraining,
  isTrainingList,
  markAttendance,
  migrateTrainingList,
  publishTraining,
  reopenTrainingExecution,
  resetTrainingExecution,
  respond,
  seedMembers,
  seedTrainings,
  startTrainingExecution,
  unitLabel,
  updateActivityExecution,
  updateMember,
} from "@/domain/training";
import {
  canDeleteTeamPost,
  createTeamPost,
  isTeamPostList,
  seedTeamPosts,
} from "@/domain/communication";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarDays,
  Bell,
  ChevronLeft,
  ChevronRight,
  House,
  Menu,
  MessageCircle,
  Plus,
  UsersRound,
} from "lucide-react";
import type {
  ActivityType,
  Attendance,
  Member,
  MemberInput,
  MemberStatus,
  Role,
  RSVP,
  Training,
  TrainingActivity,
  TrainingInput,
  Unit,
} from "@/domain/training";
import type { TeamPost, TeamPostInput } from "@/domain/communication";
import { readStoredText, readStoredValue, writeStoredValue } from "@/lib/demo-store";
const STORAGE = "ghosts-demo-v1";
const ROSTER_STORAGE = "ghosts-demo-roster-v1";
const VIEW_STORAGE = "ghosts-demo-view-v1";
const ROLE_STORAGE = "ghosts-demo-role-v1";
const SELECTED_STORAGE = "ghosts-demo-selected-training-v1";
const EXERCISE_STORAGE = "ghosts-demo-exercises-v1";
const COMMUNICATION_STORAGE = "ghosts-demo-communication-v1";
const ATHLETE_ID = "mazzola";
const COACH_ID = "coach-demo";
const rsvpLabel: Record<RSVP, string> = {
  pending: "Pendente",
  yes: "Confirmado",
  no: "Não vai",
};
const attendanceLabel: Record<Attendance, string> = {
  unmarked: "Não registrada",
  present: "Presente",
  absent: "Ausente",
};
type Feedback = { kind: "success" | "error"; message: string };

function isActivityList(value: unknown): value is TrainingActivity[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.drill === "string" &&
        typeof item.durationMinutes === "number",
    )
  );
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
function toLocalInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}
function Avatar({ member, className = "" }: { member: Member; className?: string }) {
  return (
    <span className={`ghost-avatar ${className}`}>
      {member.photoUrl ? (
        <img src={member.photoUrl} alt={`Foto de ${member.name}`} />
      ) : (
        member.initials
      )}
    </span>
  );
}
function FeedbackToast({
  feedback,
  onClose,
}: {
  feedback: Feedback | null;
  onClose: () => void;
}) {
  if (!feedback) return null;
  return (
    <div
      className={`fixed right-5 top-[86px] z-[60] max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl ${feedback.kind === "success" ? "border-[#2c8bc0] bg-[#132a38] text-[#e7f8ff]" : "border-red-500/70 bg-[#35191d] text-[#ffe8e8]"}`}
      role="status"
    >
      <span>{feedback.message}</span>
      <button aria-label="Fechar alerta" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
function DateTimePicker({
  value,
  onChange,
  dateInvalid,
  timeInvalid,
  showErrors,
}: {
  value: string;
  onChange: (value: string) => void;
  dateInvalid: boolean;
  timeInvalid: boolean;
  showErrors: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pendingTime, setPendingTime] = useState("19:00");
  const selected =
    value && Number.isFinite(Date.parse(value)) ? parseISO(value) : undefined;
  const time = value.slice(11, 16);
  const updateDate = (date: Date | undefined) => {
    if (!date) return;
    onChange(`${format(date, "yyyy-MM-dd")}T${time || pendingTime}`);
    setOpen(false);
  };
  return (
    <div className="form-grid gap-3">
      <div className="grid gap-1.5">
        <span className="field-label">
          Data{" "}
          <span className={`required-mark ${selected ? "!text-[#8b949e]" : ""}`}>
            *
          </span>
          {showErrors && dateInvalid && (
            <span className="error"> Campo obrigatório</span>
          )}
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={`!h-[46px] !w-full !min-w-0 justify-start gap-2 !border-[#303740] !bg-[#0b0d10] !px-3 !font-normal !text-[#f2f5f7] hover:!bg-[#151a20] ${dateInvalid && showErrors ? "!border-red-500 !ring-1 !ring-red-500/60" : ""}`}
            >
              <CalendarDays className="size-4 text-ghost-cyan" />
              <span className="truncate">
                {selected
                  ? format(selected, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : "Selecionar data"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={updateDate}
              locale={ptBR}
              className="text-sm text-slate-100"
              classNames={{
                months: "flex",
                month: "space-y-3",
                month_caption:
                  "flex items-center justify-between px-1 text-sm font-semibold",
                nav: "flex items-center gap-1",
                button_previous:
                  "grid size-7 place-items-center rounded hover:bg-slate-800",
                button_next:
                  "grid size-7 place-items-center rounded hover:bg-slate-800",
                weekdays: "flex",
                weekday: "w-9 text-center text-xs font-normal text-slate-400",
                week: "mt-1 flex w-full",
                day: "grid size-9 place-items-center",
                day_button:
                  "grid size-8 place-items-center rounded-md hover:bg-sky-400/15",
                selected: "[&_button]:bg-sky-500 [&_button]:text-slate-950",
                today: "[&_button]:border [&_button]:border-sky-400",
                outside: "text-slate-600",
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <label className="grid gap-1.5">
        <span className="field-label">
          Horário{" "}
          <span className={`required-mark ${time ? "!text-[#8b949e]" : ""}`}>*</span>
          {showErrors && timeInvalid && (
            <span className="error"> Campo obrigatório</span>
          )}
        </span>
        <input
          aria-label="Horário local"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="HH:MM"
          maxLength={5}
          value={time || pendingTime}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
            const nextTime =
              digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
            setPendingTime(nextTime);
            if (value.slice(0, 10)) {
              onChange(`${value.slice(0, 10)}T${nextTime}`);
            }
          }}
          className={
            timeInvalid && showErrors
              ? "!border-red-500 !ring-1 !ring-red-500/60"
              : undefined
          }
        />
      </label>
    </div>
  );
}
function inputFrom(training: Training | undefined, roster: Member[]): TrainingInput {
  return training
    ? {
        title: training.title,
        eventTag: training.eventTag,
        startsAt: toLocalInput(training.startsAt),
        location: training.location,
        objective: training.objective,
        activities: training.activities,
        memberIds: training.invitations.map((item) => item.memberId),
      }
    : {
        title: "",
        eventTag: "",
        startsAt: "",
        location: "",
        objective: "",
        activities: [],
        memberIds: roster
          .filter(
            (member) => member.status === "active" && member.roles.includes("athlete"),
          )
          .map((member) => member.id),
      };
}
function sameTrainingInput(first: TrainingInput, second: TrainingInput) {
  const comparable = (input: TrainingInput) => ({
    ...input,
    memberIds: [...input.memberIds].sort(),
  });
  return JSON.stringify(comparable(first)) === JSON.stringify(comparable(second));
}
function sameMemberInput(first: MemberInput, second: MemberInput) {
  const comparable = (input: MemberInput) => ({
    ...input,
    roles: [...input.roles].sort(),
    positions: input.positions.split(", ").filter(Boolean).sort().join(", "),
  });
  return JSON.stringify(comparable(first)) === JSON.stringify(comparable(second));
}

function TrainingEditor({
  training,
  roster,
  exercises,
  onClose,
  onSave,
  onFeedback,
}: {
  training?: Training;
  roster: Member[];
  exercises: TrainingActivity[];
  onClose: () => void;
  onSave: (input: TrainingInput) => void;
  onFeedback: (message: string, kind: Feedback["kind"]) => void;
}) {
  const [initialInput] = useState(() => inputFrom(training, roster));
  const [input, setInput] = useState(initialInput);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [videoErrors, setVideoErrors] = useState<number[]>([]);
  const [templateQuery, setTemplateQuery] = useState<Record<string, string>>({});
  const [openTemplate, setOpenTemplate] = useState<string | null>(null);
  const update = (
    key: keyof TrainingInput,
    value: string | TrainingActivity[] | string[],
  ) => setInput((current) => ({ ...current, [key]: value }));
  const activeMemberIds = roster
    .filter((member) => member.status === "active" && member.roles.includes("athlete"))
    .map((member) => member.id);
  const allActiveSelected =
    activeMemberIds.length > 0 &&
    activeMemberIds.every((id) => input.memberIds.includes(id));
  const updateActivity = (
    index: number,
    key: keyof TrainingActivity,
    value: string | number,
  ) => {
    if (key === "videoUrl") {
      setVideoErrors((current) => current.filter((item) => item !== index));
    }
    setInput((current) => ({
      ...current,
      activities: current.activities.map((activity, itemIndex) =>
        itemIndex === index ? { ...activity, [key]: value } : activity,
      ),
    }));
  };
  const moveActivity = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= input.activities.length) return;
    const activities = [...input.activities];
    [activities[index], activities[target]] = [activities[target], activities[index]];
    update("activities", activities);
  };
  const [datePart = "", timePart = ""] = input.startsAt.split("T");
  const dateIsValid =
    /^\d{4}-\d{2}-\d{2}$/.test(datePart) &&
    Number.isFinite(Date.parse(`${datePart}T12:00`));
  const timeIsValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(timePart);
  const invalid = {
    title: !input.title.trim(),
    date: !dateIsValid,
    time: !timeIsValid,
    startsAt: !dateIsValid || !timeIsValid,
    location: !input.location.trim(),
    memberIds: input.memberIds.length === 0,
    activities: input.activities.map((activity) => ({
      drill: !activity.drill.trim(),
      duration:
        !Number.isInteger(Number(activity.durationMinutes)) ||
        Number(activity.durationMinutes) < 1 ||
        Number(activity.durationMinutes) > 300,
      video:
        Boolean(activity.videoUrl.trim()) &&
        !/^https?:\/\//i.test(activity.videoUrl.trim()),
    })),
  };
  const hasInvalid =
    invalid.title ||
    invalid.startsAt ||
    invalid.location ||
    invalid.memberIds ||
    invalid.activities.some(
      (activity) => activity.drill || activity.duration || activity.video,
    );
  const isDirty = !sameTrainingInput(input, initialInput);
  const invalidClass =
    "!border-red-500 !ring-1 !ring-red-500/60 focus-visible:!outline-red-400";
  const save = () => {
    setSubmitted(true);
    setVideoErrors(
      invalid.activities.flatMap((activity, index) => (activity.video ? [index] : [])),
    );
    if (hasInvalid) {
      const message = "Revise os campos destacados antes de salvar o treino.";
      setError(message);
      onFeedback(message, "error");
      return;
    }
    try {
      onSave(input);
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Não foi possível salvar o treino.";
      setError(message);
      onFeedback(message, "error");
    }
  };
  return (
    <div className="overlay !fixed !inset-0 !z-50 !flex !items-center !justify-center bg-black/80 p-5 backdrop-blur-sm">
      <section
        className="modal editor-modal !w-[min(900px,calc(100vw-40px))] !max-w-none max-h-[90vh] overflow-y-auto rounded-2xl border border-[#313943] bg-[#111419] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-editor-title"
      >
        <div className="panel-header flex items-start justify-between border-b border-[#283039] bg-transparent px-8 py-7 max-sm:px-5">
          <div>
            <p className="eyebrow">PLANEJAMENTO DO TIME</p>
            <h2 id="training-editor-title">{training ? "Editar" : "Criar treino"}</h2>
          </div>
          <button
            className="close !grid !h-10 !w-10 !place-items-center !rounded-full !border !border-[#303740] !bg-[#20262c] !p-0 !text-2xl !text-[#dbe4ea] transition-colors hover:!bg-[#2a3945] hover:!text-[#83dfff] focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-[#2eb8ff]"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="editor-form grid gap-5 p-8 max-sm:p-5 [&_input:not([type=checkbox])]:w-full [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-[#303740] [&_input:not([type=checkbox])]:bg-[#0b0d10] [&_input:not([type=checkbox])]:p-3 [&_input:not([type=checkbox])]:text-[#f2f5f7] [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[#303740] [&_select]:bg-[#0b0d10] [&_select]:p-3 [&_select]:text-[#f2f5f7] [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#303740] [&_textarea]:bg-[#0b0d10] [&_textarea]:p-3 [&_textarea]:text-[#f2f5f7] [&_input:focus-visible]:outline [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-[#2eb8ff] [&_select:focus-visible]:outline [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-[#2eb8ff] [&_textarea:focus-visible]:outline [&_textarea:focus-visible]:outline-2 [&_textarea:focus-visible]:outline-[#2eb8ff]">
          <label>
            <span className="field-label">
              Nome do treino <span className="required-mark">*</span>
              {submitted && invalid.title && (
                <span className="error"> Campo obrigatório</span>
              )}
            </span>
            <input
              value={input.title}
              className={submitted && invalid.title ? invalidClass : undefined}
              onChange={(event) => update("title", event.target.value)}
              required
              maxLength={100}
              autoFocus
              placeholder="Ex.: Fundamentos de ataque"
            />
          </label>
          <div className="form-grid">
            <label>
              Evento{" "}
              <input
                value={input.eventTag}
                onChange={(event) => update("eventTag", event.target.value)}
                maxLength={50}
                placeholder="Ex.: Pré-campeonato"
              />
            </label>
            <div>
              <DateTimePicker
                value={input.startsAt}
                onChange={(value) => update("startsAt", value)}
                dateInvalid={invalid.date}
                timeInvalid={invalid.time}
                showErrors={submitted}
              />
            </div>
          </div>
          <label>
            <span className="field-label">
              Local <span className="required-mark">*</span>
              {submitted && invalid.location && (
                <span className="error"> Campo obrigatório</span>
              )}
            </span>
            <input
              value={input.location}
              className={submitted && invalid.location ? invalidClass : undefined}
              onChange={(event) => update("location", event.target.value)}
              required
              maxLength={150}
              placeholder="Campo ou endereço"
            />
          </label>
          <label>
            Objetivo geral
            <textarea
              value={input.objective}
              onChange={(event) => update("objective", event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="O que queremos alcançar neste encontro?"
            />
          </label>
          <section className="activity-editor">
            <div className="panel-header">
              <div>
                <h3>Atividades do treino</h3>
                <p className="muted">
                  Tipo pertence a cada atividade; evento identifica o treino inteiro.
                </p>
                <p className="mt-1 text-xs text-[#83dfff]">
                  {input.activities.reduce(
                    (total, activity) => total + Number(activity.durationMinutes || 0),
                    0,
                  )}{" "}
                  min planejados
                </p>
              </div>
              <button
                className="secondary"
                onClick={() =>
                  update("activities", [...input.activities, emptyActivity()])
                }
              >
                ＋ Atividade
              </button>
            </div>
            {input.activities.map((activity, index) => (
              <div className="activity-form" key={activity.id}>
                <div className="activity-form-header">
                  <strong>Atividade {index + 1}</strong>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#aebcc8]">Ordem</span>
                    <button
                      type="button"
                      className="text-button disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => moveActivity(index, -1)}
                      aria-label="Mover atividade para cima"
                      title="Mover para cima"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-button disabled:opacity-30"
                      disabled={index === input.activities.length - 1}
                      onClick={() => moveActivity(index, 1)}
                      aria-label="Mover atividade para baixo"
                      title="Mover para baixo"
                    >
                      ↓
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        update(
                          "activities",
                          input.activities.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        )
                      }
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <div className="activity-grid">
                  <label className="template-picker">
                    Template
                    <input
                      placeholder="Pesquisar exercício"
                      value={templateQuery[activity.id] ?? ""}
                      onFocus={() => setOpenTemplate(activity.id)}
                      onChange={(event) => {
                        setTemplateQuery((current) => ({
                          ...current,
                          [activity.id]: event.target.value,
                        }));
                        setOpenTemplate(activity.id);
                        const template = exercises.find(
                          (exercise) => exercise.drill === event.target.value,
                        );
                        if (template) {
                          setInput((current) => ({
                            ...current,
                            activities: current.activities.map((item, itemIndex) =>
                              itemIndex === index ? { ...template, id: item.id } : item,
                            ),
                          }));
                        }
                      }}
                    />
                    {openTemplate === activity.id && (
                      <div className="template-options">
                        {exercises
                          .filter((exercise) =>
                            exercise.drill
                              .toLocaleLowerCase("pt-BR")
                              .includes(
                                (templateQuery[activity.id] ?? "").toLocaleLowerCase(
                                  "pt-BR",
                                ),
                              ),
                          )
                          .map((exercise) => (
                            <button
                              type="button"
                              key={exercise.id}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setTemplateQuery((current) => ({
                                  ...current,
                                  [activity.id]: exercise.drill,
                                }));
                                setOpenTemplate(null);
                                setInput((current) => ({
                                  ...current,
                                  activities: current.activities.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? { ...exercise, id: item.id }
                                        : item,
                                  ),
                                }));
                              }}
                            >
                              <strong>{exercise.drill}</strong>
                              <span>
                                {unitLabel[exercise.unit]} · {exercise.durationMinutes}{" "}
                                min
                              </span>
                            </button>
                          ))}
                        {!exercises.length && <p>Nenhum exercício cadastrado.</p>}
                      </div>
                    )}
                  </label>
                  <label>
                    <span className="field-label">
                      Tipo <span className="required-mark">*</span>
                    </span>
                    <select
                      value={activity.type}
                      onChange={(event) =>
                        updateActivity(
                          index,
                          "type",
                          event.target.value as ActivityType,
                        )
                      }
                    >
                      {Object.entries(activityTypeLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">
                      Drill <span className="required-mark">*</span>
                      {submitted && invalid.activities[index].drill && (
                        <span className="error"> Campo obrigatório</span>
                      )}
                    </span>
                    <input
                      value={activity.drill}
                      className={
                        submitted && invalid.activities[index].drill
                          ? invalidClass
                          : undefined
                      }
                      onChange={(event) =>
                        updateActivity(index, "drill", event.target.value)
                      }
                      required
                      placeholder="Ex.: Rotas e timing"
                    />
                  </label>
                  <label>
                    <span className="field-label">
                      Duração (min) <span className="required-mark">*</span>
                      {submitted && invalid.activities[index].duration && (
                        <span className="error"> Campo obrigatório</span>
                      )}
                    </span>
                    <input
                      value={activity.durationMinutes}
                      className={
                        submitted && invalid.activities[index].duration
                          ? invalidClass
                          : undefined
                      }
                      onChange={(event) =>
                        updateActivity(
                          index,
                          "durationMinutes",
                          Number(event.target.value),
                        )
                      }
                      type="number"
                      min="1"
                      max="300"
                      required
                    />
                  </label>
                  <label>
                    <span className="field-label">
                      Unidade <span className="required-mark">*</span>
                    </span>
                    <select
                      value={activity.unit}
                      onChange={(event) =>
                        updateActivity(index, "unit", event.target.value as Unit)
                      }
                    >
                      {Object.entries(unitLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Foco</span>
                    <input
                      value={activity.focus}
                      onChange={(event) =>
                        updateActivity(index, "focus", event.target.value)
                      }
                      placeholder="Ex.: Leitura de cobertura"
                    />
                  </label>
                  <label>
                    Situação
                    <input
                      value={activity.situation}
                      onChange={(event) =>
                        updateActivity(index, "situation", event.target.value)
                      }
                      placeholder="Ex.: 3ª descida"
                    />
                  </label>
                  <label className="wide">
                    <span className="field-label">
                      Vídeo de referência
                      {videoErrors.includes(index) && (
                        <span className="error"> Informe um link</span>
                      )}
                    </span>
                    <input
                      value={activity.videoUrl}
                      className={
                        submitted && invalid.activities[index].video
                          ? invalidClass
                          : undefined
                      }
                      onChange={(event) =>
                        updateActivity(index, "videoUrl", event.target.value)
                      }
                      type="url"
                      placeholder="https://youtube.com/..."
                    />
                  </label>
                </div>
              </div>
            ))}
          </section>
          <fieldset className="selection-panel invitee-selector">
            <div className="mb-2 flex items-center justify-between gap-3">
              <legend>
                Convocar atletas{" "}
                <span
                  className={`required-mark ${input.memberIds.length ? "!text-[#8b949e]" : ""}`}
                >
                  *
                </span>
              </legend>
              <button
                type="button"
                className="rounded-md border border-[#35536a] px-3 py-1.5 text-xs font-semibold text-[#83dfff] transition-colors hover:bg-[#17313f]"
                onClick={() =>
                  update("memberIds", allActiveSelected ? [] : activeMemberIds)
                }
              >
                {allActiveSelected ? "Desmarcar todos" : "Marcar todos"}
              </button>
            </div>
            {roster
              .filter(
                (member) =>
                  member.status === "active" && member.roles.includes("athlete"),
              )
              .map((member) => (
                <label className="member-checkbox" key={member.id}>
                  <Checkbox
                    checked={input.memberIds.includes(member.id)}
                    onCheckedChange={() =>
                      update(
                        "memberIds",
                        input.memberIds.includes(member.id)
                          ? input.memberIds.filter((id) => id !== member.id)
                          : [...input.memberIds, member.id],
                      )
                    }
                  />
                  {member.name}
                  <small>{member.units}</small>
                </label>
              ))}
          </fieldset>
          {submitted && invalid.memberIds && (
            <p className="error" role="alert">
              Selecione pelo menos um atleta.
            </p>
          )}
          {error && !hasInvalid && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="primary disabled:cursor-not-allowed disabled:border-[#3a4148] disabled:bg-[#30363c] disabled:text-[#89929a]"
              onClick={save}
              disabled={!isDirty}
            >
              {training ? "Salvar alterações" : "Publicar treino"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const profilePositions = ["Passer", "Receiver", "Snapper", "Blitzer", "Defender"];
function ProfileEditor({
  member,
  roster,
  role,
  isAdmin,
  onClose,
  onSave,
  onFeedback,
}: {
  member?: Member;
  roster: Member[];
  role: Role;
  isAdmin: boolean;
  onClose: () => void;
  onSave: (input: MemberInput) => void;
  onFeedback: (message: string, kind: Feedback["kind"]) => void;
}) {
  const [initialInput] = useState<MemberInput>(() =>
    member
      ? {
          name: member.name,
          number: member.number,
          positions: member.positions,
          units: member.units,
          roles: member.roles,
          isAdmin: member.isAdmin,
          status: member.status,
          photoUrl: member.photoUrl,
        }
      : {
          name: "",
          number: 0,
          positions: "",
          units: "Ataque e defesa",
          roles: [],
          isAdmin: false,
          status: "active",
          photoUrl: undefined,
        },
  );
  const [input, setInput] = useState(initialInput);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof MemberInput>(key: K, value: MemberInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));
  const toggleRole = (value: Role) =>
    set(
      "roles",
      input.roles.includes(value)
        ? input.roles.filter((item) => item !== value)
        : [...input.roles, value],
    );
  const togglePosition = (value: string) => {
    const selected = input.positions
      .split(", ")
      .filter((item) => profilePositions.includes(item));
    set(
      "positions",
      selected.includes(value)
        ? selected.filter((item) => item !== value).join(", ")
        : [...selected, value].join(", "),
    );
  };
  const canManage = isAdmin;
  const isAthleteProfile = input.roles.includes("athlete");
  const invalid = {
    name: !input.name.trim(),
    roles: !input.roles.length,
    number:
      isAthleteProfile &&
      (!Number.isInteger(Number(input.number)) ||
        Number(input.number) < 0 ||
        Number(input.number) > 99),
    positions: isAthleteProfile && !input.positions.trim(),
  };
  const hasInvalid = Object.values(invalid).some(Boolean);
  const isDirty = !sameMemberInput(input, initialInput);
  const invalidClass =
    "!border-red-500 !ring-1 !ring-red-500/60 focus-visible:!outline-red-400";
  const save = () => {
    setSubmitted(true);
    if (hasInvalid) {
      const message = "Revise os campos destacados antes de salvar o perfil.";
      setError(message);
      onFeedback(message, "error");
      return;
    }
    try {
      onSave(input);
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Não foi possível salvar o perfil.";
      setError(message);
      onFeedback(message, "error");
    }
  };
  const uploadPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      set("photoUrl", typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  };
  return (
    <div className="overlay !fixed !inset-0 !z-50 !flex !items-center !justify-center bg-black/80 p-5 backdrop-blur-sm">
      <section
        className="modal profile-modal !w-[min(900px,calc(100vw-40px))] !max-w-none max-h-[90vh] overflow-y-auto rounded-2xl border border-[#313943] bg-[#111419] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
      >
        <div className="panel-header flex items-start justify-between border-b border-[#283039] bg-transparent px-8 py-7 max-sm:px-5">
          <div>
            <p className="eyebrow">ELENCO</p>
            <h2 id="profile-editor-title">
              {member ? "Editar perfil" : "Adicionar integrante"}
            </h2>
          </div>
          <button
            className="close !grid !h-10 !w-10 !place-items-center !rounded-full !border !border-[#303740] !bg-[#20262c] !p-0 !text-2xl !text-[#dbe4ea] transition-colors hover:!bg-[#2a3945] hover:!text-[#83dfff] focus-visible:!outline focus-visible:!outline-2 focus-visible:!outline-[#2eb8ff]"
            aria-label="Fechar"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="editor-form grid gap-5 p-8 max-sm:p-5 [&_input:not([type=checkbox])]:w-full [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border [&_input:not([type=checkbox])]:border-[#303740] [&_input:not([type=checkbox])]:bg-[#0b0d10] [&_input:not([type=checkbox])]:p-3 [&_input:not([type=checkbox])]:text-[#f2f5f7] [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[#303740] [&_select]:bg-[#0b0d10] [&_select]:p-3 [&_select]:text-[#f2f5f7] [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#303740] [&_textarea]:bg-[#0b0d10] [&_textarea]:p-3 [&_textarea]:text-[#f2f5f7] [&_input:focus-visible]:outline [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-[#2eb8ff] [&_select:focus-visible]:outline [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-[#2eb8ff] [&_textarea:focus-visible]:outline [&_textarea:focus-visible]:outline-2 [&_textarea:focus-visible]:outline-[#2eb8ff]">
          {canManage && (
            <fieldset
              className={`selection-panel role-selector ${submitted && invalid.roles ? "!border-red-500" : ""}`}
            >
              <legend>
                Atribuições{" "}
                <span
                  className={`required-mark ${input.roles.length ? "!text-[#8b949e]" : ""}`}
                >
                  *
                </span>
              </legend>
              {(["athlete", "coach"] as Role[]).map((item) => (
                <label className="member-checkbox" key={item}>
                  <Checkbox
                    checked={input.roles.includes(item)}
                    onCheckedChange={() => toggleRole(item)}
                  />
                  {item === "coach" ? "Coach" : "Atleta"}
                </label>
              ))}
            </fieldset>
          )}
          {canManage && (
            <label className="member-checkbox w-fit">
              <Checkbox
                checked={input.isAdmin}
                onCheckedChange={() => set("isAdmin", !input.isAdmin)}
              />
              Administrador
            </label>
          )}
          <div className="form-grid">
            <label>
              <span className="field-label">
                Nome <span className="required-mark">*</span>
                {submitted && invalid.name && (
                  <span className="error"> Campo obrigatório</span>
                )}
              </span>
              <input
                value={input.name}
                className={submitted && invalid.name ? invalidClass : undefined}
                onChange={(event) => set("name", event.target.value)}
                autoFocus
                maxLength={80}
                required
              />
            </label>
            {isAthleteProfile && (
              <label>
                <span className="field-label">
                  Número <span className="required-mark">*</span>
                  {submitted && invalid.number && (
                    <span className="error"> Campo obrigatório</span>
                  )}
                </span>
                <input
                  value={input.number}
                  className={submitted && invalid.number ? invalidClass : undefined}
                  onChange={(event) => set("number", Number(event.target.value))}
                  type="number"
                  min="0"
                  max="99"
                  required
                />
              </label>
            )}
          </div>
          <label className="photo-field">
            <span className="field-label">Foto do perfil</span>
            <span className="photo-upload">
              {input.photoUrl ? (
                <img src={input.photoUrl} alt="Prévia da foto do perfil" />
              ) : (
                "Selecionar foto"
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(event) => uploadPhoto(event.target.files?.[0])}
              />
            </span>
          </label>
          {isAthleteProfile && (
            <fieldset
              className={`selection-panel position-options ${submitted && invalid.positions ? "!border-red-500" : ""}`}
            >
              <legend>
                Posições{" "}
                <span
                  className={`required-mark ${input.positions.trim() ? "!text-[#8b949e]" : ""}`}
                >
                  *
                </span>
              </legend>
              {profilePositions.map((position) => (
                <label className="member-checkbox" key={position}>
                  <Checkbox
                    checked={input.positions.split(", ").includes(position)}
                    onCheckedChange={() => togglePosition(position)}
                  />
                  {position}
                </label>
              ))}
            </fieldset>
          )}
          <label>
            <span className="field-label">
              Unidade <span className="required-mark">*</span>
            </span>
            <select
              value={input.units}
              onChange={(event) => set("units", event.target.value)}
            >
              <option>Ataque</option>
              <option>Defesa</option>
              <option>Ataque e defesa</option>
            </select>
          </label>
          {canManage && (
            <>
              <label>
                <span className="field-label">Status</span>
                <select
                  value={input.status}
                  onChange={(event) =>
                    set("status", event.target.value as MemberStatus)
                  }
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </label>
            </>
          )}
          {error && !hasInvalid && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="primary disabled:cursor-not-allowed disabled:border-[#3a4148] disabled:bg-[#30363c] disabled:text-[#89929a]"
              onClick={save}
              disabled={!isDirty}
            >
              Salvar perfil
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
function TrainingCalendar({
  trainings,
  selectedId,
  onSelect,
}: {
  trainings: Training[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const selectedTraining = trainings.find((training) => training.id === selectedId);
  const [month, setMonth] = useState(() => {
    const date = selectedTraining ? new Date(selectedTraining.startsAt) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const trainingForDay = (day: number) =>
    trainings.find((training) => {
      const date = new Date(training.startsAt);
      return (
        date.getFullYear() === year &&
        date.getMonth() === monthIndex &&
        date.getDate() === day
      );
    });
  return (
    <section className="calendar-widget" aria-label="Calendário de treinos">
      <div className="flex items-center justify-between">
        <button
          className="calendar-nav"
          aria-label="Mês anterior"
          onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
        >
          <ChevronLeft size={17} />
        </button>
        <strong>
          {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
            month,
          )}
        </strong>
        <button
          className="calendar-nav"
          aria-label="Próximo mês"
          onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="calendar-weekdays">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="calendar-days">
        {Array.from({ length: firstWeekday }, (_, index) => (
          <span key={`empty-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const training = trainingForDay(day);
          const selected = training?.id === selectedId;
          return training ? (
            <button
              key={day}
              className={
                selected ? "calendar-day selected" : "calendar-day has-training"
              }
              onClick={() => onSelect(training.id)}
              aria-label={`${day}: ${training.title}`}
            >
              {day}
              <i aria-hidden="true" />
            </button>
          ) : (
            <span className="calendar-day" key={day}>
              {day}
            </span>
          );
        })}
      </div>
      <p className="muted">Dias em azul têm treino. Clique para abrir o plano.</p>
    </section>
  );
}
function Dashboard({
  trainings,
  roster,
  role,
  actor,
  onOpenTraining,
}: {
  trainings: Training[];
  roster: Member[];
  role: Role;
  actor: Member;
  onOpenTraining: (id: string) => void;
}) {
  const [period, setPeriod] = useState<"all" | "30" | "90" | "custom">("90");
  const [unit, setUnit] = useState<Unit | "all">("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const rangeStart =
    period === "custom"
      ? customStart
        ? new Date(`${customStart}T00:00:00`).getTime()
        : null
      : period === "all"
        ? null
        : Date.now() - Number(period) * 86400000;
  const rangeEnd =
    period === "custom" && customEnd
      ? new Date(`${customEnd}T23:59:59`).getTime()
      : null;
  const visibleTrainings = trainings
    .filter((training) =>
      role === "coach"
        ? true
        : training.planStatus === "published" &&
          training.invitations.some((invite) => invite.memberId === actor.id),
    )
    .filter((training) => {
      const trainingTime = new Date(training.startsAt).getTime();
      return (
        (!rangeStart || trainingTime >= rangeStart) &&
        (!rangeEnd || trainingTime <= rangeEnd)
      );
    })
    .filter(
      (training) =>
        unit === "all" ||
        training.activities.some(
          (activity) => activity.unit === unit || activity.unit === "both",
        ),
    )
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const completed = visibleTrainings.filter(
    (training) => training.execution.status === "completed",
  );
  const relevantInvitations = visibleTrainings.flatMap((training) =>
    training.invitations.filter(
      (invite) => role === "coach" || invite.memberId === actor.id,
    ),
  );
  const presentAttendance = relevantInvitations.filter(
    (invite) => invite.attendance === "present",
  );
  const confirmedAttendance = relevantInvitations.filter(
    (invite) => invite.rsvp === "yes",
  );
  const presenceByInvited = relevantInvitations.length
    ? Math.round((presentAttendance.length / relevantInvitations.length) * 100)
    : 0;
  const presenceByConfirmed = confirmedAttendance.length
    ? Math.round((presentAttendance.length / confirmedAttendance.length) * 100)
    : 0;
  const averageAthletesPerTraining = visibleTrainings.length
    ? (presentAttendance.length / visibleTrainings.length).toFixed(1)
    : "0";
  const activitiesMarkedDone = visibleTrainings
    .flatMap((training) =>
      training.activities
        .filter(
          (activity) =>
            unit === "all" || activity.unit === unit || activity.unit === "both",
        )
        .map((activity) => ({
          activity,
          execution: training.execution.activities.find(
            (item) => item.activityId === activity.id,
          ),
        })),
    )
    .filter(({ execution }) => execution?.status === "completed");
  const plannedMinutes = activitiesMarkedDone.reduce(
    (total, { activity }) => total + activity.durationMinutes,
    0,
  );
  const actualMinutes = activitiesMarkedDone.reduce(
    (total, { activity, execution }) =>
      total + (execution?.actualDurationMinutes ?? activity.durationMinutes),
    0,
  );
  const allActivityExecutions = visibleTrainings.flatMap((training) =>
    training.activities
      .filter(
        (activity) =>
          unit === "all" || activity.unit === unit || activity.unit === "both",
      )
      .map((activity) =>
        training.execution.activities.find((item) => item.activityId === activity.id),
      ),
  );
  const completionRate = allActivityExecutions.length
    ? Math.round(
        (allActivityExecutions.filter((execution) => execution?.status === "completed")
          .length /
          allActivityExecutions.length) *
          100,
      )
    : 0;
  const activeMembers = roster.filter(
    (member) => member.status === "active" && member.roles.includes("athlete"),
  );

  return (
    <section className="space-y-5" aria-label="Dados da Home">
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">VISÃO DE DESEMPENHO</p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em]">
              {role === "coach" ? "Pulso do time" : "Minha evolução"}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[#9facb6]">
              {role === "coach"
                ? "Acompanhe presença, carga e execução dos treinos registrados."
                : "Veja sua participação e a carga registrada nos treinos do Ghosts."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="grid gap-1 text-xs font-semibold text-[#aab6c0]">
              Período
              <select
                className="h-10 rounded-md border border-[#303942] bg-[#151a20] px-3 text-sm font-medium text-[#e9f2f6] outline-none focus:border-[#2eb8ff]"
                value={period}
                onChange={(event) =>
                  setPeriod(event.target.value as "all" | "30" | "90")
                }
              >
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="all">Todo o histórico</option>
                <option value="custom">Faixa de datas</option>
              </select>
            </label>
            {period === "custom" && (
              <>
                <label className="grid gap-1 text-xs font-semibold text-[#aab6c0]">
                  De
                  <input
                    className="h-10 rounded-md border border-[#303942] bg-[#151a20] px-3 text-sm font-medium text-[#e9f2f6] outline-none focus:border-[#2eb8ff]"
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-[#aab6c0]">
                  Até
                  <input
                    className="h-10 rounded-md border border-[#303942] bg-[#151a20] px-3 text-sm font-medium text-[#e9f2f6] outline-none focus:border-[#2eb8ff]"
                    type="date"
                    min={customStart || undefined}
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                  />
                </label>
              </>
            )}
            <label className="grid gap-1 text-xs font-semibold text-[#aab6c0]">
              Unidade
              <select
                className="h-10 rounded-md border border-[#303942] bg-[#151a20] px-3 text-sm font-medium text-[#e9f2f6] outline-none focus:border-[#2eb8ff]"
                value={unit}
                onChange={(event) => setUnit(event.target.value as Unit | "all")}
              >
                <option value="all">Todas</option>
                <option value="attack">Ataque</option>
                <option value="defense">Defesa</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <div
        className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${role === "coach" ? "xl:grid-cols-3 2xl:grid-cols-6" : "xl:grid-cols-4"}`}
      >
        <article className="relative overflow-hidden rounded-xl border border-[#29313a] bg-[#12171c] p-5 shadow-[inset_0_1px_#ffffff08]">
          <img
            className="stat-flame"
            src="/brand/ghosts-flame-pattern.png"
            alt=""
            aria-hidden="true"
          />
          <p className="text-[10px] font-bold tracking-[0.12em] text-[#91a1ad]">
            TREINOS CONCLUÍDOS
          </p>
          <strong className="mt-4 block text-4xl leading-none">
            {completed.length}
          </strong>
          <span className="mt-3 block text-xs text-[#aab6c0]">
            de {visibleTrainings.length} no período
          </span>
        </article>
        {role === "coach" && (
          <article className="relative overflow-hidden rounded-xl border border-[#29313a] bg-[#12171c] p-5 shadow-[inset_0_1px_#ffffff08]">
            <img
              className="stat-flame"
              src="/brand/ghosts-flame-pattern.png"
              alt=""
              aria-hidden="true"
            />
            <p className="text-[10px] font-bold tracking-[0.12em] text-[#91a1ad]">
              PRESENÇA / CONVOCADOS
            </p>
            <strong className="mt-4 block text-4xl leading-none">
              {presenceByInvited}%
            </strong>
            <span className="mt-3 block text-xs text-[#aab6c0]">
              {presentAttendance.length} de {relevantInvitations.length} convocados
            </span>
          </article>
        )}
        <article className="relative overflow-hidden rounded-xl border border-[#29313a] bg-[#12171c] p-5 shadow-[inset_0_1px_#ffffff08]">
          <img
            className="stat-flame"
            src="/brand/ghosts-flame-pattern.png"
            alt=""
            aria-hidden="true"
          />
          <p className="text-[10px] font-bold tracking-[0.12em] text-[#91a1ad]">
            PRESENÇA / CONFIRMADOS
          </p>
          <strong className="mt-4 block text-4xl leading-none">
            {presenceByConfirmed}%
          </strong>
          <span className="mt-3 block text-xs text-[#aab6c0]">
            {presentAttendance.length} de {confirmedAttendance.length} confirmados
          </span>
        </article>
        {role === "coach" && (
          <article className="relative overflow-hidden rounded-xl border border-[#29313a] bg-[#12171c] p-5 shadow-[inset_0_1px_#ffffff08]">
            <img
              className="stat-flame"
              src="/brand/ghosts-flame-pattern.png"
              alt=""
              aria-hidden="true"
            />
            <p className="text-[10px] font-bold tracking-[0.12em] text-[#91a1ad]">
              MÉDIA DE ATLETAS / TREINO
            </p>
            <strong className="mt-4 block text-4xl leading-none">
              {averageAthletesPerTraining}
            </strong>
            <span className="mt-3 block text-xs text-[#aab6c0]">
              Presenças reais registradas
            </span>
          </article>
        )}
        <article className="relative overflow-hidden rounded-xl border border-[#29313a] bg-[#12171c] p-5 shadow-[inset_0_1px_#ffffff08]">
          <img
            className="stat-flame"
            src="/brand/ghosts-flame-pattern.png"
            alt=""
            aria-hidden="true"
          />
          <p className="text-[10px] font-bold tracking-[0.12em] text-[#91a1ad]">
            CARGA REALIZADA
          </p>
          <strong className="mt-4 block text-4xl leading-none">
            {actualMinutes}
            <em className="ml-1 text-base not-italic text-[#aab6c0]">min</em>
          </strong>
          <span className="mt-3 block text-xs text-[#aab6c0]">
            {plannedMinutes} min previstos nas concluídas
          </span>
        </article>
        <article className="relative overflow-hidden rounded-xl border border-[#29313a] bg-[#12171c] p-5 shadow-[inset_0_1px_#ffffff08]">
          <img
            className="stat-flame"
            src="/brand/ghosts-flame-pattern.png"
            alt=""
            aria-hidden="true"
          />
          <p className="text-[10px] font-bold tracking-[0.12em] text-[#91a1ad]">
            ATIVIDADES CONCLUÍDAS
          </p>
          <strong className="mt-4 block text-4xl leading-none">
            {completionRate}%
          </strong>
          <span className="mt-3 block text-xs text-[#aab6c0]">
            {role === "coach"
              ? `${activeMembers.length} atletas ativos`
              : "Com base no treino registrado"}
          </span>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
        <section className="panel">
          <div className="panel-header border-b border-[#29313a]">
            <div>
              <p className="eyebrow">HISTÓRICO RECENTE</p>
              <h2 className="mt-1">Treinos e registros</h2>
            </div>
            <span className="pill">{visibleTrainings.length} itens</span>
          </div>
          <div className="divide-y divide-[#29313a] px-5">
            {visibleTrainings.slice(0, 6).map((training) => {
              const status = training.execution.status;
              const done = training.execution.activities.filter(
                (item) => item.status === "completed",
              ).length;
              return (
                <button
                  key={training.id}
                  className="flex w-full items-center gap-3 py-4 text-left transition-colors hover:bg-[#151b21]"
                  onClick={() => onOpenTraining(training.id)}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#303b45] bg-[#121920] text-xs font-bold text-[#58cfff]">
                    {format(parseISO(training.startsAt), "dd")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{training.title}</strong>
                    <small className="mt-1 block truncate text-xs text-[#91a1ad]">
                      {format(parseISO(training.startsAt), "dd MMM yyyy · HH:mm", {
                        locale: ptBR,
                      })}
                      {training.eventTag ? ` · ${training.eventTag}` : ""}
                    </small>
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${status === "completed" ? "bg-[#17313f] text-[#91e5ff]" : status === "in-progress" ? "bg-[#1b2a35] text-[#8fe0ff]" : "bg-[#242a30] text-[#c5cdd3]"}`}
                  >
                    {status === "completed"
                      ? "Concluído"
                      : status === "in-progress"
                        ? "Em andamento"
                        : "Planejado"}
                  </span>
                  <span className="hidden text-xs text-[#91a1ad] sm:block">
                    {done}/{training.activities.length}
                  </span>
                  <ChevronRight className="shrink-0 text-[#58cfff]" size={18} />
                </button>
              );
            })}
            {!visibleTrainings.length && (
              <p className="py-8 text-sm text-[#91a1ad]">
                Nenhum treino encontrado para estes filtros.
              </p>
            )}
          </div>
        </section>
        <section className="panel p-6">
          <p className="eyebrow">LEITURA DO PERÍODO</p>
          <h2 className="mt-1 text-[17px] font-bold">Resumo</h2>
          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-[#aab6c0]">Execução das atividades</span>
                <strong>{completionRate}%</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#252d34]">
                <span
                  className="block h-full rounded-full bg-[#2eb8ff]"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-[#aab6c0]">Presença entre convocados</span>
                <strong>{presenceByInvited}%</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#252d34]">
                <span
                  className="block h-full rounded-full bg-[#58cfff]"
                  style={{
                    width: `${presenceByInvited}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-7 rounded-lg border border-[#293640] bg-[#121a20] p-4 text-sm text-[#bac7cf]">
            {role === "coach"
              ? "Use os filtros para comparar a rotina de ataque e defesa antes do próximo ciclo."
              : "A carga é calculada a partir das atividades concluídas nos seus treinos publicados."}
          </div>
        </section>
      </div>
    </section>
  );
}
function CommunicationView({
  posts,
  roster,
  role,
  actor,
  isAdmin,
  onCreate,
  onDelete,
  onOpen,
}: {
  posts: TeamPost[];
  roster: Member[];
  role: Role;
  actor: Member;
  isAdmin: boolean;
  onCreate: (input: TeamPostInput) => void;
  onDelete: (postId: string) => void;
  onOpen: (post: TeamPost) => void;
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
              className="relative cursor-pointer py-5 transition-colors hover:bg-[#151b21]"
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
                  <h3 className="mt-3 text-base font-bold">{post.title}</h3>
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

function PostModal({
  post,
  roster,
  onClose,
}: {
  post: TeamPost;
  roster: Member[];
  onClose: () => void;
}) {
  const recipient = post.recipientId
    ? roster.find((member) => member.id === post.recipientId)?.name
    : null;
  return (
    <div className="overlay !fixed !inset-0 !z-50 !flex !items-center !justify-center bg-black/80 p-5 backdrop-blur-sm">
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
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  const [role, setRole] = useState<Role>("coach");
  const [view, setView] = useState<
    "dashboard" | "trainings" | "roster" | "profile" | "exercises" | "communication"
  >("dashboard");
  const [exercises, setExercises] = useState<TrainingActivity[]>([]);
  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [exerciseDraft, setExerciseDraft] = useState<TrainingActivity | null>(null);
  const [exerciseSubmitted, setExerciseSubmitted] = useState(false);
  const [exerciseVideoError, setExerciseVideoError] = useState(false);
  const [roster, setRoster] = useState<Member[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState<Training | null | undefined>(undefined);
  const [profileEditing, setProfileEditing] = useState<Member | null | undefined>(
    undefined,
  );
  const [notice, setNotice] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<TeamPost | null>(null);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const setActiveView = (
    next:
      "dashboard" | "trainings" | "roster" | "profile" | "exercises" | "communication",
  ) => {
    setView(next);
    writeStoredValue(localStorage, VIEW_STORAGE, next);
  };
  const showFeedback = (message: string, kind: Feedback["kind"]) => {
    setFeedback({ message, kind });
    window.setTimeout(() => setFeedback(null), 3500);
  };
  const selectTraining = (trainingId: string) => {
    setSelected(trainingId);
    writeStoredValue(localStorage, SELECTED_STORAGE, trainingId);
  };
  useLayoutEffect(() => {
    const storedRoster = readStoredValue(
      localStorage,
      ROSTER_STORAGE,
      (candidate): candidate is Member[] =>
        Array.isArray(candidate) &&
        candidate.every(
          (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.status === "string",
        ),
      seedMembers(),
    );
    let initialRoster = storedRoster.value.map((member) => ({
      ...member,
      isAdmin: Boolean(member.isAdmin) || member.id === COACH_ID,
    }));
    const demoCoach = seedMembers().find((member) => member.id === COACH_ID)!;
    if (!initialRoster.some((member) => member.id === COACH_ID)) {
      initialRoster = [...initialRoster, demoCoach];
    }
    setRoster(initialRoster);
    writeStoredValue(localStorage, ROSTER_STORAGE, initialRoster);

    const savedView = readStoredText(
      localStorage,
      VIEW_STORAGE,
      (value): value is typeof view =>
        [
          "dashboard",
          "trainings",
          "roster",
          "profile",
          "exercises",
          "communication",
        ].includes(value),
      "dashboard",
    );
    setView(savedView.value);
    const savedRole = readStoredText(
      localStorage,
      ROLE_STORAGE,
      (value): value is Role => value === "coach" || value === "athlete",
      "coach",
    );
    setRole(savedRole.value);
    const storedExercises = readStoredValue(
      localStorage,
      EXERCISE_STORAGE,
      isActivityList,
      [],
    );
    setExercises(storedExercises.value);
    const storedPosts = readStoredValue(
      localStorage,
      COMMUNICATION_STORAGE,
      isTeamPostList,
      seedTeamPosts(),
    );
    setPosts(storedPosts.value);
    writeStoredValue(localStorage, COMMUNICATION_STORAGE, storedPosts.value);
    const storedTrainings = readStoredValue(localStorage, STORAGE, Array.isArray, []);
    const migrated = migrateTrainingList(storedTrainings.value, initialRoster);
    const initial = (migrated ?? seedTrainings()).map((training) => ({
      ...training,
      invitations: training.invitations.filter((invitation) =>
        initialRoster.some(
          (member) =>
            member.id === invitation.memberId && member.roles.includes("athlete"),
        ),
      ),
    }));
    setTrainings(initial);
    const savedSelected = readStoredText(
      localStorage,
      SELECTED_STORAGE,
      (value): value is string => Boolean(value),
      "",
    );
    setSelected(
      initial.some((training) => training.id === savedSelected.value)
        ? savedSelected.value
        : (getNextTraining(initial)?.id ?? ""),
    );
    if (
      migrated &&
      (!isTrainingList(storedTrainings.value, initialRoster) ||
        JSON.stringify(initial) !== JSON.stringify(migrated))
    ) {
      writeStoredValue(localStorage, STORAGE, initial);
      setNotice("Seus treinos salvos foram atualizados para o novo formato.");
    }
    if (
      storedRoster.recovered ||
      storedExercises.recovered ||
      storedPosts.recovered ||
      storedTrainings.recovered
    ) {
      setNotice("Armazenamento indisponível. Os dados ficarão nesta sessão.");
    }
    setReady(true);
  }, []);
  const available = trainings
    .filter(
      (training) =>
        role === "coach" ||
        (training.planStatus === "published" &&
          training.invitations.some(
            (invitation) => invitation.memberId === ATHLETE_ID,
          )),
    )
    .sort((first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt));
  const current =
    available.find((training) => training.id === selected) ?? available[0];
  const actorId = role === "coach" ? COACH_ID : ATHLETE_ID;
  const actor =
    roster.find((member) => member.id === actorId) ??
    seedMembers().find((member) => member.id === actorId)!;
  const notificationPosts = posts
    .filter(
      (post) =>
        role === "coach" ||
        post.kind === "announcement" ||
        post.recipientId === actor.id,
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const save = (
    next: Training[],
    message = "Alterações salvas neste navegador.",
    announce = true,
  ) => {
    setTrainings(next);
    try {
      if (!writeStoredValue(localStorage, STORAGE, next)) {
        throw new Error("Falha ao salvar no navegador.");
      }
      setNotice(message);
      if (announce) showFeedback(message, "success");
    } catch {
      setNotice(
        "Não foi possível salvar neste navegador. Mantenha esta página aberta.",
      );
    }
  };
  const update = (next: Training, announce = true) =>
    save(
      trainings.map((training) => (training.id === next.id ? next : training)),
      "Alterações salvas neste navegador.",
      announce,
    );
  const saveEditor = (input: TrainingInput) => {
    const result = editing
      ? editTraining(editing, input, role, roster)
      : createTraining(input, role, roster);
    save(
      editing
        ? trainings.map((training) => (training.id === result.id ? result : training))
        : [...trainings, result],
      editing ? "Treino atualizado." : "Rascunho do treino salvo.",
    );
    selectTraining(result.id);
    setEditing(undefined);
  };
  const deleteTraining = (training: Training) => {
    if (!actor.isAdmin) {
      showFeedback("Somente admins podem excluir treinos.", "error");
      return;
    }
    if (
      !window.confirm(
        `Excluir o treino “${training.title}”? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    const next = trainings.filter((item) => item.id !== training.id);
    save(next, "Treino excluído.");
    selectTraining(next[0]?.id ?? "");
  };
  const deleteExercise = (exercise: TrainingActivity) => {
    if (!actor.isAdmin) {
      showFeedback("Somente admins podem excluir exercícios.", "error");
      return;
    }
    if (!window.confirm(`Excluir o exercício “${exercise.drill}”?`)) return;
    const next = exercises.filter((item) => item.id !== exercise.id);
    setExercises(next);
    writeStoredValue(localStorage, EXERCISE_STORAGE, next);
    showFeedback("Exercício excluído.", "success");
  };
  const saveRoster = (next: Member[], message: string) => {
    setRoster(next);
    writeStoredValue(localStorage, ROSTER_STORAGE, next);
    setNotice(message);
    showFeedback(message, "success");
  };
  const saveProfile = (input: MemberInput) => {
    const result = profileEditing
      ? updateMember(profileEditing, input, roster, role, actorId, actor.isAdmin)
      : createMember(input, roster, role, actor.isAdmin);
    saveRoster(
      profileEditing
        ? roster.map((member) => (member.id === result.id ? result : member))
        : [...roster, result],
      profileEditing ? "Perfil atualizado." : "Integrante adicionado ao elenco.",
    );
    setProfileEditing(undefined);
  };
  const deleteMember = (member: Member) => {
    if (!actor.isAdmin) {
      showFeedback("Somente admins podem excluir integrantes.", "error");
      return;
    }
    if (member.id === COACH_ID) {
      showFeedback(
        "O perfil de coach principal não pode ser excluído nesta demonstração.",
        "error",
      );
      return;
    }
    if (!window.confirm(`Excluir “${member.name}” do elenco?`)) return;
    const nextRoster = roster.filter((item) => item.id !== member.id);
    const nextTrainings = trainings.map((training) => ({
      ...training,
      invitations: training.invitations.filter((item) => item.memberId !== member.id),
    }));
    setRoster(nextRoster);
    setTrainings(nextTrainings);
    writeStoredValue(localStorage, ROSTER_STORAGE, nextRoster);
    writeStoredValue(localStorage, STORAGE, nextTrainings);
    showFeedback("Integrante excluído do elenco.", "success");
  };
  const createPost = (input: TeamPostInput) => {
    try {
      const next = [createTeamPost(input, role, actor.id, roster), ...posts];
      setPosts(next);
      writeStoredValue(localStorage, COMMUNICATION_STORAGE, next);
      showFeedback("Mensagem publicada.", "success");
    } catch (error) {
      showFeedback(
        error instanceof Error ? error.message : "Não foi possível publicar.",
        "error",
      );
    }
  };
  const deletePost = (postId: string) => {
    if (!canDeleteTeamPost(actor.isAdmin)) {
      showFeedback("Somente admins podem excluir mensagens.", "error");
      return;
    }
    if (!window.confirm("Excluir esta mensagem?")) return;
    const next = posts.filter((post) => post.id !== postId);
    setPosts(next);
    writeStoredValue(localStorage, COMMUNICATION_STORAGE, next);
    showFeedback("Mensagem excluída.", "success");
  };
  const confirmed =
    current?.invitations.filter((invitation) => invitation.rsvp === "yes").length ?? 0;
  const actual =
    current?.invitations.filter((invitation) => invitation.attendance === "present")
      .length ?? 0;
  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#090b0e] text-sm text-[#98a1aa]">
        CARREGANDO...
      </main>
    );
  }
  return (
    <div className={`shell ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      <aside
        className={`sticky top-0 z-20 h-screen shrink-0 flex flex-col overflow-visible max-sm:static max-sm:h-auto border-r border-[#20262d] bg-[#0a0d11] p-3.5 shadow-none transition-[width,box-shadow] duration-300 ease-out motion-reduce:transition-none ${sidebarOpen ? "w-64 shadow-[10px_0_28px_rgba(0,0,0,0.22)]" : "w-[76px]"}`}
      >
        <div className="flex h-12 items-center gap-3 overflow-hidden">
          <button
            className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] border border-[#2b333b] bg-[#12171d] text-[#aab6c0] transition-colors hover:border-[#3c6982] hover:bg-[#182630] hover:text-[#83dfff] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#2eb8ff]"
            aria-label={sidebarOpen ? "Recolher menu" : "Expandir menu"}
            title={sidebarOpen ? "Recolher menu" : "Expandir menu"}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <Menu size={20} />
          </button>
          {sidebarOpen && (
            <img
              className="h-10 w-auto max-w-[154px] object-contain object-left"
              src="/brand/ghosts-wordmark.png"
              alt="Ghosts"
            />
          )}
        </div>
        <nav className="mt-6 grid gap-2" aria-label="Navegação principal">
          <button
            className={`flex h-12 items-center overflow-hidden rounded-[10px] text-left transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#2eb8ff] ${view === "dashboard" ? "bg-[#17232c] text-[#f4f8fb] shadow-[inset_3px_0_#2eb8ff]" : "text-[#98a3ad] hover:bg-[#151d24] hover:text-[#eaf4f9]"}`}
            aria-label="Home"
            onClick={() => setActiveView("dashboard")}
          >
            <span className="grid h-12 w-12 min-w-12 place-items-center">
              <House
                className={view === "dashboard" ? "text-[#58cfff]" : "text-[#8a97a2]"}
                size={19}
                strokeWidth={1.9}
              />
            </span>
            <span
              className={`whitespace-nowrap text-[13px] font-bold transition-[max-width,opacity,transform] duration-300 ease-out motion-reduce:transition-none ${sidebarOpen ? "max-w-40 translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"}`}
            >
              Home
            </span>
          </button>
          <button
            className={`flex h-12 items-center overflow-hidden rounded-[10px] text-left transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#2eb8ff] ${view === "trainings" ? "bg-[#17232c] text-[#f4f8fb] shadow-[inset_3px_0_#2eb8ff]" : "text-[#98a3ad] hover:bg-[#151d24] hover:text-[#eaf4f9]"}`}
            aria-label="Treinos e agenda"
            onClick={() => setActiveView("trainings")}
          >
            <span className="grid h-12 w-12 min-w-12 place-items-center">
              <CalendarDays
                className={view === "trainings" ? "text-[#58cfff]" : "text-[#8a97a2]"}
                size={19}
                strokeWidth={1.8}
              />
            </span>
            <span
              className={`whitespace-nowrap text-[13px] font-bold transition-[max-width,opacity,transform] duration-300 ease-out motion-reduce:transition-none ${sidebarOpen ? "max-w-40 translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"}`}
            >
              Treinos e agenda
            </span>
          </button>
          <button
            className={`flex h-12 items-center overflow-hidden rounded-[10px] text-left transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#2eb8ff] ${view === "roster" ? "bg-[#17232c] text-[#f4f8fb] shadow-[inset_3px_0_#2eb8ff]" : "text-[#98a3ad] hover:bg-[#151d24] hover:text-[#eaf4f9]"}`}
            aria-label="Elenco"
            onClick={() => setActiveView("roster")}
          >
            <span className="grid h-12 w-12 min-w-12 place-items-center">
              <UsersRound
                className={view === "roster" ? "text-[#58cfff]" : "text-[#8a97a2]"}
                size={19}
                strokeWidth={1.8}
              />
            </span>
            <span
              className={`whitespace-nowrap text-[13px] font-bold transition-[max-width,opacity,transform] duration-300 ease-out motion-reduce:transition-none ${sidebarOpen ? "max-w-40 translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"}`}
            >
              Elenco
            </span>
          </button>
          <button
            className={`flex h-12 items-center overflow-hidden rounded-[10px] text-left transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#2eb8ff] ${view === "exercises" ? "bg-[#17232c] text-[#f4f8fb] shadow-[inset_3px_0_#2eb8ff]" : "text-[#98a3ad] hover:bg-[#151d24] hover:text-[#eaf4f9]"}`}
            aria-label="Exercícios"
            onClick={() => setActiveView("exercises")}
          >
            <span className="grid h-12 w-12 min-w-12 place-items-center text-lg text-[#8a97a2]">
              ◈
            </span>
            <span
              className={`whitespace-nowrap text-[13px] font-bold transition-[max-width,opacity,transform] duration-300 ${sidebarOpen ? "max-w-40 translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"}`}
            >
              Exercícios
            </span>
          </button>{" "}
          <button
            className={`flex h-12 items-center overflow-hidden rounded-[10px] text-left transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#2eb8ff] ${view === "communication" ? "bg-[#17232c] text-[#f4f8fb] shadow-[inset_3px_0_#2eb8ff]" : "text-[#98a3ad] hover:bg-[#151d24] hover:text-[#eaf4f9]"}`}
            aria-label="Comunicação"
            onClick={() => setActiveView("communication")}
          >
            <span className="grid h-12 w-12 min-w-12 place-items-center">
              <MessageCircle
                className={
                  view === "communication" ? "text-[#58cfff]" : "text-[#8a97a2]"
                }
                size={19}
                strokeWidth={1.8}
              />
            </span>
            <span
              className={`whitespace-nowrap text-[13px] font-bold transition-[max-width,opacity,transform] duration-300 ${sidebarOpen ? "max-w-40 translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"}`}
            >
              Comunicação
            </span>
          </button>
        </nav>
        <div className="group relative mt-auto w-full">
          <button
            className={`flex h-12 w-full items-center overflow-hidden rounded-[10px] text-left text-[#e8f0f5] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#2eb8ff] `}
            aria-label={`Abrir opções de ${actor.name}`}
          >
            <Avatar
              member={actor}
              className="!m-1 !h-10 !w-10 !min-w-10 !bg-[#202831] !text-[#dfe9ef] transition-shadow group-hover:!bg-[#183447] group-hover:shadow-[0_0_0_2px_#2eb8ff]"
            />
            <strong
              className={`overflow-hidden whitespace-nowrap text-xs transition-[max-width,opacity,transform] duration-300 ease-out motion-reduce:transition-none ${sidebarOpen ? "max-w-40 translate-x-0 opacity-100" : "max-w-0 -translate-x-2 opacity-0"}`}
            >
              {actor.name}
            </strong>
          </button>
          <div
            className={`z-50 rounded-lg border border-[#303740] bg-[#15191e] p-1 shadow-[0_18px_36px_rgba(0,0,0,0.4)] ${sidebarOpen ? "absolute bottom-12 left-0 hidden w-full gap-1 group-hover:grid group-focus-within:grid" : "absolute bottom-0 left-full hidden w-36 group-hover:block group-focus-within:block"}`}
            role="menu"
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[#dff5ff] hover:bg-[#242b33] focus-visible:!outline-none focus-visible:ring-0 focus-visible:bg-[#243747]"
              role="menuitem"
              onClick={() => setActiveView("profile")}
            >
              Perfil
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[#dff5ff] hover:bg-[#242b33] focus-visible:!outline-none focus-visible:ring-0 focus-visible:bg-[#243747]"
              role="menuitem"
              onClick={() => setActiveView("roster")}
            >
              Elenco
            </Button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="topbar">
          <nav className="breadcrumbs" aria-label="Caminho da página">
            <button onClick={() => setActiveView("dashboard")}>Início</button>
            <span aria-hidden="true">/</span>
            <span aria-current="page">
              {view === "dashboard"
                ? "Home"
                : view === "trainings"
                  ? "Treinos e agenda"
                  : view === "roster"
                    ? "Elenco"
                    : view === "exercises"
                      ? "Exercícios"
                      : view === "communication"
                        ? "Comunicação"
                        : "Meu perfil"}
            </span>
          </nav>
          <div className="relative flex items-center gap-3">
            <div className="relative">
              <button
                className="relative grid h-10 w-10 place-items-center rounded-full border border-[#303740] bg-[#151a20] text-[#cbd8df] transition-colors hover:border-[#3c6982] hover:bg-[#1b2a35] hover:text-[#83dfff]"
                aria-label="Abrir notificações"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell size={18} />
                {notificationPosts.length > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#2eb8ff] px-1 text-[9px] font-extrabold text-[#071018]">
                    {notificationPosts.length > 9 ? "9+" : notificationPosts.length}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <section className="absolute right-0 top-12 z-40 w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-xl border border-[#303942] bg-[#12171c] shadow-[0_20px_44px_rgba(0,0,0,0.45)]">
                  <div className="flex items-center justify-between border-b border-[#29313a] px-4 py-3">
                    <strong className="text-sm text-[#edf5f8]">Notificações</strong>
                    <button
                      className="text-xs font-semibold text-[#83dfff] hover:text-white"
                      onClick={() => {
                        setNotificationsOpen(false);
                        setActiveView("communication");
                      }}
                    >
                      Ver todas
                    </button>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {notificationPosts.slice(0, 6).map((post) => (
                      <button
                        key={post.id}
                        className="block w-full border-b border-[#29313a] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[#192129]"
                        onClick={() => {
                          setSelectedPost(post);
                          setNotificationsOpen(false);
                        }}
                      >
                        <span className="block truncate text-sm font-bold text-[#e8f1f5]">
                          {post.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-[#9daab4]">
                          {post.message}
                        </span>
                      </button>
                    ))}
                    {!notificationPosts.length && (
                      <p className="px-4 py-8 text-center text-sm text-[#91a1ad]">
                        Nenhuma notificação no momento.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>
            <span className="pill demo-pill">Demonstração local</span>
          </div>
        </header>
        <section className="demo-bar">
          <div>
            <strong>Explore a rotina do time</strong>
            <span>Dados fictícios · sem login real · salvos neste navegador</span>
          </div>
          <label>
            Visão de teste
            <select
              aria-label="Visão"
              value={role}
              onChange={(event) => {
                const nextRole = event.target.value as Role;
                setRole(nextRole);
                writeStoredValue(localStorage, ROLE_STORAGE, nextRole);
                setActiveView("dashboard");
              }}
            >
              <option value="coach">Coach</option>
              <option value="athlete">Atleta</option>
            </select>
          </label>
        </section>
        <div className="workspace">
          <div className="heading">
            <div>
              <p className="eyebrow">FLORIPA GHOSTS</p>
              <h1>
                {view === "dashboard"
                  ? "Dashboard"
                  : view === "trainings"
                    ? "Treinos"
                    : view === "roster"
                      ? "Pessoas"
                      : view === "exercises"
                        ? "Exercícios"
                        : view === "communication"
                          ? "Comunicação"
                          : "Perfil"}
              </h1>
              <p className="subtitle">
                {view === "dashboard"
                  ? "Acompanhe a rotina do time com dados de treinos já registrados."
                  : view === "trainings"
                    ? "Seu ponto de encontro para planejar, participar e acompanhar."
                    : view === "roster"
                      ? "Um elenco, diferentes posições. A mesma direção."
                      : view === "exercises"
                        ? "Templates prontos para acelerar o planejamento."
                        : view === "communication"
                          ? "Avisos do time e feedbacks que ajudam a evoluir juntos."
                          : "Seus dados esportivos e sua atuação no time."}
              </p>
            </div>
            {role === "coach" && view === "trainings" && (
              <button className="primary" onClick={() => setEditing(null)}>
                <Plus size={16} strokeWidth={2.2} /> Criar treino
              </button>
            )}
          </div>
          {!ready ? (
            <p>CARREGANDO...</p>
          ) : view === "dashboard" ? (
            <Dashboard
              trainings={trainings}
              roster={roster}
              role={role}
              actor={actor}
              onOpenTraining={(trainingId) => {
                selectTraining(trainingId);
                setActiveView("trainings");
              }}
            />
          ) : view === "communication" ? (
            <CommunicationView
              posts={posts}
              roster={roster}
              role={role}
              actor={actor}
              isAdmin={actor.isAdmin}
              onCreate={createPost}
              onDelete={deletePost}
              onOpen={setSelectedPost}
            />
          ) : view === "exercises" ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">BIBLIOTECA DO TIME</p>
                  <h2>Exercícios reutilizáveis</h2>
                </div>
                {role === "coach" && (
                  <button
                    className="primary"
                    onClick={() => {
                      setExerciseSubmitted(false);
                      setExerciseVideoError(false);
                      setExerciseDraft(emptyActivity());
                    }}
                  >
                    ＋ Novo exercício
                  </button>
                )}
              </div>
              <div className="grid gap-3 p-5">
                {exercises.length ? (
                  exercises.map((exercise) => (
                    <article className="activity-row" key={exercise.id}>
                      <div>
                        <strong>{exercise.drill}</strong>
                        <p>
                          {activityTypeLabel[exercise.type]} ·{" "}
                          {unitLabel[exercise.unit]} · {exercise.durationMinutes} min
                        </p>
                        <small>{exercise.focus || "Sem foco definido"}</small>
                      </div>
                      {role === "coach" && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="secondary !px-3 !py-2 !text-xs"
                            onClick={() => {
                              setExerciseSubmitted(false);
                              setExerciseVideoError(false);
                              setExerciseDraft({ ...exercise });
                            }}
                          >
                            Editar
                          </button>
                          {actor.isAdmin && (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-md border border-[#B91C1C] bg-[#B91C1C] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#991B1B]"
                              onClick={() => deleteExercise(exercise)}
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <p className="muted">
                    Cadastre exercícios para reutilizá-los no planejamento.
                  </p>
                )}
              </div>
            </section>
          ) : view === "profile" ? (
            <section className="panel my-profile">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">PERFIL DO INTEGRANTE</p>
                  <h2>{actor.name}</h2>
                </div>
                <button className="secondary" onClick={() => setProfileEditing(actor)}>
                  Editar perfil
                </button>
              </div>
              <div className="profile-summary">
                <Avatar member={actor} className="profile-avatar" />
                <div>
                  {actor.roles.includes("athlete") ? (
                    <>
                      <h3>
                        #{actor.number} · {actor.units}
                      </h3>
                      <p>
                        <strong>Posições:</strong> {actor.positions}
                      </p>
                    </>
                  ) : (
                    <h3>Comissão técnica · {actor.units}</h3>
                  )}
                  <div className="member-pills">
                    {actor.roles.map((item) => (
                      <span className="pill" key={item}>
                        {item === "coach" ? "Coach" : "Atleta"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="panel-foot">
                {role === "athlete"
                  ? "Nesta demonstração, atletas editam seus dados esportivos. Atribuições e status são administrados pela comissão."
                  : "Este é o perfil da identidade de coach da demonstração."}
              </p>
            </section>
          ) : view === "roster" ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Elenco</h2>
                  <span className="muted">Perfis e atribuições do time</span>
                </div>
                {actor.isAdmin && (
                  <button className="primary" onClick={() => setProfileEditing(null)}>
                    <Plus size={16} strokeWidth={2.2} /> Integrante
                  </button>
                )}
              </div>
              <div className="roster-grid">
                {roster.map((member) => (
                  <article className="member-card" key={member.id}>
                    <div className="member-card-top">
                      <Avatar member={member} className="large" />
                      {actor.isAdmin && (
                        <div className="flex items-center gap-2">
                          <button
                            className="secondary !px-3 !py-2 !text-xs"
                            onClick={() => setProfileEditing(member)}
                          >
                            Editar
                          </button>
                          <button
                            className="inline-flex items-center justify-center rounded-md border border-[#B91C1C] bg-[#B91C1C] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#991B1B]"
                            onClick={() => deleteMember(member)}
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                    <h3>{member.name}</h3>
                    {member.roles.includes("athlete") ? (
                      <>
                        <p>
                          #{member.number} · {member.units}
                        </p>
                        <p className="muted">Posição: {member.positions}</p>
                      </>
                    ) : (
                      <p>Comissão técnica · {member.units}</p>
                    )}
                    <div className="member-pills">
                      {member.roles.map((item) => (
                        <span className="pill" key={item}>
                          {item === "coach" ? "Coach" : "Atleta"}
                        </span>
                      ))}
                      <span
                        className={
                          member.status === "active"
                            ? "pill status-active"
                            : "pill status-inactive"
                        }
                      >
                        {member.status === "active" ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <>
              <div className="stats">
                <article>
                  <img
                    className="stat-flame"
                    src="/brand/ghosts-flame-pattern.png"
                    alt=""
                    aria-hidden="true"
                  />
                  <span>Treinos na agenda</span>
                  <strong>{String(available.length).padStart(2, "0")}</strong>
                </article>
                <article>
                  <img
                    className="stat-flame"
                    src="/brand/ghosts-flame-pattern.png"
                    alt=""
                    aria-hidden="true"
                  />
                  <span>Confirmações do treino selecionado</span>
                  <strong>
                    {confirmed}
                    <em> / {current?.invitations.length ?? 0}</em>
                  </strong>
                </article>
                <article>
                  <img
                    className="stat-flame"
                    src="/brand/ghosts-flame-pattern.png"
                    alt=""
                    aria-hidden="true"
                  />
                  <span>Presenças registradas</span>
                  <strong>{String(actual).padStart(2, "0")}</strong>
                </article>
              </div>
              <div className="training-grid">
                <section className="panel agenda">
                  <div className="panel-header">
                    <h2>Agenda</h2>
                    <span className="muted">
                      {available.length} treino
                      {available.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <TrainingCalendar
                    trainings={available}
                    selectedId={current?.id ?? ""}
                    onSelect={selectTraining}
                  />
                  <div className="agenda-list">
                    {available.map((training) => (
                      <button
                        className={
                          training.id === current?.id
                            ? "training-card selected"
                            : "training-card"
                        }
                        key={training.id}
                        onClick={() => selectTraining(training.id)}
                      >
                        <span className="date-tile">
                          <small>
                            {new Intl.DateTimeFormat("pt-BR", {
                              month: "short",
                            })
                              .format(new Date(training.startsAt))
                              .replace(".", "")}
                          </small>
                          <strong>
                            {new Intl.DateTimeFormat("pt-BR", {
                              day: "2-digit",
                            }).format(new Date(training.startsAt))}
                          </strong>
                        </span>
                        <span className="training-card-body">
                          <strong>{training.title}</strong>
                          <span>
                            {new Intl.DateTimeFormat("pt-BR", {
                              weekday: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(training.startsAt))}
                          </span>
                          <small>{training.eventTag || training.location}</small>
                        </span>
                        <span className="arrow">
                          <ChevronRight size={18} strokeWidth={2} />
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
                {current && (
                  <section className="panel detail">
                    <div className="detail-top">
                      <span className="pill green">
                        {current.eventTag || "SEM EVENTO"}
                      </span>
                      <span
                        className={
                          current.planStatus === "published"
                            ? "pill status-active"
                            : "pill status-inactive"
                        }
                      >
                        {current.planStatus === "published" ? "Publicado" : "Rascunho"}
                      </span>
                    </div>
                    <div className="detail-heading">
                      <div>
                        <h2 className="training-title">{current.title}</h2>
                        <p className="date-line">{displayDate(current.startsAt)}</p>
                        <p className="location">⌖ {current.location}</p>
                      </div>
                      {role === "coach" && (
                        <div className="flex flex-wrap justify-end gap-2">
                          {current.planStatus === "draft" && (
                            <button
                              className="primary"
                              onClick={() => update(publishTraining(current, role))}
                            >
                              Publicar plano
                            </button>
                          )}
                          <button
                            className="secondary !px-3 !py-2 !text-xs"
                            onClick={() => setEditing(current)}
                          >
                            Editar
                          </button>
                          {actor.isAdmin && (
                            <button
                              className="inline-flex items-center justify-center rounded-md border border-[#B91C1C] bg-[#B91C1C] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#991B1B]"
                              onClick={() => deleteTraining(current)}
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="objective">
                      <span className="eyebrow">OBJETIVO DO ENCONTRO</span>
                      <p>
                        {current.objective ||
                          "A comissão ainda não informou um objetivo."}
                      </p>
                    </div>
                    <section className="activity-list">
                      <div className="panel-header">
                        <h3>Plano do treino</h3>
                        <span className="muted">
                          {current.activities.reduce(
                            (total, activity) => total + activity.durationMinutes,
                            0,
                          )}{" "}
                          min
                        </span>
                      </div>
                      {current.activities.map((activity) => (
                        <article className="activity-row" key={activity.id}>
                          <div>
                            <strong>{activity.drill}</strong>
                            <p>
                              {activityTypeLabel[activity.type]} ·{" "}
                              {unitLabel[activity.unit]} · {activity.durationMinutes}{" "}
                              min
                            </p>
                            <small>
                              Foco: {activity.focus}
                              {activity.situation
                                ? ` · Situação: ${activity.situation}`
                                : ""}
                            </small>
                          </div>
                          {activity.videoUrl && (
                            <a
                              href={activity.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ver vídeo ↗
                            </a>
                          )}
                        </article>
                      ))}
                    </section>
                    {role === "coach" && (
                      <section className="editor-form mt-5 rounded-xl border border-[#2d3741] bg-[#0d1014] p-5 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[#303740] [&_input]:bg-[#0b0d10] [&_input]:p-3 [&_input]:text-[#f2f5f7] [&_input:disabled]:bg-[#272d33] [&_input:disabled]:text-[#8b949e] [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#303740] [&_textarea]:bg-[#0b0d10] [&_textarea]:p-3 [&_textarea]:text-[#f2f5f7] [&_textarea:disabled]:bg-[#272d33] [&_textarea:disabled]:text-[#8b949e]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="eyebrow">EXECUÇÃO NO DIA</p>
                            <h3>Tracker do treino</h3>
                          </div>
                          <span className="pill status-active">
                            {current.execution.status === "not-started"
                              ? "Não iniciado"
                              : current.execution.status === "in-progress"
                                ? "Em andamento"
                                : "Concluído"}
                          </span>
                          {current.execution.status === "in-progress" && (
                            <div className="flex gap-2">
                              <button
                                className="secondary !px-3 !py-2 !text-xs"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Cancelar o início e limpar o registro atual?",
                                    )
                                  ) {
                                    update(resetTrainingExecution(current, role));
                                  }
                                }}
                              >
                                Cancelar início
                              </button>
                              <button
                                className="secondary !px-3 !py-2 !text-xs"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Reiniciar a execução e limpar o registro atual?",
                                    )
                                  ) {
                                    update(resetTrainingExecution(current, role));
                                  }
                                }}
                              >
                                Reiniciar
                              </button>
                              <button
                                className="primary !px-3 !py-2 !text-xs"
                                onClick={() => {
                                  let nextTraining = current;
                                  current.activities.forEach((activity) => {
                                    nextTraining = updateActivityExecution(
                                      nextTraining,
                                      role,
                                      activity.id,
                                      { status: "completed" },
                                    );
                                  });
                                  update(nextTraining, false);
                                }}
                              >
                                Concluir todas
                              </button>
                            </div>
                          )}
                          {current.execution.status === "completed" && (
                            <button
                              className="secondary !px-3 !py-2 !text-xs"
                              onClick={() => {
                                update(reopenTrainingExecution(current, role));
                              }}
                            >
                              Editar registro
                            </button>
                          )}
                        </div>
                        {current.execution.status === "not-started" ? (
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="muted">
                              Inicie no dia do treino para registrar o que aconteceu em
                              campo.
                            </p>
                            <button
                              className="primary"
                              disabled={current.planStatus !== "published"}
                              onClick={() =>
                                update(startTrainingExecution(current, role))
                              }
                            >
                              Iniciar treino
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-3">
                            <div className="flex items-center justify-between text-sm text-[#aebcc8]">
                              <span>
                                {
                                  current.execution.activities.filter(
                                    (activity) => activity.status !== "pending",
                                  ).length
                                }{" "}
                                de {current.activities.length} atividades registradas
                              </span>
                              <span>
                                {current.activities.length
                                  ? Math.round(
                                      (current.execution.activities.filter(
                                        (activity) => activity.status !== "pending",
                                      ).length /
                                        current.activities.length) *
                                        100,
                                    )
                                  : 0}
                                %
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[#202832]">
                              <div
                                className="h-full bg-sky-400 transition-all"
                                style={{
                                  width: `${current.activities.length ? (current.execution.activities.filter((activity) => activity.status !== "pending").length / current.activities.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            {current.activities.map((activity) => {
                              const record = current.execution.activities.find(
                                (item) => item.activityId === activity.id,
                              )!;
                              return (
                                <article
                                  className="grid gap-3 rounded-lg border border-[#2d3741] bg-[#14191f] p-4"
                                  key={activity.id}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <strong>{activity.drill}</strong>
                                      <p className="muted text-xs">
                                        Previsto: {activity.durationMinutes} min
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        className={
                                          record.status === "completed"
                                            ? "primary !px-3 !py-2 !text-xs"
                                            : "secondary !px-3 !py-2 !text-xs"
                                        }
                                        disabled={
                                          current.execution.status === "completed" ||
                                          record.status === "completed"
                                        }
                                        onClick={() =>
                                          update(
                                            updateActivityExecution(
                                              current,
                                              role,
                                              activity.id,
                                              {
                                                status: "completed",
                                              },
                                            ),
                                            false,
                                          )
                                        }
                                      >
                                        Concluída
                                      </button>
                                      <button
                                        className={
                                          record.status === "skipped"
                                            ? "secondary !border-amber-400/60 !text-amber-200"
                                            : "secondary !px-3 !py-2 !text-xs"
                                        }
                                        disabled={
                                          current.execution.status === "completed" ||
                                          record.status === "skipped"
                                        }
                                        onClick={() =>
                                          update(
                                            updateActivityExecution(
                                              current,
                                              role,
                                              activity.id,
                                              {
                                                status: "skipped",
                                              },
                                            ),
                                            false,
                                          )
                                        }
                                      >
                                        Pular
                                      </button>
                                      {record.status !== "pending" && (
                                        <button
                                          className="secondary !px-3 !py-2 !text-xs"
                                          disabled={
                                            current.execution.status === "completed"
                                          }
                                          onClick={() =>
                                            update(
                                              updateActivityExecution(
                                                current,
                                                role,
                                                activity.id,
                                                {
                                                  status: "pending",
                                                },
                                              ),
                                              false,
                                            )
                                          }
                                        >
                                          Desfazer
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="form-grid">
                                    <label>
                                      <span className="field-label">
                                        Duração real (min)
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        disabled={
                                          current.execution.status === "completed"
                                        }
                                        value={record.actualDurationMinutes ?? ""}
                                        onChange={(event) =>
                                          update(
                                            updateActivityExecution(
                                              current,
                                              role,
                                              activity.id,
                                              {
                                                actualDurationMinutes: event.target
                                                  .value
                                                  ? Number(event.target.value)
                                                  : null,
                                              },
                                            ),
                                            false,
                                          )
                                        }
                                      />
                                    </label>
                                    <label>
                                      <span className="field-label">
                                        Observação da atividade
                                      </span>
                                      <input
                                        disabled={
                                          current.execution.status === "completed"
                                        }
                                        value={record.note}
                                        onChange={(event) =>
                                          update(
                                            updateActivityExecution(
                                              current,
                                              role,
                                              activity.id,
                                              {
                                                note: event.target.value,
                                              },
                                            ),
                                            false,
                                          )
                                        }
                                      />
                                    </label>
                                  </div>
                                </article>
                              );
                            })}
                            <label>
                              <span className="field-label">
                                Observação geral do treino
                              </span>
                              <textarea
                                rows={3}
                                disabled={current.execution.status === "completed"}
                                value={current.execution.generalNote}
                                onChange={(event) =>
                                  update(
                                    {
                                      ...current,
                                      execution: {
                                        ...current.execution,
                                        generalNote: event.target.value,
                                      },
                                    },
                                    false,
                                  )
                                }
                              />
                            </label>
                            {current.execution.status === "in-progress" && (
                              <button
                                className="primary justify-self-end"
                                onClick={() =>
                                  update(
                                    finishTrainingExecution(
                                      current,
                                      role,
                                      current.execution.generalNote,
                                    ),
                                  )
                                }
                              >
                                Finalizar e registrar treino
                              </button>
                            )}
                          </div>
                        )}
                      </section>
                    )}
                    {role === "athlete" ? (
                      <div className="rsvp-box">
                        <h3>Podemos contar com você?</h3>
                        <div className="rsvp-buttons">
                          {(["yes", "no", "pending"] as RSVP[]).map((value) => (
                            <button
                              key={value}
                              className={
                                current.invitations.find(
                                  (invitation) => invitation.memberId === ATHLETE_ID,
                                )?.rsvp === value
                                  ? "choice chosen"
                                  : "choice"
                              }
                              onClick={() =>
                                update(respond(current, ATHLETE_ID, ATHLETE_ID, value))
                              }
                            >
                              {value === "yes"
                                ? "✓ Vou participar"
                                : value === "no"
                                  ? "Não vou"
                                  : "Ainda não sei"}
                            </button>
                          ))}
                        </div>
                        <p className="attendance-summary">
                          Sua presença real:{" "}
                          <strong>
                            {
                              attendanceLabel[
                                current.invitations.find(
                                  (invitation) => invitation.memberId === ATHLETE_ID,
                                )!.attendance
                              ]
                            }
                          </strong>
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="participants-heading">
                          <h3>
                            Convocados <span>{current.invitations.length}</span>
                          </h3>
                          <span className="muted">Confirmação ≠ chamada</span>
                        </div>
                        <div className="participants">
                          {current.invitations.map((invitation) => {
                            const member = roster.find(
                              (item) => item.id === invitation.memberId,
                            );
                            if (!member) return null;
                            return (
                              <div className="participant" key={member.id}>
                                <span className="ghost-avatar">{member.initials}</span>
                                <div className="participant-name">
                                  <strong>{member.name}</strong>
                                  <small>{member.units}</small>
                                </div>
                                <span className={`status ${invitation.rsvp}`}>
                                  {rsvpLabel[invitation.rsvp]}
                                </span>
                                <label className="attendance-label">
                                  <span>Presença real</span>
                                  <select
                                    value={invitation.attendance}
                                    onChange={(event) =>
                                      update(
                                        markAttendance(
                                          current,
                                          role,
                                          member.id,
                                          event.target.value as Attendance,
                                        ),
                                      )
                                    }
                                  >
                                    <option value="unmarked">Não registrada</option>
                                    <option value="present">Presente</option>
                                    <option value="absent">Ausente</option>
                                  </select>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </section>
                )}
              </div>
            </>
          )}
          <p className="notice" role="status">
            {notice || "Ambiente de validação • Use apenas informações fictícias."}
          </p>
          <footer>
            <span>FLORIPA GHOSTS</span>
            <span>Central de treino · Entrega 01</span>
          </footer>
        </div>
      </main>
      {editing !== undefined && (
        <TrainingEditor
          key={editing?.id ?? "new"}
          training={editing ?? undefined}
          roster={roster}
          exercises={exercises}
          onClose={() => setEditing(undefined)}
          onSave={saveEditor}
          onFeedback={showFeedback}
        />
      )}
      {profileEditing !== undefined && (
        <ProfileEditor
          key={profileEditing?.id ?? "new-profile"}
          member={profileEditing ?? undefined}
          roster={roster}
          role={role}
          isAdmin={actor.isAdmin}
          onClose={() => setProfileEditing(undefined)}
          onSave={saveProfile}
          onFeedback={showFeedback}
        />
      )}
      {exerciseDraft && (
        <div className="overlay !fixed !inset-0 !z-50 !flex !items-center !justify-center bg-black/80 p-5 backdrop-blur-sm">
          <section className="modal editor-modal !w-[min(680px,calc(100vw-40px))] !max-w-none rounded-2xl border border-[#313943] bg-[#111419] shadow-2xl">
            <div className="panel-header flex items-start justify-between border-b border-[#283039] bg-transparent px-8 py-7 max-sm:px-5">
              <div>
                <p className="eyebrow">BIBLIOTECA DO TIME</p>
                <h2>
                  {exercises.some((exercise) => exercise.id === exerciseDraft.id)
                    ? "Editar exercício"
                    : "Novo exercício"}
                </h2>
              </div>
              <button
                className="close !grid !h-10 !w-10 !place-items-center !rounded-full !border !border-[#303740] !bg-[#20262c] !p-0 !text-2xl"
                onClick={() => setExerciseDraft(null)}
              >
                ×
              </button>
            </div>
            <div className="editor-form grid gap-5 p-8 max-sm:p-5 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[#303740] [&_input]:bg-[#0b0d10] [&_input]:p-3 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[#303740] [&_select]:bg-[#0b0d10] [&_select]:p-3">
              <label>
                <span className="field-label">
                  Nome do drill <span className="required-mark">*</span>
                  {exerciseSubmitted && !exerciseDraft.drill.trim() && (
                    <span className="error"> Informe um nome.</span>
                  )}
                </span>
                <input
                  autoFocus
                  value={exerciseDraft.drill}
                  onChange={(e) =>
                    setExerciseDraft({ ...exerciseDraft, drill: e.target.value })
                  }
                  required
                />
              </label>
              <div className="form-grid">
                <label>
                  Tipo
                  <select
                    value={exerciseDraft.type}
                    onChange={(e) =>
                      setExerciseDraft({
                        ...exerciseDraft,
                        type: e.target.value as ActivityType,
                      })
                    }
                  >
                    {Object.entries(activityTypeLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="field-label">
                    Duração (min) <span className="required-mark">*</span>
                    {exerciseSubmitted && exerciseDraft.durationMinutes < 1 && (
                      <span className="error"> Informe uma duração.</span>
                    )}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={exerciseDraft.durationMinutes}
                    required
                    onChange={(e) =>
                      setExerciseDraft({
                        ...exerciseDraft,
                        durationMinutes: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Unidade
                  <select
                    value={exerciseDraft.unit}
                    onChange={(e) =>
                      setExerciseDraft({
                        ...exerciseDraft,
                        unit: e.target.value as Unit,
                      })
                    }
                  >
                    {Object.entries(unitLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Foco
                  <input
                    value={exerciseDraft.focus}
                    onChange={(e) =>
                      setExerciseDraft({ ...exerciseDraft, focus: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Situação
                <input
                  value={exerciseDraft.situation}
                  onChange={(e) =>
                    setExerciseDraft({ ...exerciseDraft, situation: e.target.value })
                  }
                />
              </label>
              <label>
                <span className="field-label flex items-center gap-2">
                  Vídeo de referência{" "}
                  {exerciseVideoError && <span className="error">Informe um link</span>}
                </span>
                <input
                  className={
                    exerciseVideoError
                      ? "!border-red-500 !ring-1 !ring-red-500/60"
                      : undefined
                  }
                  type="url"
                  value={exerciseDraft.videoUrl}
                  onChange={(e) => {
                    setExerciseVideoError(false);
                    setExerciseDraft({ ...exerciseDraft, videoUrl: e.target.value });
                  }}
                />
              </label>
              <div className="form-actions">
                <button className="secondary" onClick={() => setExerciseDraft(null)}>
                  Cancelar
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    setExerciseSubmitted(true);
                    const hasInvalidVideo =
                      exerciseDraft.videoUrl.trim() &&
                      !/^https?:\/\//i.test(exerciseDraft.videoUrl.trim());
                    setExerciseVideoError(Boolean(hasInvalidVideo));
                    if (
                      !exerciseDraft.drill.trim() ||
                      exerciseDraft.durationMinutes < 1
                    )
                      return;
                    if (hasInvalidVideo) return;
                    const exists = exercises.some(
                      (exercise) => exercise.id === exerciseDraft.id,
                    );
                    const next = exists
                      ? exercises.map((exercise) =>
                          exercise.id === exerciseDraft.id ? exerciseDraft : exercise,
                        )
                      : [...exercises, exerciseDraft];
                    setExercises(next);
                    writeStoredValue(localStorage, EXERCISE_STORAGE, next);
                    setExerciseDraft(null);
                    showFeedback(
                      exists ? "Exercício atualizado." : "Exercício cadastrado.",
                      "success",
                    );
                  }}
                >
                  Salvar exercício
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          roster={roster}
          onClose={() => setSelectedPost(null)}
        />
      )}
      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
