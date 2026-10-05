import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTraining,
  editTraining,
  emptyActivity,
  getNextTraining,
  isTrainingList,
  markAttendance,
  migrateTrainingList,
  publishTraining,
  reopenTrainingExecution,
  resetTrainingExecution,
  respond,
  seedTrainings,
  startTrainingExecution,
  updateActivityExecution,
  finishTrainingExecution,
} from "../src/domain/training.ts";
import {
  canDeleteTeamPost,
  createTeamPost,
  hideTeamPostForMember,
  isTeamPostReadByMember,
  markAllTeamPostsRead,
  markTeamPostRead,
  seedTeamPosts,
} from "../src/domain/communication.ts";
import { getContextMenuPosition } from "../src/lib/context-menu.ts";
import { getVideoEmbedUrl } from "../src/lib/video-embed.ts";
const input = {
  title: "Treino",
  eventTag: "Pré-campeonato",
  location: "Campo",
  startsAt: "2026-10-01T19:00:00-03:00",
  objective: "Fundamentos",
  activities: [
    {
      ...emptyActivity(),
      drill: "Rotas",
      durationMinutes: 30,
      focus: "Timing",
    },
  ],
  memberIds: ["mazzola", "athlete-1"],
};
test("criação é exclusiva do coach e inicia RSVP e presença separadamente", () => {
  assert.throws(() => createTraining(input, "athlete"));
  const training = createTraining(input, "coach");
  assert.equal(training.eventTag, "Pré-campeonato");
  assert.equal(training.activities[0].type, "group-drill");
  assert.equal(training.invitations[0].rsvp, "pending");
  assert.equal(training.invitations[0].attendance, "unmarked");
});
test("edição preserva confirmação e chamada dos convocados mantidos", () => {
  const training = createTraining(input, "coach");
  const replied = respond(training, "mazzola", "mazzola", "yes");
  const present = markAttendance(replied, "coach", "mazzola", "present");
  const edited = editTraining(
    present,
    { ...input, title: "Treino editado", memberIds: ["mazzola", "athlete-2"] },
    "coach",
  );
  assert.equal(edited.title, "Treino editado");
  assert.deepEqual(
    edited.invitations.find((item) => item.memberId === "mazzola"),
    { memberId: "mazzola", rsvp: "yes", attendance: "present" },
  );
  assert.deepEqual(
    edited.invitations.find((item) => item.memberId === "athlete-2"),
    { memberId: "athlete-2", rsvp: "pending", attendance: "unmarked" },
  );
});
test("atleta não altera confirmação alheia e chamada não apaga RSVP", () => {
  const training = createTraining(input, "coach");
  assert.throws(() => respond(training, "athlete-1", "mazzola", "yes"));
  const confirmed = respond(training, "mazzola", "mazzola", "yes");
  assert.equal(
    markAttendance(confirmed, "coach", "mazzola", "absent").invitations[0].rsvp,
    "yes",
  );
});
test("valida atividades, convoca somente atletas e seleciona o treino mais próximo", () => {
  assert.doesNotThrow(() => createTraining({ ...input, activities: [] }, "coach"));
  assert.doesNotThrow(() =>
    createTraining(
      { ...input, activities: [{ ...input.activities[0], focus: "" }] },
      "coach",
    ),
  );
  assert.throws(() =>
    createTraining(
      { ...input, activities: [{ ...input.activities[0], drill: "" }] },
      "coach",
    ),
  );
  assert.throws(() => createTraining({ ...input, memberIds: ["coach-demo"] }, "coach"));
  assert.throws(() =>
    createTraining(
      {
        ...input,
        activities: [{ ...input.activities[0], videoUrl: "youtube.com" }],
      },
      "coach",
    ),
  );
  const late = createTraining(
    { ...input, startsAt: "2026-11-01T19:00:00-03:00" },
    "coach",
  );
  const early = createTraining(input, "coach");
  assert.equal(getNextTraining([late, early])?.id, early.id);
});
test("treino de demonstração convoca somente integrantes atletas", () => {
  assert.equal(
    seedTrainings()[0].invitations.some(
      (invitation) => invitation.memberId === "coach-demo",
    ),
    false,
  );
});
test("plano precisa ser publicado antes da execução e preserva o registro real", () => {
  const draft = createTraining(input, "coach");
  assert.equal(draft.planStatus, "draft");
  assert.throws(() => startTrainingExecution(draft, "coach"));
  const published = publishTraining(draft, "coach");
  const started = startTrainingExecution(published, "coach");
  assert.equal(started.execution.status, "in-progress");
  assert.equal(
    resetTrainingExecution(started, "coach").execution.status,
    "not-started",
  );
  const recorded = updateActivityExecution(started, "coach", input.activities[0].id, {
    status: "completed",
    actualDurationMinutes: 28,
    note: "Bom ritmo.",
  });
  assert.equal(recorded.execution.activities[0].status, "completed");
  assert.equal(recorded.execution.activities[0].actualDurationMinutes, 28);
  const finished = finishTrainingExecution(recorded, "coach", "Objetivo alcançado.");
  assert.equal(finished.execution.status, "completed");
  assert.equal(finished.execution.generalNote, "Objetivo alcançado.");
  assert.equal(
    reopenTrainingExecution(finished, "coach").execution.status,
    "in-progress",
  );
  assert.throws(() => publishTraining(draft, "athlete"));
});
test("dados salvos no formato anterior são migrados sem perder treino", () => {
  const legacy = seedTrainings().map(
    ({ eventTag, activities, ...training }) => training,
  );
  const migrated = migrateTrainingList(legacy);
  assert.ok(migrated);
  assert.equal(migrated[0].activities.length, 1);
  assert.equal(migrated[0].eventTag, "");
  assert.equal(isTrainingList(migrated), true);
});

