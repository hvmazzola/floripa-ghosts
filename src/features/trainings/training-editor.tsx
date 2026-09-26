"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { activityTypeLabel, emptyActivity, unitLabel } from "@/domain/training";
import type {
  ActivityType,
  Member,
  Training,
  TrainingActivity,
  TrainingInput,
  Unit,
} from "@/domain/training";

type FeedbackKind = "success" | "error";

function toLocalInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
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

export function TrainingEditor({
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
  onFeedback: (message: string, kind: FeedbackKind) => void;
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
