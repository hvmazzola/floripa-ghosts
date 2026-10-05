"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  hideTeamPostForMember,
  isTeamPostReadByMember,
  isTeamPostList,
  markTeamPostRead,
  normalizeTeamPosts,
  seedTeamPosts,
} from "@/domain/communication";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Confirmation } from "@/components/confirm-dialog";
import {
  PostContextMenu,
  type PostContextMenuState,
} from "@/components/post-context-menu";
import { VideoEmbed } from "@/components/video-embed";
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
import {
  CommunicationView,
  PostModal,
} from "@/features/communication/communication-view";
import { Dashboard, TrainingCalendar } from "@/features/dashboard/dashboard-view";
import { TrainingEditor } from "@/features/trainings/training-editor";
import { ProfileEditor } from "@/features/roster/profile-editor";
import { readStoredText, readStoredValue, writeStoredValue } from "@/lib/demo-store";
import { getContextMenuPosition } from "@/lib/context-menu";
import { getVideoEmbedUrl } from "@/lib/video-embed";
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
  const [notificationContextMenu, setNotificationContextMenu] =
    useState<PostContextMenuState | null>(null);
  const [selectedPost, setSelectedPost] = useState<TeamPost | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [rosterFilter, setRosterFilter] = useState<"all" | Role>("all");
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
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
    const initialPosts = normalizeTeamPosts(storedPosts.value);
    setPosts(initialPosts);
    writeStoredValue(localStorage, COMMUNICATION_STORAGE, initialPosts);
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
  useEffect(() => {
    const closeNotifications = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
        setNotificationContextMenu(null);
      }
    };
    document.addEventListener("mousedown", closeNotifications);
    return () => document.removeEventListener("mousedown", closeNotifications);
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
  const visibleRoster = roster.filter(
    (member) => rosterFilter === "all" || member.roles.includes(rosterFilter),
  );
  const visiblePosts = posts.filter(
    (post) => !post.hiddenByMemberIds.includes(actor.id),
  );
  const notificationPosts = posts
    .filter(
      (post) =>
        role === "coach" ||
        post.kind === "announcement" ||
        post.recipientId === actor.id,
    )
    .filter((post) => !post.hiddenByMemberIds.includes(actor.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unreadNotificationCount = notificationPosts.filter(
    (post) => !isTeamPostReadByMember(post, actor.id),
  ).length;
  const savePosts = (next: TeamPost[]) => {
    setPosts(next);
    writeStoredValue(localStorage, COMMUNICATION_STORAGE, next);
  };
  const setPostRead = (post: TeamPost, read: boolean) => {
    const updated = markTeamPostRead(post, actor.id, read);
    savePosts(posts.map((item) => (item.id === post.id ? updated : item)));
    if (selectedPost?.id === post.id) setSelectedPost(updated);
  };
  const markAllNotificationsRead = () => {
    const notificationIds = new Set(notificationPosts.map((post) => post.id));
    savePosts(
      posts.map((post) =>
        notificationIds.has(post.id) ? markTeamPostRead(post, actor.id, true) : post,
      ),
    );
  };
  const openPost = (post: TeamPost) => {
    const updated = markTeamPostRead(post, actor.id, true);
    savePosts(posts.map((item) => (item.id === post.id ? updated : item)));
    setSelectedPost(updated);
  };
  const requestHidePost = (post: TeamPost) => {
    setConfirmation({
      title: "Ocultar mensagem?",
      description:
        "Ela sairá apenas da sua visão. As outras pessoas continuarão vendo a comunicação.",
      confirmLabel: "Ocultar para mim",
      onConfirm: () => {
        savePosts(
          posts.map((item) =>
            item.id === post.id ? hideTeamPostForMember(item, actor.id) : item,
          ),
        );
        setSelectedPost(null);
        showFeedback("Mensagem ocultada da sua visão.", "success");
      },
    });
  };
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
    setConfirmation({
      title: "Excluir treino?",
      description: `“${training.title}” será removido permanentemente do time.`,
      confirmLabel: "Excluir",
      onConfirm: () => {
        const next = trainings.filter((item) => item.id !== training.id);
        save(next, "Treino excluído.");
        selectTraining(next[0]?.id ?? "");
      },
    });
  };
  const deleteExercise = (exercise: TrainingActivity) => {
    if (!actor.isAdmin) {
      showFeedback("Somente admins podem excluir exercícios.", "error");
      return;
    }
    setConfirmation({
      title: "Excluir exercício?",
      description: `“${exercise.drill}” será removido da biblioteca de exercícios.`,
      confirmLabel: "Excluir",
      onConfirm: () => {
        const next = exercises.filter((item) => item.id !== exercise.id);
        setExercises(next);
        writeStoredValue(localStorage, EXERCISE_STORAGE, next);
        showFeedback("Exercício excluído.", "success");
      },
    });
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
    setConfirmation({
      title: "Excluir integrante?",
      description: `“${member.name}” será removido do elenco e das convocações futuras.`,
      confirmLabel: "Excluir",
      onConfirm: () => {
        const nextRoster = roster.filter((item) => item.id !== member.id);
        const nextTrainings = trainings.map((training) => ({
          ...training,
          invitations: training.invitations.filter(
            (item) => item.memberId !== member.id,
          ),
        }));
        setRoster(nextRoster);
        setTrainings(nextTrainings);
        writeStoredValue(localStorage, ROSTER_STORAGE, nextRoster);
        writeStoredValue(localStorage, STORAGE, nextTrainings);
        showFeedback("Integrante excluído do elenco.", "success");
      },
    });
  };
  const createPost = (input: TeamPostInput) => {
    try {
      const next = [createTeamPost(input, role, actor.id, roster), ...posts];
      savePosts(next);
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
    setConfirmation({
      title: "Excluir mensagem para todos?",
      description:
        "A comunicação será removida da plataforma para todos os integrantes.",
      confirmLabel: "Excluir",
      onConfirm: () => {
        savePosts(posts.filter((post) => post.id !== postId));
        setSelectedPost(null);
        showFeedback("Mensagem excluída.", "success");
      },
    });
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
          {(role === "coach" || actor.isAdmin) && (
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
            </button>
          )}
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
            <div className="relative" ref={notificationsRef}>
              <button
                className="relative grid h-10 w-10 place-items-center rounded-full border border-[#303740] bg-[#151a20] text-[#cbd8df] transition-colors hover:border-[#3c6982] hover:bg-[#1b2a35] hover:text-[#83dfff]"
                aria-label="Abrir notificações"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setNotificationContextMenu(null);
                }}
              >
                <Bell size={18} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#2eb8ff] px-1 text-[9px] font-extrabold text-[#071018]">
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <section className="absolute right-0 top-12 z-40 w-[min(380px,calc(100vw-32px))] overflow-hidden rounded-xl border border-[#303942] bg-[#12171c] shadow-[0_20px_44px_rgba(0,0,0,0.45)]">
                  <div className="flex items-center justify-between border-b border-[#29313a] px-4 py-3">
                    <strong className="text-sm text-[#edf5f8]">Notificações</strong>
                    <button
                      className="text-xs font-semibold text-[#83dfff] hover:text-white"
                      disabled={!unreadNotificationCount}
                      onClick={markAllNotificationsRead}
                    >
                      Marcar todas como lidas
                    </button>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto">
                    {notificationPosts.slice(0, 6).map((post) => (
                      <article
                        key={post.id}
                        className={`relative block w-full border-b border-[#29313a] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[#192129] ${isTeamPostReadByMember(post, actor.id) ? "bg-transparent" : "bg-[#17232c]"}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          openPost(post);
                          setNotificationsOpen(false);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            openPost(post);
                            setNotificationsOpen(false);
                          }
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setNotificationContextMenu({
                            post,
                            ...getContextMenuPosition(
                              { x: event.clientX, y: event.clientY },
                              { width: window.innerWidth, height: window.innerHeight },
                            ),
                          });
                        }}
                      >
                        <span className="flex items-center gap-2 truncate text-sm font-bold text-[#e8f1f5]">
                          {!isTeamPostReadByMember(post, actor.id) && (
                            <i className="size-2 shrink-0 rounded-full bg-[#58cfff]" />
                          )}
                          {post.title}
                        </span>
                        <span className="mt-1 block truncate text-xs text-[#9daab4]">
                          {post.message}
                        </span>
                        <button
                          className="absolute right-3 top-3 grid size-7 place-items-center rounded-full text-lg leading-none text-[#92a2ad] transition-colors hover:bg-[#28323a] hover:text-white"
                          aria-label={`Excluir ${post.title} da minha lista`}
                          title="Excluir da minha lista"
                          onClick={(event) => {
                            event.stopPropagation();
                            requestHidePost(post);
                          }}
                        >
                          ×
                        </button>
                      </article>
                    ))}
                    {!notificationPosts.length && (
                      <p className="px-4 py-8 text-center text-sm text-[#91a1ad]">
                        Nenhuma notificação no momento.
                      </p>
                    )}
                  </div>
                </section>
              )}
              <PostContextMenu
                menu={notificationContextMenu}
                isRead={
                  notificationContextMenu
                    ? isTeamPostReadByMember(notificationContextMenu.post, actor.id)
                    : false
                }
                onClose={() => setNotificationContextMenu(null)}
                onToggleRead={setPostRead}
                onHide={requestHidePost}
              />
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
              posts={visiblePosts}
              roster={roster}
              role={role}
              actor={actor}
              isAdmin={actor.isAdmin}
              isPostRead={(post) => isTeamPostReadByMember(post, actor.id)}
              onCreate={createPost}
              onDelete={deletePost}
              onHide={requestHidePost}
              onOpen={openPost}
              onToggleRead={setPostRead}
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
                    <article className="activity-row !flex-col" key={exercise.id}>
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
                      {exercise.videoUrl && (
                        <VideoEmbed
                          url={exercise.videoUrl}
                          title={`Vídeo de referência: ${exercise.drill}`}
                        />
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
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <div
                    className="flex rounded-lg border border-[#303942] bg-[#0d1115] p-1"
                    aria-label="Filtrar elenco"
                  >
                    {(
                      [
                        ["all", "Todos"],
                        ["athlete", "Atletas"],
                        ["coach", "Coaches"],
                      ] as const
                    ).map(([filter, label]) => (
                      <button
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${rosterFilter === filter ? "bg-[#1d4054] text-[#dff6ff]" : "text-[#9dacb6] hover:bg-[#1a2026] hover:text-white"}`}
                        key={filter}
                        onClick={() => setRosterFilter(filter)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {actor.isAdmin && (
                    <button className="primary" onClick={() => setProfileEditing(null)}>
                      <Plus size={16} strokeWidth={2.2} /> Integrante
                    </button>
                  )}
                </div>
              </div>
              <div className="roster-grid">
                {visibleRoster.map((member) => (
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
                      {member.status === "active" ? (
                        <span className="pill status-active">Ativo</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#9f4e46] bg-[#3a1d20] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#ffb8ae]">
                          <i className="size-1.5 rounded-full bg-[#ff7b70]" /> Inativo
                        </span>
                      )}
                    </div>
                  </article>
                ))}
                {!visibleRoster.length && (
                  <p className="muted col-span-full py-8 text-center">
                    Nenhum integrante corresponde a este filtro.
                  </p>
                )}
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
                        <article className="activity-row !flex-col" key={activity.id}>
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
                            <VideoEmbed
                              url={activity.videoUrl}
                              title={`Vídeo de referência: ${activity.drill}`}
                            />
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
                                  setConfirmation({
                                    title: "Cancelar início?",
                                    description:
                                      "O registro atual da execução será limpo e o treino voltará para não iniciado.",
                                    confirmLabel: "Cancelar início",
                                    onConfirm: () =>
                                      update(resetTrainingExecution(current, role)),
                                  });
                                }}
                              >
                                Cancelar início
                              </button>
                              <button
                                className="secondary !px-3 !py-2 !text-xs"
                                onClick={() => {
                                  setConfirmation({
                                    title: "Reiniciar execução?",
                                    description:
                                      "As atividades e observações registradas serão limpas para recomeçar o tracker.",
                                    confirmLabel: "Reiniciar",
                                    onConfirm: () =>
                                      update(resetTrainingExecution(current, role)),
                                  });
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
        <div
          className="overlay !fixed !inset-0 !z-50 !flex !items-center !justify-center bg-black/80 p-5 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setExerciseDraft(null);
          }}
        >
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
                      !getVideoEmbedUrl(exerciseDraft.videoUrl);
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
          isRead={isTeamPostReadByMember(selectedPost, actor.id)}
          onClose={() => setSelectedPost(null)}
          onHide={() => requestHidePost(selectedPost)}
          onMarkUnread={() => setPostRead(selectedPost, false)}
        />
      )}
      <ConfirmDialog
        confirmation={confirmation}
        onClose={() => setConfirmation(null)}
      />
      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
