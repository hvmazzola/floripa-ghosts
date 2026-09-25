export type Role = "coach" | "athlete";
export type RSVP = "pending" | "yes" | "no";
export type Attendance = "unmarked" | "present" | "absent";
export type ActivityType =
  "scrimmage" | "situational" | "individual-drill" | "group-drill" | "competition";
export type Unit = "attack" | "defense" | "both";
export type MemberStatus = "active" | "inactive";
export type PlanStatus = "draft" | "published";
export type ExecutionStatus = "not-started" | "in-progress" | "completed";
export type ActivityExecutionStatus = "pending" | "completed" | "skipped";
export type Member = {
  id: string;
  name: string;
  initials: string;
  number: number;
  positions: string;
  units: string;
  roles: Role[];
  isAdmin: boolean;
  status: MemberStatus;
  photoUrl?: string;
};
export type MemberInput = Pick<
  Member,
  | "name"
  | "number"
  | "positions"
  | "units"
  | "roles"
  | "isAdmin"
  | "status"
  | "photoUrl"
>;
export type Invitation = {
  memberId: string;
  rsvp: RSVP;
  attendance: Attendance;
};
export type TrainingActivity = {
  id: string;
  type: ActivityType;
  drill: string;
  durationMinutes: number;
  unit: Unit;
  focus: string;
  situation: string;
  videoUrl: string;
};
export type ActivityExecution = {
  activityId: string;
  status: ActivityExecutionStatus;
  actualDurationMinutes: number | null;
  note: string;
};
export type TrainingExecution = {
  status: ExecutionStatus;
  startedAt: string | null;
  completedAt: string | null;
  generalNote: string;
  activities: ActivityExecution[];
};
export type Training = {
  id: string;
  title: string;
  eventTag: string;
  startsAt: string;
  location: string;
  objective: string;
  activities: TrainingActivity[];
  invitations: Invitation[];
  planStatus: PlanStatus;
  execution: TrainingExecution;
};
export type TrainingInput = Pick<
  Training,
  "title" | "eventTag" | "startsAt" | "location" | "objective" | "activities"
> & { memberIds: string[] };

export const activityTypeLabel: Record<ActivityType, string> = {
  scrimmage: "Scrimmage livre",
  situational: "Situacional",
  "individual-drill": "Drill individual",
  "group-drill": "Drill em conjunto",
  competition: "Competição",
};
export const unitLabel: Record<Unit, string> = {
  attack: "Ataque",
  defense: "Defesa",
  both: "Ataque e defesa",
};
export const members: Member[] = [
  {
    id: "mazzola",
    name: "Mazzola",
    initials: "MA",
    number: 7,
    positions: "A definir",
    units: "Ataque e defesa",
    roles: ["athlete"],
    isAdmin: false,
    status: "active",
  },
  {
    id: "coach-demo",
    name: "Coach Demo",
    initials: "CD",
    number: 0,
    positions: "Comissão técnica",
    units: "Ataque e defesa",
    roles: ["coach"],
    isAdmin: true,
    status: "active",
  },
  {
    id: "athlete-1",
    name: "Atleta Demo 1",
    initials: "A1",
    number: 12,
    positions: "A definir",
    units: "Ataque",
    roles: ["athlete"],
    isAdmin: false,
    status: "active",
  },
  {
    id: "athlete-2",
    name: "Atleta Demo 2",
    initials: "A2",
    number: 21,
    positions: "A definir",
    units: "Defesa",
    roles: ["athlete"],
    isAdmin: false,
    status: "active",
  },
  {
    id: "athlete-3",
    name: "Atleta Demo 3",
    initials: "A3",
    number: 8,
    positions: "A definir",
    units: "Ataque e defesa",
    roles: ["athlete"],
    isAdmin: false,
    status: "active",
  },
];

