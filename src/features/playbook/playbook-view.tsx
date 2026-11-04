"use client";

import { useRef, useState } from "react";
import { BookOpen, ChevronRight, Plus, Trash2 } from "lucide-react";

import { RecordActionsMenu } from "@/components/record-actions-menu";
import {
  playUnitLabel,
  type Play,
  type PlayElement,
  type PlayInput,
  type PlayerElement,
} from "@/domain/playbook";
import type { Member } from "@/domain/training";

function blankPlay(): PlayInput {
  return {
    title: "",
    unit: "attack",
    description: "",
    tags: [],
    status: "draft",
    elements: [
      {
        id: crypto.randomUUID(),
        kind: "player",
        label: "QB",
        x: 50,
        y: 76,
        side: "offense",
      },
      {
        id: crypto.randomUUID(),
        kind: "player",
        label: "C",
        x: 50,
        y: 64,
        side: "offense",
      },
      {
        id: crypto.randomUUID(),
        kind: "player",
        label: "WR",
        x: 27,
        y: 67,
        side: "offense",
      },
      {
        id: crypto.randomUUID(),
        kind: "player",
        label: "WR",
        x: 73,
        y: 67,
        side: "offense",
      },
      {
        id: crypto.randomUUID(),
        kind: "player",
        label: "R",
        x: 62,
        y: 76,
        side: "offense",
      },
    ],
  };
}

function asInput(play: Play): PlayInput {
  const { id: _id, authorId: _authorId, updatedAt: _updatedAt, ...input } = play;
  return input;
}

