"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Member, Role, Training, Unit } from "@/domain/training";
export function TrainingCalendar({
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
export function Dashboard({
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