export function seedMembers(): Member[] {
  return members.map((member) => ({ ...member, roles: [...member.roles] }));
}
function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
function normalizeMember(
  input: MemberInput,
  roster: Member[],
  id?: string,
): MemberInput {
  if (!input.name.trim()) throw new Error("Informe o nome do integrante.");
  if (!input.roles.length) throw new Error("Selecione pelo menos uma atribuição.");
  const isAthlete = input.roles.includes("athlete");
  if (
    isAthlete &&
    (!Number.isInteger(Number(input.number)) ||
      Number(input.number) < 0 ||
      Number(input.number) > 99)
  )
    throw new Error("Use um número entre 0 e 99.");
  if (isAthlete && !input.positions.trim())
    throw new Error("Informe pelo menos uma posição.");
  if (!input.units.trim()) throw new Error("Informe a unidade.");
  if (
    isAthlete &&
    roster.some((member) => member.id !== id && member.number === Number(input.number))
  )
    throw new Error("Esse número já está em uso no elenco.");
  return {
    ...input,
    name: input.name.trim(),
    number: Number(input.number),
    positions: input.positions.trim(),
    units: input.units.trim(),
    roles: [...new Set(input.roles)],
    status: input.status,
    photoUrl: input.photoUrl?.trim() || undefined,
  };
}
export function createMember(
  input: MemberInput,
  roster: Member[],
  role: Role,
  isAdmin = false,
): Member {
  if (role !== "coach" || !isAdmin)
    throw new Error("Somente admins podem adicionar integrantes.");
  const value = normalizeMember(input, roster);
  return {
    id: crypto.randomUUID(),
    initials: initialsFor(value.name),
    ...value,
  };
}
export function updateMember(
  member: Member,
  input: MemberInput,
  roster: Member[],
  role: Role,
  actorId: string,
  isAdmin = false,
): Member {
  if (!isAdmin && actorId !== member.id)
    throw new Error("Você só pode editar seu próprio perfil.");
  const allowed = isAdmin
    ? input
    : {
        ...input,
        roles: member.roles,
        isAdmin: member.isAdmin,
        status: member.status,
      };
  const value = normalizeMember(allowed, roster, member.id);
  return { ...member, ...value, initials: initialsFor(value.name) };
}
export function emptyActivity(): TrainingActivity {
  return {
    id: crypto.randomUUID(),
    type: "group-drill",
    drill: "",
    durationMinutes: 30,
    unit: "both",
    focus: "",
    situation: "",
    videoUrl: "",
  };
}
export function executionFor(activities: TrainingActivity[]): TrainingExecution {
  return {
    status: "not-started",
    startedAt: null,
    completedAt: null,
    generalNote: "",
    activities: activities.map((activity) => ({
      activityId: activity.id,
      status: "pending",
      actualDurationMinutes: null,
      note: "",
    })),
  };
}
function reconcileExecution(
  execution: TrainingExecution | undefined,
  activities: TrainingActivity[],
): TrainingExecution {
  const previous = execution ?? executionFor([]);
  return {
    ...previous,
    activities: activities.map(
      (activity) =>
        previous.activities.find((item) => item.activityId === activity.id) ?? {
          activityId: activity.id,
          status: "pending" as const,
          actualDurationMinutes: null,
          note: "",
        },
    ),
  };
}
export function seedTrainings(): Training[] {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(19, 0, 0, 0);
  const activity = {
    ...emptyActivity(),
    drill: "Fundamentos das unidades",
    durationMinutes: 60,
    focus: "Integração do elenco",
  };
  return [
    {
      id: "demo-training",
      title: "Treino de integração",
      eventTag: "Treino regular",
      startsAt: date.toISOString(),
      location: "Campo a confirmar",
      objective: "Alinhar responsabilidades e trabalhar fundamentos das duas unidades.",
      activities: [activity],
      invitations: members
        .filter((member) => member.roles.includes("athlete"))
        .map((m) => ({
          memberId: m.id,
          rsvp: "pending",
          attendance: "unmarked",
        })),
      planStatus: "published",
      execution: executionFor([activity]),
    },
  ];
}
function normalizedInput(input: TrainingInput, roster: Member[] = members) {
  if (!input.title.trim() || !input.location.trim())
    throw new Error("Preencha o nome e o local.");
  if (!Number.isFinite(Date.parse(input.startsAt)))
    throw new Error("Informe data e horário válidos.");
  const activities = input.activities.map((activity) => {
    if (!activity.drill.trim()) throw new Error("Preencha o drill em cada atividade.");
    if (
      !Number.isInteger(Number(activity.durationMinutes)) ||
      Number(activity.durationMinutes) < 1 ||
      Number(activity.durationMinutes) > 300
    )
      throw new Error("A duração de cada atividade deve ficar entre 1 e 300 minutos.");
    if (activity.videoUrl.trim() && !/^https?:\/\//i.test(activity.videoUrl.trim()))
      throw new Error("Use um link válido para o vídeo de referência.");
    return {
      ...activity,
      id: activity.id || crypto.randomUUID(),
      drill: activity.drill.trim(),
      focus: activity.focus.trim(),
      situation: activity.situation.trim(),
      videoUrl: activity.videoUrl.trim(),
      durationMinutes: Number(activity.durationMinutes),
    };
  });
  const memberIds = [...new Set(input.memberIds)];
  if (
    !memberIds.length ||
    memberIds.some(
      (id) =>
        !roster.some((member) => member.id === id && member.roles.includes("athlete")),
    )
  )
    throw new Error("Selecione pelo menos um atleta válido.");
  return {
    title: input.title.trim(),
    eventTag: input.eventTag.trim(),
    startsAt: new Date(input.startsAt).toISOString(),
    location: input.location.trim(),
    objective: input.objective.trim(),
    activities,
    memberIds,
  };
}
export function createTraining(
  input: TrainingInput,
  role: Role,
  roster: Member[] = members,
): Training {
  if (role !== "coach") throw new Error("Somente coaches podem criar treinos.");
  const value = normalizedInput(input, roster);
  return {
    id: crypto.randomUUID(),
    ...value,
    invitations: value.memberIds.map((memberId) => ({
      memberId,
      rsvp: "pending",
      attendance: "unmarked",
    })),
    planStatus: "draft",
    execution: executionFor(value.activities),
  };
}
export function editTraining(
  training: Training,
  input: TrainingInput,
  role: Role,
  roster: Member[] = members,
): Training {
  if (role !== "coach") throw new Error("Somente coaches podem editar treinos.");
  const value = normalizedInput(input, roster);
  return {
    ...training,
    ...value,
    invitations: value.memberIds.map(
      (memberId) =>
        training.invitations.find((invitation) => invitation.memberId === memberId) ?? {
          memberId,
          rsvp: "pending",
          attendance: "unmarked",
        },
    ),
    execution: reconcileExecution(training.execution, value.activities),
  };
}
export function publishTraining(training: Training, role: Role): Training {
  if (role !== "coach") throw new Error("Somente coaches podem publicar treinos.");
  return { ...training, planStatus: "published" };
}
export function startTrainingExecution(training: Training, role: Role): Training {
  if (role !== "coach") throw new Error("Somente coaches podem iniciar o treino.");
  if (training.planStatus !== "published")
    throw new Error("Publique o plano antes de iniciar.");
  if (training.execution.status !== "not-started") return training;
  return {
    ...training,
    execution: {
      ...training.execution,
      status: "in-progress",
      startedAt: new Date().toISOString(),
    },
  };
}
export function resetTrainingExecution(training: Training, role: Role): Training {
  if (role !== "coach") throw new Error("Somente coaches podem reiniciar a execução.");
  return { ...training, execution: executionFor(training.activities) };
}
export function reopenTrainingExecution(training: Training, role: Role): Training {
  if (role !== "coach") throw new Error("Somente coaches podem reabrir a execução.");
  if (training.execution.status !== "completed") return training;
  return {
    ...training,
    execution: {
      ...training.execution,
      status: "in-progress",
      completedAt: null,
    },
  };
}
export function updateActivityExecution(
  training: Training,
  role: Role,
  activityId: string,
  patch: Partial<Pick<ActivityExecution, "status" | "actualDurationMinutes" | "note">>,
): Training {
  if (role !== "coach") throw new Error("Somente coaches podem registrar a execução.");
  if (!training.execution.activities.some((item) => item.activityId === activityId))
    throw new Error("Atividade não encontrada no plano.");
  return {
    ...training,
    execution: {
      ...training.execution,
      activities: training.execution.activities.map((item) =>
        item.activityId === activityId ? { ...item, ...patch } : item,
      ),
    },
  };
}
export function finishTrainingExecution(
  training: Training,
  role: Role,
  generalNote: string,
): Training {
  if (role !== "coach") throw new Error("Somente coaches podem finalizar o treino.");
  if (training.execution.status !== "in-progress")
    throw new Error("Inicie o treino antes de finalizá-lo.");
  return {
    ...training,
    execution: {
      ...training.execution,
      status: "completed",
      completedAt: new Date().toISOString(),
      generalNote: generalNote.trim(),
    },
  };
}
export function respond(
  training: Training,
  actorId: string,
  targetId: string,
  value: RSVP,
): Training {
  if (actorId !== targetId)
    throw new Error("Você só pode alterar sua própria confirmação.");
  if (!training.invitations.some((invitation) => invitation.memberId === targetId))
    throw new Error("Atleta não convocado.");
  return {
    ...training,
    invitations: training.invitations.map((invitation) =>
      invitation.memberId === targetId ? { ...invitation, rsvp: value } : invitation,
    ),
  };
}
export function markAttendance(
  training: Training,
  role: Role,
  memberId: string,
  value: Attendance,
): Training {
  if (role !== "coach") throw new Error("Somente coaches podem registrar a presença.");
  if (!training.invitations.some((invitation) => invitation.memberId === memberId))
    throw new Error("Atleta não convocado.");
  return {
    ...training,
    invitations: training.invitations.map((invitation) =>
      invitation.memberId === memberId
        ? { ...invitation, attendance: value }
        : invitation,
    ),
  };
}
export function getNextTraining(trainings: Training[]): Training | undefined {
  return [...trainings].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  )[0];
}
export function isTrainingList(
  value: unknown,
  roster: Member[] = members,
): value is Training[] {
  return (
    Array.isArray(value) && value.every((training) => isTraining(training, roster))
  );
}
function isTraining(value: unknown, roster: Member[] = members): value is Training {
  const training = value as Training;
  return Boolean(
    training &&
    typeof training.id === "string" &&
    typeof training.title === "string" &&
    typeof training.eventTag === "string" &&
    typeof training.location === "string" &&
    typeof training.objective === "string" &&
    typeof training.startsAt === "string" &&
    Number.isFinite(Date.parse(training.startsAt)) &&
    Array.isArray(training.activities) &&
    training.activities.every(
      (activity) =>
        activity &&
        typeof activity.id === "string" &&
        Object.hasOwn(activityTypeLabel, activity.type) &&
        typeof activity.drill === "string" &&
        Number.isFinite(activity.durationMinutes) &&
        Object.hasOwn(unitLabel, activity.unit) &&
        typeof activity.focus === "string" &&
        typeof activity.situation === "string" &&
        typeof activity.videoUrl === "string",
    ) &&
    Array.isArray(training.invitations) &&
    training.invitations.every(
      (invitation: Invitation) =>
        invitation &&
        roster.some((member) => member.id === invitation.memberId) &&
        ["pending", "yes", "no"].includes(invitation.rsvp) &&
        ["unmarked", "present", "absent"].includes(invitation.attendance),
    ) &&
    ["draft", "published"].includes(training.planStatus) &&
    Boolean(
      training.execution &&
      ["not-started", "in-progress", "completed"].includes(training.execution.status) &&
      Array.isArray(training.execution.activities) &&
      training.execution.activities.every(
        (item) =>
          item &&
          typeof item.activityId === "string" &&
          ["pending", "completed", "skipped"].includes(item.status) &&
          (item.actualDurationMinutes === null ||
            Number.isFinite(item.actualDurationMinutes)) &&
          typeof item.note === "string",
      ),
    ),
  );
}
export function migrateTrainingList(
  value: unknown,
  roster: Member[] = members,
): Training[] | null {
  if (isTrainingList(value, roster)) return value;
  if (!Array.isArray(value)) return null;
  const migrated = value.map((item) => {
    const legacy = item as Partial<Training>;
    if (
      !legacy ||
      typeof legacy.id !== "string" ||
      typeof legacy.title !== "string" ||
      typeof legacy.startsAt !== "string" ||
      typeof legacy.location !== "string" ||
      typeof legacy.objective !== "string" ||
      !Array.isArray(legacy.invitations)
    )
      return null;
    const activities =
      Array.isArray(legacy.activities) &&
      legacy.activities.every(
        (activity) =>
          activity &&
          typeof activity.id === "string" &&
          Object.hasOwn(activityTypeLabel, activity.type) &&
          typeof activity.drill === "string" &&
          Number.isFinite(activity.durationMinutes) &&
          Object.hasOwn(unitLabel, activity.unit) &&
          typeof activity.focus === "string" &&
          typeof activity.situation === "string" &&
          typeof activity.videoUrl === "string",
      )
        ? legacy.activities
        : [
            {
              ...emptyActivity(),
              drill: legacy.title || "Atividade a detalhar",
              durationMinutes: 60,
              focus: legacy.objective || "A definir",
            },
          ];
    const legacyExecution = legacy.execution as TrainingExecution | undefined;
    return {
      ...legacy,
      eventTag: typeof legacy.eventTag === "string" ? legacy.eventTag : "",
      activities,
      planStatus: legacy.planStatus === "published" ? "published" : "draft",
      execution: reconcileExecution(legacyExecution, activities),
    } as Training;
  });
  return migrated.every((item): item is Training => item !== null) &&
    isTrainingList(migrated, roster)
    ? migrated
    : null;
}