function Field({
  elements,
  editable = false,
  selectedId,
  onSelect,
  onChange,
}: {
  elements: PlayElement[];
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onChange?: (elements: PlayElement[]) => void;
}) {
  const fieldRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const players = elements.filter(
    (element): element is PlayerElement => element.kind === "player",
  );
  const pointFromEvent = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = fieldRef.current!.getBoundingClientRect();
    return {
      x: Math.max(
        2,
        Math.min(98, ((event.clientX - bounds.left) / bounds.width) * 100),
      ),
      y: Math.max(
        2,
        Math.min(98, ((event.clientY - bounds.top) / bounds.height) * 100),
      ),
    };
  };
  const movePlayer = (id: string, x: number, y: number) => {
    onChange?.(
      elements.map((element) => {
        if (element.kind === "player" && element.id === id) return { ...element, x, y };
        if (element.kind === "route" && element.fromPlayerId === id) {
          return {
            ...element,
            points: [{ x, y: Math.max(2, y - 5) }, ...element.points.slice(1)],
          };
        }
        return element;
      }),
    );
  };
  return (
    <div className="overflow-hidden rounded-xl border border-[#31434f] bg-[#081217]">
      <svg
        ref={fieldRef}
        aria-label="Campo tático de flag football"
        className="aspect-[5/3] w-full touch-none"
        viewBox="0 0 1000 600"
        onPointerMove={(event) => {
          if (!dragging || !editable) return;
          const point = pointFromEvent(event);
          movePlayer(dragging, point.x, point.y);
        }}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
      >
        <defs>
          <pattern
            id="yard-lines"
            width="100"
            height="600"
            patternUnits="userSpaceOnUse"
          >
            <path d="M 100 0 L 100 600" stroke="#315064" strokeWidth="2" opacity=".7" />
          </pattern>
          <marker
            id="play-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8" fill="none" stroke="#58cfff" strokeWidth="1.5" />
          </marker>
        </defs>
        <rect width="1000" height="600" fill="#0c2a2c" />
        <rect
          x="26"
          y="26"
          width="948"
          height="548"
          fill="url(#yard-lines)"
          stroke="#74a18a"
          strokeWidth="3"
        />
        <line
          x1="26"
          x2="974"
          y1="300"
          y2="300"
          stroke="#d8f5ff"
          strokeDasharray="10 12"
          opacity=".45"
        />
        <text x="50" y="70" fill="#84aab2" fontSize="24" fontWeight="700">
          END ZONE
        </text>
        <text x="750" y="550" fill="#84aab2" fontSize="24" fontWeight="700">
          END ZONE
        </text>
        {elements
          .filter((element) => element.kind === "route")
          .map((route) => (
            <polyline
              fill="none"
              key={route.id}
              markerEnd="url(#play-arrow)"
              points={route.points
                .map((point) => `${point.x * 10},${point.y * 6}`)
                .join(" ")}
              stroke={route.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="7"
            />
          ))}
        {players.map((player) => (
          <g
            className={editable ? "cursor-grab active:cursor-grabbing" : ""}
            key={player.id}
            transform={`translate(${player.x * 10} ${player.y * 6})`}
            onPointerDown={(event) => {
              if (!editable) return;
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(player.id);
              onSelect?.(player.id);
            }}
            onClick={() => onSelect?.(player.id)}
          >
            <circle
              r="29"
              fill={player.side === "offense" ? "#102c3e" : "#3a2027"}
              stroke={
                selectedId === player.id
                  ? "#f5fbff"
                  : player.side === "offense"
                    ? "#58cfff"
                    : "#f27b7b"
              }
              strokeWidth={selectedId === player.id ? "5" : "3"}
            />
            <text
              fill="#f4fbff"
              fontSize="18"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {player.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function PlayEditor({
  play,
  onCancel,
  onSave,
}: {
  play: Play | null;
  onCancel: () => void;
  onSave: (input: PlayInput) => boolean;
}) {
  const [input, setInput] = useState<PlayInput>(() =>
    play ? asInput(play) : blankPlay(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPlayer = input.elements.find(
    (element): element is PlayerElement =>
      element.kind === "player" && element.id === selectedId,
  );
  const addPlayer = () => {
    const player: PlayerElement = {
      id: crypto.randomUUID(),
      kind: "player",
      label: input.unit === "attack" ? "WR" : "DB",
      x: 50,
      y: 45,
      side: input.unit === "attack" ? "offense" : "defense",
    };
    setInput((current) => ({ ...current, elements: [...current.elements, player] }));
    setSelectedId(player.id);
  };
  const addRoute = () => {
    const origin =
      selectedPlayer ??
      input.elements.find(
        (element): element is PlayerElement => element.kind === "player",
      );
    if (!origin) return;
    setInput((current) => ({
      ...current,
      elements: [
        ...current.elements,
        {
          id: crypto.randomUUID(),
          kind: "route",
          fromPlayerId: origin.id,
          points: [
            { x: origin.x, y: Math.max(2, origin.y - 5) },
            { x: Math.min(96, origin.x + 16), y: Math.max(4, origin.y - 28) },
          ],
          color: "#58cfff",
        },
      ],
    }));
  };
  const removeSelected = () => {
    if (!selectedId) return;
    setInput((current) => ({
      ...current,
      elements: current.elements.filter(
        (element) =>
          element.id !== selectedId &&
          (element.kind !== "route" || element.fromPlayerId !== selectedId),
      ),
    }));
    setSelectedId(null);
  };
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-3">
        <Field
          elements={input.elements}
          editable
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChange={(elements) => setInput((current) => ({ ...current, elements }))}
        />
        <div className="flex flex-wrap gap-2">
          <button
            className="secondary !px-3 !py-2 !text-xs"
            onClick={addPlayer}
            type="button"
          >
            <Plus size={14} /> Jogador
          </button>
          <button
            className="secondary !px-3 !py-2 !text-xs"
            onClick={addRoute}
            type="button"
          >
            ＋ Rota
          </button>
          <button
            className="secondary !px-3 !py-2 !text-xs"
            disabled={!selectedId}
            onClick={removeSelected}
            type="button"
          >
            <Trash2 size={14} /> Remover
          </button>
        </div>
      </div>
      <aside className="rounded-xl border border-[#303942] bg-[#10151a] p-4">
        <p className="eyebrow">EDITOR TÁTICO</p>
        <div className="mt-4 grid gap-3 [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-[#35414a] [&_input]:bg-[#0b0d10] [&_input]:px-3 [&_input]:py-2 [&_input]:text-sm [&_textarea]:w-full [&_textarea]:rounded-md [&_textarea]:border [&_textarea]:border-[#35414a] [&_textarea]:bg-[#0b0d10] [&_textarea]:px-3 [&_textarea]:py-2 [&_textarea]:text-sm">
          <label>
            <span className="field-label">
              Nome da jogada <span className="required-mark">*</span>
            </span>
            <input
              value={input.title}
              onChange={(event) => setInput({ ...input, title: event.target.value })}
              placeholder="Ex.: Flood direita"
            />
          </label>
          <label>
            <span className="field-label">Unidade</span>
            <select
              className="w-full rounded-md border border-[#35414a] bg-[#0b0d10] px-3 py-2 text-sm"
              value={input.unit}
              onChange={(event) =>
                setInput({ ...input, unit: event.target.value as PlayInput["unit"] })
              }
            >
              <option value="attack">Ataque</option>
              <option value="defense">Defesa</option>
            </select>
          </label>
          <label>
            <span className="field-label">Tags</span>
            <input
              value={input.tags.join(", ")}
              onChange={(event) =>
                setInput({ ...input, tags: event.target.value.split(",") })
              }
              placeholder="passe, red zone"
            />
          </label>
          <label>
            <span className="field-label">Descrição</span>
            <textarea
              rows={4}
              value={input.description}
              onChange={(event) =>
                setInput({ ...input, description: event.target.value })
              }
            />
          </label>
          {selectedPlayer && (
            <label>
              <span className="field-label">Rótulo selecionado</span>
              <input
                value={selectedPlayer.label}
                onChange={(event) =>
                  setInput((current) => ({
                    ...current,
                    elements: current.elements.map((element) =>
                      element.kind === "player" && element.id === selectedPlayer.id
                        ? { ...element, label: event.target.value.slice(0, 4) }
                        : element,
                    ),
                  }))
                }
              />
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-[#c9d6dc]">
            <input
              checked={input.status === "published"}
              type="checkbox"
              onChange={(event) =>
                setInput({
                  ...input,
                  status: event.target.checked ? "published" : "draft",
                })
              }
            />{" "}
            Publicar para atletas
          </label>
          <div className="mt-2 flex justify-end gap-2 border-t border-[#29313a] pt-4">
            <button className="secondary !px-3 !py-2 !text-xs" onClick={onCancel}>
              Cancelar
            </button>
            <button
              className="primary !px-3 !py-2 !text-xs"
              onClick={() => onSave(input)}
            >
              Salvar jogada
            </button>
          </div>
        </div>
      </aside>
    </section>
  );
}

export function PlaybookView({
  plays,
  actor,
  onCreate,
  onUpdate,
  onDelete,
}: {
  plays: Play[];
  actor: Member;
  onCreate: (input: PlayInput) => boolean;
  onUpdate: (play: Play, input: PlayInput) => boolean;
  onDelete: (play: Play) => void;
}) {
  const [selectedId, setSelectedId] = useState(plays[0]?.id ?? "");
  const [editing, setEditing] = useState<Play | null | undefined>(undefined);
  const [filter, setFilter] = useState<"all" | Play["unit"]>("all");
  const visible = plays.filter((play) => filter === "all" || play.unit === filter);
  const selected = visible.find((play) => play.id === selectedId) ?? visible[0];
  const canManage = actor.status === "active" && actor.roles.includes("coach");
  if (editing !== undefined)
    return (
      <section className="panel p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="eyebrow">PLAYBOOK</p>
            <h2 className="mt-1 text-xl font-bold">
              {editing ? "Editar jogada" : "Nova jogada"}
            </h2>
          </div>
        </div>
        <PlayEditor
          play={editing}
          onCancel={() => setEditing(undefined)}
          onSave={(input) => {
            const saved = editing ? onUpdate(editing, input) : onCreate(input);
            if (saved) setEditing(undefined);
            return saved;
          }}
        />
      </section>
    );
  return (
    <section className="grid gap-5">
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">ESTRATÉGIA DO TIME</p>
            <h2 className="mt-1 text-xl font-bold">Playbook</h2>
            <p className="mt-2 text-sm text-[#aebbc4]">
              Desenhe, publique e consulte conceitos de flag football 5x5.
            </p>
          </div>
          {canManage && (
            <button className="primary" onClick={() => setEditing(null)}>
              <Plus size={16} /> Nova jogada
            </button>
          )}
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="panel p-3">
          <div className="mb-3 flex rounded-lg border border-[#303942] bg-[#0d1115] p-1">
            {(
              [
                ["all", "Todas"],
                ["attack", "Ataque"],
                ["defense", "Defesa"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold ${filter === value ? "bg-[#1d4054] text-[#dff6ff]" : "text-[#9dacb6]"}`}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            {visible.map((play) => (
              <button
                key={play.id}
                className={`rounded-lg border p-3 text-left transition-colors ${selected?.id === play.id ? "border-[#58cfff] bg-[#142630]" : "border-[#303942] bg-[#11161b] hover:bg-[#182129]"}`}
                onClick={() => setSelectedId(play.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{play.title}</span>
                  <ChevronRight size={15} />
                </div>
                <p className="mt-1 text-xs text-[#a5b3bc]">
                  {playUnitLabel[play.unit]} ·{" "}
                  {play.status === "published" ? "Publicado" : "Rascunho"}
                </p>
              </button>
            ))}
            {!visible.length && (
              <p className="p-4 text-center text-sm text-[#82929d]">
                Nenhuma jogada nesta unidade.
              </p>
            )}
          </div>
        </aside>
        {selected ? (
          <article className="panel p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#173447] px-2 py-1 text-[10px] font-bold text-[#8fe0ff]">
                    {playUnitLabel[selected.unit]}
                  </span>
                  <span className="text-xs text-[#98a7b1]">
                    {selected.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-bold">{selected.title}</h3>
                <p className="mt-2 text-sm text-[#b8c5cd]">
                  {selected.description || "Sem descrição."}
                </p>
              </div>
              {canManage && (
                <RecordActionsMenu
                  label={`Opções de ${selected.title}`}
                  actions={[
                    {
                      id: "edit",
                      label: "Editar",
                      allowed: true,
                      onSelect: () => setEditing(selected),
                    },
                    {
                      id: "delete",
                      label: "Excluir",
                      allowed: actor.isAdmin,
                      destructive: true,
                      onSelect: () => onDelete(selected),
                    },
                  ]}
                />
              )}
            </div>
            <Field elements={selected.elements} />
            {selected.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.tags.map((tag) => (
                  <span
                    className="rounded-full border border-[#31434f] px-2 py-1 text-xs text-[#b9c7cf]"
                    key={tag}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        ) : (
          <article className="panel grid min-h-80 place-items-center p-8 text-center text-sm text-[#91a1ad]">
            <BookOpen className="mb-3 text-[#58cfff]" />
            Selecione uma jogada para consultar.
          </article>
        )}
      </section>
    </section>
  );
}