import { createMember, seedMembers, updateMember } from "../src/domain/training.ts";
test("admin administra elenco e atleta altera somente o próprio perfil", () => {
  const roster = seedMembers();
  const newMember = createMember(
    {
      name: "Novo Atleta",
      number: 31,
      positions: "WR",
      units: "Ataque",
      roles: ["athlete"],
      isAdmin: false,
      status: "active",
    },
    roster,
    "coach",
    true,
  );
  assert.equal(newMember.initials, "NA");
  assert.doesNotThrow(() =>
    createMember(
      {
        name: "Coach sem posição",
        number: 0,
        positions: "",
        units: "Ataque e defesa",
        roles: ["coach"],
        isAdmin: false,
        status: "active",
      },
      roster,
      "coach",
      true,
    ),
  );
  assert.throws(() =>
    createMember(
      {
        name: "Sem atribuição",
        number: 0,
        positions: "",
        units: "Ataque e defesa",
        roles: [],
        isAdmin: false,
        status: "active",
      },
      roster,
      "coach",
      true,
    ),
  );
  assert.throws(() =>
    createMember(
      {
        name: "Sem permissão",
        number: 32,
        positions: "CB",
        units: "Defesa",
        roles: ["athlete"],
        isAdmin: false,
        status: "active",
      },
      roster,
      "athlete",
    ),
  );
  const self = updateMember(
    roster[0],
    { ...roster[0], name: "Mazzola Silva" },
    roster,
    "athlete",
    "mazzola",
  );
  assert.deepEqual(self.roles, ["athlete"]);
  assert.throws(() =>
    createMember(
      {
        name: "Coach sem admin",
        number: 0,
        positions: "",
        units: "Ataque e defesa",
        roles: ["coach"],
        isAdmin: false,
        status: "active",
      },
      roster,
      "coach",
    ),
  );
  assert.throws(() =>
    updateMember(
      roster[1],
      { ...roster[1], name: "Outro" },
      roster,
      "athlete",
      "mazzola",
    ),
  );
});

test("somente admins podem excluir comunicações do time", () => {
  assert.equal(canDeleteTeamPost(true), true);
  assert.equal(canDeleteTeamPost(false), false);
});

test("leitura e ocultação de comunicação são individuais", () => {
  const [post] = seedTeamPosts();
  const read = markTeamPostRead(post, "mazzola", true);
  assert.equal(isTeamPostReadByMember(read, "mazzola"), true);
  assert.equal(isTeamPostReadByMember(read, "coach-demo"), false);

  const hidden = hideTeamPostForMember(read, "mazzola");
  assert.ok(hidden.hiddenByMemberIds.includes("mazzola"));
  assert.equal(hidden.hiddenByMemberIds.includes("coach-demo"), false);
});

test("marcar todas como lidas não altera recibos de outros integrantes", () => {
  const posts = seedTeamPosts();
  const updated = markAllTeamPostsRead(posts, "mazzola");

  assert.equal(
    updated.every((post) => isTeamPostReadByMember(post, "mazzola")),
    true,
  );
  assert.equal(
    updated.some((post) => isTeamPostReadByMember(post, "coach-demo")),
    false,
  );
});

test("menu de contexto fica próximo ao clique sem sair da janela", () => {
  assert.deepEqual(
    getContextMenuPosition({ x: 1180, y: 760 }, { width: 1200, height: 800 }),
    { x: 968, y: 692 },
  );
  assert.deepEqual(
    getContextMenuPosition({ x: 2, y: 3 }, { width: 1200, height: 800 }),
    { x: 8, y: 8 },
  );
});

test("aceita links de vídeo do YouTube e Vimeo para reprodução embutida", () => {
  assert.equal(
    getVideoEmbedUrl("https://www.youtube.com/watch?v=QdBZY2fkU-0"),
    "https://www.youtube-nocookie.com/embed/QdBZY2fkU-0",
  );
  assert.equal(
    getVideoEmbedUrl("https://vimeo.com/123456789"),
    "https://player.vimeo.com/video/123456789",
  );
  assert.equal(getVideoEmbedUrl("https://example.com/video"), null);
});

test("feedback pode manter vídeo de referência e rejeita provedores não suportados", () => {
  const roster = seedMembers();
  const feedback = createTeamPost(
    {
      kind: "feedback",
      recipientId: "mazzola",
      title: "Ajuste de rota",
      message: "Observe a troca de direção.",
      videoUrl: "https://youtu.be/QdBZY2fkU-0",
    },
    "coach",
    "coach-demo",
    roster,
  );
  assert.equal(feedback.videoUrl, "https://youtu.be/QdBZY2fkU-0");
  assert.throws(() =>
    createTeamPost(
      { ...feedback, videoUrl: "https://example.com/video" },
      "coach",
      "coach-demo",
      roster,
    ),
  );
});
