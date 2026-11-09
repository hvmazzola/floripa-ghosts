"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  Spline,
  Trash2,
  Undo2,
  Waypoints,
} from "lucide-react";

import { RecordActionsMenu } from "@/components/record-actions-menu";
import {
  playUnitLabel,
  simplifyCurveRoute,
  appendRoutePoint,
  addManCoverage,
  branchRoute,
  getVisibleFieldMarkers,
  moveZone,
  movePlayerAndAttachedRoutes,
  moveRoutePoint,
  nextPlayerLabel,
  redoPlayFieldHistory,
  resizeZone,
  getFieldHashmarkYards,
  playFieldGeometry,
  snapPlayerPosition,
  startRoute,
  startZone,
  updatePlayer,
  updatePlayerSide,
  updateRouteColor,
  undoPlayFieldHistory,
  type Play,
  type PlayElement,
  type PlayInput,
  type PlayPoint,
  type PlayerElement,
  type RouteElement,
  type RouteLineStyle,
  type PlaySnapGuide,
  type ZoneElement,
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

type EditorTool = "select" | "broken" | "curve" | "zone" | "man";
const playerColorOptions = [
  { label: "Amarelo", value: "#facc15", className: "bg-yellow-400" },
  { label: "Azul", value: "#2563eb", className: "bg-blue-600" },
  { label: "Branco", value: "#ffffff", className: "bg-white" },
  { label: "Verde", value: "#16a34a", className: "bg-green-600" },
  { label: "Vermelho", value: "#dc2626", className: "bg-red-600" },
  { label: "Preto", value: "#050505", className: "bg-black" },
] as const;
const FIELD_WIDTH = 1000;
const FIELD_HEIGHT = playFieldGeometry.height;
const FIELD_Y_SCALE = FIELD_HEIGHT / 100;
const FIELD_DRAWING_TOP = 26;
const SCRIMMAGE_LINE_Y = fieldY(playFieldGeometry.scrimmageY);

function fieldX(value: number) {
  return value * 10;
}

function fieldY(value: number) {
  return value * FIELD_Y_SCALE;
}

function yardLineY(yards: number) {
  const routeAreaHeight = SCRIMMAGE_LINE_Y - FIELD_DRAWING_TOP;
  const y = SCRIMMAGE_LINE_Y - yards * (routeAreaHeight / playFieldGeometry.routeYards);

  return y / FIELD_Y_SCALE;
}

const END_ZONE_GOAL_LINE_Y = fieldY(yardLineY(playFieldGeometry.endZoneYards));

function curveControls(route: RouteElement) {
  if (route.curveControls?.length === route.points.length) return route.curveControls;
  return route.points.map((point, index) => {
    const previous = route.points[Math.max(0, index - 1)];
    const next = route.points[Math.min(route.points.length - 1, index + 1)];
    const dx = (next.x - previous.x) / 5;
    const dy = (next.y - previous.y) / 5;
    return {
      in: { x: point.x - dx, y: point.y - dy },
      out: { x: point.x + dx, y: point.y + dy },
    };
  });
}

function curvePath(route: RouteElement) {
  const controls = curveControls(route);
  return route.points.reduce(
    (path, point, index) =>
      index === 0
        ? `M ${fieldX(point.x)} ${fieldY(point.y)}`
        : `${path} C ${fieldX(controls[index - 1].out.x)} ${fieldY(controls[index - 1].out.y)}, ${fieldX(controls[index].in.x)} ${fieldY(controls[index].in.y)}, ${fieldX(point.x)} ${fieldY(point.y)}`,
    "",
  );
}

function curveSamplePoints(route: RouteElement) {
  const controls = curveControls(route);
  return route.points.flatMap((point, index) => {
    if (index === 0) return [point];
    const previous = route.points[index - 1];
    const control = controls[index - 1];
    const nextControl = controls[index];
    return Array.from({ length: 10 }, (_, step) => {
      const progress = (step + 1) / 10;
      const inverse = 1 - progress;
      return {
        x:
          inverse ** 3 * previous.x +
          3 * inverse ** 2 * progress * control.out.x +
          3 * inverse * progress ** 2 * nextControl.in.x +
          progress ** 3 * point.x,
        y:
          inverse ** 3 * previous.y +
          3 * inverse ** 2 * progress * control.out.y +
          3 * inverse * progress ** 2 * nextControl.in.y +
          progress ** 3 * point.y,
      };
    });
  });
}

function motionPoints(route: RouteElement, source = route.points) {
  const points = source.flatMap((point, index) => {
    if (index === 0) return [point];
    const previous = source[index - 1];
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
    const steps = Math.max(1, Math.floor(distance / 1.75));
    const perpendicular = {
      x: distance ? -(point.y - previous.y) / distance : 0,
      y: distance ? (point.x - previous.x) / distance : 0,
    };
    return Array.from({ length: steps }, (_, step) => {
      const progress = (step + 1) / steps;
      const isEndpoint = step + 1 === steps;
      const offset = isEndpoint ? 0 : step % 2 === 0 ? 0.45 : -0.45;
      return {
        x: previous.x + (point.x - previous.x) * progress + perpendicular.x * offset,
        y: previous.y + (point.y - previous.y) * progress + perpendicular.y * offset,
      };
    });
  });
  return points.map((point) => `${fieldX(point.x)},${fieldY(point.y)}`).join(" ");
}

function playerGuideSegment(from: PlayPoint, to: PlayPoint) {
  const start = { x: fieldX(from.x), y: fieldY(from.y) };
  const end = { x: fieldX(to.x), y: fieldY(to.y) };
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  if (distance <= 68) return { start, end };
  const offsetX = ((end.x - start.x) / distance) * 34;
  const offsetY = ((end.y - start.y) / distance) * 34;
  return {
    start: { x: start.x + offsetX, y: start.y + offsetY },
    end: { x: end.x - offsetX, y: end.y - offsetY },
  };
}

function playerTextColor(color?: string) {
  if (!color?.startsWith("#") || color.length !== 7) return "#f4fbff";
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  const brightness = red * 0.299 + green * 0.587 + blue * 0.114;

  return brightness > 165 ? "#071018" : "#f4fbff";
}

function Field({
  elements,
  editable = false,
  selectedId,
  onSelect,
  onChange,
  onCommit,
  tool = "select",
  lineStyle = "solid",
  routeColor = "#58cfff",
  endZoneMode = false,
}: {
  elements: PlayElement[];
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onChange?: (elements: PlayElement[]) => void;
  onCommit?: (before: PlayElement[]) => void;
  tool?: EditorTool;
  lineStyle?: RouteLineStyle;
  routeColor?: string;
  endZoneMode?: boolean;
}) {
  const fieldRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<
    | { kind: "player"; id: string }
    | { kind: "point"; routeId: string; pointIndex: number }
    | { kind: "control"; routeId: string; pointIndex: number; handle: "in" | "out" }
    | { kind: "zone"; zoneId: string; resize?: "x" | "y" }
    | null
  >(null);
  const draggingRef = useRef<typeof dragging>(null);
  const [selectedAnchor, setSelectedAnchor] = useState<{
    routeId: string;
    pointIndex: number;
  } | null>(null);
  const [branchAnchor, setBranchAnchor] = useState<{
    routeId: string;
    pointIndex: number;
  } | null>(null);
  const [snapGuides, setSnapGuides] = useState<
    {
      kind: PlaySnapGuide;
      from: PlayPoint;
      to?: PlayPoint;
    }[]
  >([]);
  const gestureBefore = useRef<PlayElement[] | null>(null);
  const drawingRouteId = useRef<string | null>(null);
  const pendingCurveStart = useRef<string | null>(null);
  const curveElements = useRef<PlayElement[] | null>(null);
  const branchOrigin = useRef<{
    fromRouteId: string;
    point: { x: number; y: number };
  } | null>(null);
  const lastCurvePoint = useRef<{ x: number; y: number } | null>(null);
  const players = elements.filter(
    (element): element is PlayerElement => element.kind === "player",
  );
  const zones = elements.filter(
    (element): element is ZoneElement => element.kind === "zone",
  );
  const manCoverages = elements.filter((element) => element.kind === "man-coverage");
  const pointFromEvent = (event: React.PointerEvent<SVGElement>) => {
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
  const beginDragging = (next: NonNullable<typeof dragging>) => {
    draggingRef.current = next;
    setDragging(next);
  };
  const moveRouteControl = (
    routeId: string,
    pointIndex: number,
    handle: "in" | "out",
    point: { x: number; y: number },
  ) =>
    elements.map((element) => {
      if (element.kind !== "route" || element.id !== routeId) return element;
      const controls = curveControls(element);
      return {
        ...element,
        curveControls: controls.map((control, index) =>
          index === pointIndex ? { ...control, [handle]: point } : control,
        ),
      };
    });
  const selectBranchAnchor = (
    route: RouteElement,
    point: { x: number; y: number },
    pointIndex: number,
  ) => {
    onSelect?.(route.id);
    setSelectedAnchor(null);
    setBranchAnchor({ routeId: route.id, pointIndex });
    branchOrigin.current = { fromRouteId: route.id, point };
    drawingRouteId.current = null;
  };
  const completeGesture = () => {
    if (tool === "curve" && drawingRouteId.current) {
      onChange?.(
        simplifyCurveRoute(curveElements.current ?? elements, drawingRouteId.current),
      );
    }
    if (gestureBefore.current) onCommit?.(gestureBefore.current);
    gestureBefore.current = null;
    draggingRef.current = null;
    setDragging(null);
    drawingRouteId.current = null;
    pendingCurveStart.current = null;
    curveElements.current = null;
    branchOrigin.current = null;
    setBranchAnchor(null);
    setSnapGuides([]);
    lastCurvePoint.current = null;
  };
  const drawBrokenRoute = (point: { x: number; y: number }) => {
    const selected = elements.find((element) => element.id === selectedId);
    const before = elements;
    if (drawingRouteId.current) {
      onChange?.(appendRoutePoint(elements, drawingRouteId.current, point));
    } else if (branchOrigin.current) {
      const next = branchRoute(
        elements,
        branchOrigin.current.fromRouteId,
        branchOrigin.current.point,
        point,
        "broken",
        { lineStyle, color: routeColor },
      );
      drawingRouteId.current = next.at(-1)?.id ?? null;
      branchOrigin.current = null;
      setBranchAnchor(null);
      onChange?.(next);
    } else if (selected?.kind === "player") {
      const next = startRoute(elements, selected.id, point, "broken", {
        lineStyle,
        color: routeColor,
      });
      drawingRouteId.current = next.at(-1)?.id ?? null;
      onChange?.(next);
    }
    onCommit?.(before);
  };
  const startCurveRoute = (point: { x: number; y: number }, playerId?: string) => {
    const selected = elements.find(
      (element) => element.id === (playerId ?? selectedId),
    );
    gestureBefore.current = elements;
    const next = branchOrigin.current
      ? branchRoute(
          elements,
          branchOrigin.current.fromRouteId,
          branchOrigin.current.point,
          point,
          "curve",
          { lineStyle, color: routeColor },
        )
      : selected?.kind === "player"
        ? startRoute(elements, selected.id, point, "curve", {
            lineStyle,
            color: routeColor,
          })
        : elements;
    if (next === elements) return;
    drawingRouteId.current = next.at(-1)?.id ?? null;
    branchOrigin.current = null;
    setBranchAnchor(null);
    lastCurvePoint.current = point;
    curveElements.current = next;
    onChange?.(next);
  };
  const createZone = (point: PlayPoint) => {
    const selected = elements.find((element) => element.id === selectedId);
    if (selected?.kind !== "player") return;
    const next = startZone(elements, selected.id, point);
    if (next === elements) return;
    onCommit?.(elements);
    onChange?.(next);
    onSelect?.(next.at(-1)?.id ?? null);
  };
  return (
    <div className="overflow-hidden rounded-xl border border-[#31434f] bg-[#081217]">
      <svg
        ref={fieldRef}
        aria-label="Campo tático de flag football"
        className="aspect-[10/7] w-full touch-none"
        viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
        onPointerDown={(event) => {
          if (!editable || tool === "select") {
            onSelect?.(null);
            return;
          }
          const point = pointFromEvent(event);
          if (tool === "broken") drawBrokenRoute(point);
          if (tool === "curve") startCurveRoute(point);
          if (tool === "zone") createZone(point);
        }}
        onPointerMove={(event) => {
          if (!editable) return;
          const point = pointFromEvent(event);
          const activeDrag = draggingRef.current ?? dragging;
          if (activeDrag?.kind === "player") {
            const snapped = snapPlayerPosition(elements, activeDrag.id, point);
            const nextGuides: {
              kind: PlaySnapGuide;
              from: PlayPoint;
              to?: PlayPoint;
            }[] = [];
            for (const kind of snapped.guides) {
              if (kind === "scrimmage" || kind === "midfield") {
                nextGuides.push({ kind, from: snapped.point });
                continue;
              }
              const alignedPlayer = elements.find(
                (element): element is PlayerElement =>
                  element.kind === "player" &&
                  element.id !== activeDrag.id &&
                  (kind === "horizontal"
                    ? element.y === snapped.point.y
                    : element.x === snapped.point.x),
              );
              if (alignedPlayer) {
                nextGuides.push({
                  kind,
                  from: snapped.point,
                  to: { x: alignedPlayer.x, y: alignedPlayer.y },
                });
              }
            }
            setSnapGuides(nextGuides);
            onChange?.(
              movePlayerAndAttachedRoutes(
                elements,
                activeDrag.id,
                snapped.point.x,
                snapped.point.y,
              ),
            );
          }
          if (activeDrag?.kind === "point") {
            onChange?.(
              moveRoutePoint(
                elements,
                activeDrag.routeId,
                activeDrag.pointIndex,
                point,
              ),
            );
          }
          if (activeDrag?.kind === "control") {
            onChange?.(
              moveRouteControl(
                activeDrag.routeId,
                activeDrag.pointIndex,
                activeDrag.handle,
                point,
              ),
            );
          }
          if (activeDrag?.kind === "zone") {
            const zone = zones.find((current) => current.id === activeDrag.zoneId);
            if (!zone) return;
            if (activeDrag.resize === "x") {
              onChange?.(
                resizeZone(
                  elements,
                  zone.id,
                  Math.abs(point.x - zone.center.x),
                  zone.radiusY,
                ),
              );
            } else if (activeDrag.resize === "y") {
              onChange?.(
                resizeZone(
                  elements,
                  zone.id,
                  zone.radiusX,
                  Math.abs(point.y - zone.center.y),
                ),
              );
            } else {
              onChange?.(moveZone(elements, zone.id, point));
            }
          }
          const pendingPlayerId = pendingCurveStart.current;
          const hasPendingBranch = branchOrigin.current !== null;
          const startedCurve =
            tool === "curve" &&
            (pendingPlayerId !== null || hasPendingBranch) &&
            event.buttons === 1;
          if (startedCurve && pendingPlayerId) {
            pendingCurveStart.current = null;
            startCurveRoute(point, pendingPlayerId);
          } else if (startedCurve && hasPendingBranch) {
            startCurveRoute(point);
          }
          if (
            tool === "curve" &&
            !startedCurve &&
            drawingRouteId.current &&
            event.buttons === 1
          ) {
            const last = lastCurvePoint.current;
            if (!last || Math.hypot(point.x - last.x, point.y - last.y) >= 1.5) {
              const next = appendRoutePoint(
                curveElements.current ?? elements,
                drawingRouteId.current,
                point,
              );
              curveElements.current = next;
              onChange?.(next);
              lastCurvePoint.current = point;
            }
          }
        }}
        onPointerUp={() => {
          if (pendingCurveStart.current) pendingCurveStart.current = null;
          setSnapGuides([]);
          if (
            draggingRef.current ||
            dragging ||
            (tool === "curve" && drawingRouteId.current)
          )
            completeGesture();
        }}
        onPointerLeave={() => {
          if (pendingCurveStart.current) pendingCurveStart.current = null;
          setSnapGuides([]);
          if (
            draggingRef.current ||
            dragging ||
            (tool === "curve" && drawingRouteId.current)
          )
            completeGesture();
        }}
      >
        <defs>
          <marker
            id="play-arrow"
            markerWidth="4"
            markerHeight="4"
            refX="0"
            refY="2"
            orient="auto"
          >
            <path d="M0,0 L0,4 L4,2 Z" fill="context-stroke" />
          </marker>
        </defs>
        <rect width={FIELD_WIDTH} height={FIELD_HEIGHT} fill="#0c2a2c" />
        <rect
          x="26"
          y="26"
          width="948"
          height="648"
          fill="#0c2a2c"
          stroke="#74a18a"
          strokeWidth="3"
        />
        {endZoneMode && (
          <>
            <rect
              x="26"
              y="26"
              width="948"
              height={END_ZONE_GOAL_LINE_Y - 26}
              fill="#17394a"
              opacity=".65"
            />
            <line
              x1="26"
              x2="974"
              y1={END_ZONE_GOAL_LINE_Y}
              y2={END_ZONE_GOAL_LINE_Y}
              stroke="#58cfff"
              strokeWidth="2"
              opacity=".8"
            />
            {[
              [26, 26],
              [966, 26],
              [26, END_ZONE_GOAL_LINE_Y - 8],
              [966, END_ZONE_GOAL_LINE_Y - 8],
            ].map(([x, y]) => (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width="8"
                height="8"
                fill="#f59e0b"
                rx="1"
              />
            ))}
          </>
        )}
        {getVisibleFieldMarkers(endZoneMode).map((yards) => {
          const strong = yards === 0;
          const label = strong ? "LOS" : String(yards);
          const y = strong ? playFieldGeometry.scrimmageY : yardLineY(yards);

          return (
            <g key={label}>
              <line
                x1="26"
                x2="974"
                y1={fieldY(y)}
                y2={fieldY(y)}
                stroke={strong ? "#d8f5ff" : "#315064"}
                strokeDasharray={strong ? "10 12" : undefined}
                strokeWidth={strong ? "2" : "1.75"}
                opacity={strong ? ".55" : ".8"}
              />
              <text
                x="38"
                y={fieldY(y) - 8}
                fill="#84aab2"
                fontSize="20"
                fontWeight="700"
              >
                {label}
              </text>
            </g>
          );
        })}
        {getFieldHashmarkYards().map((yard) => {
          const y = Math.max(26, fieldY(yardLineY(yard)));
          const centerX = fieldX(playFieldGeometry.midfieldX);

          return (
            <line
              key={`hashmark-${yard}`}
              x1={centerX - 12}
              x2={centerX + 12}
              y1={y}
              y2={y}
              stroke="#315064"
              strokeWidth="1.5"
              opacity=".9"
            />
          );
        })}
        {snapGuides.map((guide) => {
          const segment = guide.to ? playerGuideSegment(guide.from, guide.to) : null;
          return (
            <line
              key={`${guide.kind}-${guide.from.x}-${guide.from.y}`}
              x1={
                guide.kind === "midfield"
                  ? 500
                  : guide.kind === "scrimmage"
                    ? 26
                    : segment?.start.x
              }
              x2={
                guide.kind === "midfield"
                  ? 500
                  : guide.kind === "scrimmage"
                    ? 974
                    : segment?.end.x
              }
              y1={
                guide.kind === "midfield"
                  ? 26
                  : guide.kind === "scrimmage"
                    ? fieldY(playFieldGeometry.scrimmageY)
                    : segment?.start.y
              }
              y2={
                guide.kind === "midfield"
                  ? 674
                  : guide.kind === "scrimmage"
                    ? fieldY(playFieldGeometry.scrimmageY)
                    : segment?.end.y
              }
              stroke="#58cfff"
              strokeDasharray="7 7"
              strokeWidth="2"
              opacity=".8"
            />
          );
        })}
        {zones.map((zone) => {
          const defender = players.find((player) => player.id === zone.defenderId);
          if (!defender) return null;
          const selected = selectedId === zone.id;
          const selectZone = (event: React.SyntheticEvent<SVGElement>) => {
            event.stopPropagation();
            onSelect?.(zone.id);
          };

          return (
            <g key={zone.id}>
              <line
                x1={fieldX(defender.x)}
                x2={fieldX(zone.center.x)}
                y1={fieldY(defender.y)}
                y2={fieldY(zone.center.y)}
                stroke="#c084fc"
                strokeWidth="3"
              />
              <ellipse
                className={editable ? "cursor-move" : ""}
                cx={fieldX(zone.center.x)}
                cy={fieldY(zone.center.y)}
                fill="#a855f7"
                fillOpacity=".13"
                rx={fieldX(zone.radiusX)}
                ry={fieldY(zone.radiusY)}
                stroke="#c084fc"
                strokeDasharray="8 7"
                strokeWidth={selected ? "4" : "2.5"}
                onClick={selectZone}
                onPointerDown={(event) => {
                  selectZone(event);
                  if (!editable || (tool !== "select" && tool !== "zone")) return;
                  gestureBefore.current = elements;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  beginDragging({ kind: "zone", zoneId: zone.id });
                }}
              />
              {editable && selected && (
                <>
                  <circle
                    cx={fieldX(zone.center.x + zone.radiusX)}
                    cy={fieldY(zone.center.y)}
                    r="8"
                    fill="#c084fc"
                    stroke="#071018"
                    strokeWidth="3"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      gestureBefore.current = elements;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      beginDragging({ kind: "zone", zoneId: zone.id, resize: "x" });
                    }}
                  />
                  <circle
                    cx={fieldX(zone.center.x)}
                    cy={fieldY(zone.center.y - zone.radiusY)}
                    r="8"
                    fill="#c084fc"
                    stroke="#071018"
                    strokeWidth="3"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      gestureBefore.current = elements;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      beginDragging({ kind: "zone", zoneId: zone.id, resize: "y" });
                    }}
                  />
                </>
              )}
            </g>
          );
        })}
        {manCoverages.map((coverage) => {
          const defender = players.find((player) => player.id === coverage.defenderId);
          const attacker = players.find((player) => player.id === coverage.attackerId);
          if (!defender || !attacker) return null;

          return (
            <line
              className={editable ? "cursor-pointer" : ""}
              key={coverage.id}
              x1={fieldX(defender.x)}
              x2={fieldX(attacker.x)}
              y1={fieldY(defender.y)}
              y2={fieldY(attacker.y)}
              stroke="#facc15"
              strokeDasharray="9 8"
              strokeWidth={selectedId === coverage.id ? "4" : "2.5"}
              onClick={(event) => {
                event.stopPropagation();
                onSelect?.(coverage.id);
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelect?.(coverage.id);
              }}
            />
          );
        })}
        {elements
          .filter((element) => element.kind === "route")
          .map((route) => {
            const points = route.points
              .map((point) => `${fieldX(point.x)},${fieldY(point.y)}`)
              .join(" ");
            const isCurve = route.style === "curve";
            const isMotion = route.lineStyle === "motion";
            const strokeDasharray = route.lineStyle === "dashed" ? "12 10" : undefined;
            const renderedPoints = isMotion
              ? motionPoints(route, isCurve ? curveSamplePoints(route) : route.points)
              : points;
            const selected = selectedId === route.id;
            const controls = curveControls(route);
            const selectRoute = (event: React.SyntheticEvent<SVGElement>) => {
              event.stopPropagation();
              onSelect?.(route.id);
              setSelectedAnchor(null);
              setBranchAnchor(null);
              branchOrigin.current = null;
            };
            return (
              <g key={route.id}>
                {isCurve && !isMotion ? (
                  <path
                    d={curvePath(route)}
                    fill="none"
                    markerEnd="url(#play-arrow)"
                    stroke={route.color}
                    strokeLinecap="round"
                    strokeDasharray={strokeDasharray}
                    strokeWidth="7"
                    onClick={selectRoute}
                    onPointerDown={selectRoute}
                  />
                ) : (
                  <polyline
                    fill="none"
                    markerEnd="url(#play-arrow)"
                    points={renderedPoints}
                    stroke={route.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={strokeDasharray}
                    strokeWidth="7"
                    onClick={selectRoute}
                    onPointerDown={selectRoute}
                  />
                )}
                {editable && (
                  <path
                    d={isCurve ? curvePath(route) : `M ${points}`}
                    fill="none"
                    className="cursor-pointer"
                    pointerEvents="stroke"
                    stroke="transparent"
                    strokeWidth="30"
                    onClick={selectRoute}
                    onPointerDown={selectRoute}
                  />
                )}
                {editable &&
                  selected &&
                  !isCurve &&
                  route.points.slice(1).map((point, index) => (
                    <circle
                      key={`${route.id}-${index}`}
                      cx={fieldX(point.x)}
                      cy={fieldY(point.y)}
                      r="9"
                      fill={
                        branchAnchor?.routeId === route.id &&
                        branchAnchor.pointIndex === index + 1
                          ? "#58cfff"
                          : selectedId === route.id
                            ? "#f5fbff"
                            : route.color
                      }
                      stroke={
                        branchAnchor?.routeId === route.id &&
                        branchAnchor.pointIndex === index + 1
                          ? "#f5fbff"
                          : "#0b1620"
                      }
                      strokeWidth="3"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        if (tool !== "select") {
                          event.currentTarget.setPointerCapture(event.pointerId);
                          selectBranchAnchor(route, point, index + 1);
                          return;
                        }
                        gestureBefore.current = elements;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        beginDragging({
                          kind: "point",
                          routeId: route.id,
                          pointIndex: index + 1,
                        });
                        onSelect?.(route.id);
                      }}
                    />
                  ))}
                {editable &&
                  selected &&
                  isCurve &&
                  route.points.map((point, index) => (
                    <g key={`${route.id}-anchor-${index}`}>
                      {selectedAnchor?.routeId === route.id &&
                        selectedAnchor.pointIndex === index && (
                          <>
                            <line
                              x1={fieldX(point.x)}
                              y1={fieldY(point.y)}
                              x2={fieldX(controls[index].in.x)}
                              y2={fieldY(controls[index].in.y)}
                              stroke="#8ea7b2"
                              strokeDasharray="4 4"
                              strokeWidth="2"
                            />
                            <line
                              x1={fieldX(point.x)}
                              y1={fieldY(point.y)}
                              x2={fieldX(controls[index].out.x)}
                              y2={fieldY(controls[index].out.y)}
                              stroke="#8ea7b2"
                              strokeDasharray="4 4"
                              strokeWidth="2"
                            />
                            {(["in", "out"] as const).map((handle) => (
                              <circle
                                key={handle}
                                cx={fieldX(controls[index][handle].x)}
                                cy={fieldY(controls[index][handle].y)}
                                r="8"
                                fill="#58cfff"
                                stroke="#071018"
                                strokeWidth="3"
                                onPointerDown={(event) => {
                                  if (tool !== "select") return;
                                  event.stopPropagation();
                                  gestureBefore.current = elements;
                                  event.currentTarget.setPointerCapture(
                                    event.pointerId,
                                  );
                                  beginDragging({
                                    kind: "control",
                                    routeId: route.id,
                                    pointIndex: index,
                                    handle,
                                  });
                                }}
                              />
                            ))}
                          </>
                        )}
                      <circle
                        cx={fieldX(point.x)}
                        cy={fieldY(point.y)}
                        r="9"
                        fill={
                          branchAnchor?.routeId === route.id &&
                          branchAnchor.pointIndex === index
                            ? "#58cfff"
                            : "#f5fbff"
                        }
                        stroke={
                          branchAnchor?.routeId === route.id &&
                          branchAnchor.pointIndex === index
                            ? "#f5fbff"
                            : route.color
                        }
                        strokeWidth="3"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          if (tool !== "select") {
                            event.currentTarget.setPointerCapture(event.pointerId);
                            selectBranchAnchor(route, point, index);
                            return;
                          }
                          setSelectedAnchor({ routeId: route.id, pointIndex: index });
                          gestureBefore.current = elements;
                          event.currentTarget.setPointerCapture(event.pointerId);
                          beginDragging({
                            kind: "point",
                            routeId: route.id,
                            pointIndex: index,
                          });
                        }}
                      />
                    </g>
                  ))}
              </g>
            );
          })}
        {players.map((player) => (
          <g
            className={
              editable && tool === "select"
                ? "cursor-grab active:cursor-grabbing"
                : editable
                  ? "cursor-crosshair"
                  : ""
            }
            key={player.id}
            transform={`translate(${fieldX(player.x)} ${fieldY(player.y)})`}
            onPointerDown={(event) => {
              if (!editable) return;
              event.stopPropagation();
              const selected = elements.find(
                (element): element is PlayerElement =>
                  element.kind === "player" && element.id === selectedId,
              );
              if (
                tool === "man" &&
                selected?.side === "defense" &&
                player.side === "offense"
              ) {
                const next = addManCoverage(elements, selected.id, player.id);
                if (next !== elements) {
                  onCommit?.(elements);
                  onChange?.(next);
                }
                onSelect?.(selected.id);
                return;
              }
              onSelect?.(player.id);
              drawingRouteId.current = null;
              branchOrigin.current = null;
              setBranchAnchor(null);
              if (tool === "curve") {
                pendingCurveStart.current = player.id;
                event.currentTarget.setPointerCapture(event.pointerId);
                return;
              }
              if (tool !== "select") return;
              gestureBefore.current = elements;
              event.currentTarget.setPointerCapture(event.pointerId);
              beginDragging({ kind: "player", id: player.id });
            }}
          >
            <circle
              r="29"
              fill={player.color ?? (player.side === "offense" ? "#102c3e" : "#3a2027")}
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
              fill={playerTextColor(player.color)}
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
  const [tool, setTool] = useState<EditorTool>("select");
  const [activeSide, setActiveSide] = useState<PlayerElement["side"]>("offense");
  const [lineStyle, setLineStyle] = useState<RouteLineStyle>("solid");
  const [routeAlert, setRouteAlert] = useState(false);
  const [endZoneMode, setEndZoneMode] = useState(false);
  const [fieldHistory, setFieldHistory] = useState<PlayElement[][]>([]);
  const [redoHistory, setRedoHistory] = useState<PlayElement[][]>([]);
  const selectedPlayer = input.elements.find(
    (element): element is PlayerElement =>
      element.kind === "player" && element.id === selectedId,
  );
  const selectedRoute = input.elements.find(
    (element): element is RouteElement =>
      element.kind === "route" && element.id === selectedId,
  );
  const selectedDefender = activeSide === "defense";
  const addPlayer = () => {
    const player: PlayerElement = {
      id: crypto.randomUUID(),
      kind: "player",
      label: nextPlayerLabel(input.elements),
      x: 50,
      y: 45,
      side: activeSide,
    };
    commitField(input.elements);
    setInput((current) => ({ ...current, elements: [...current.elements, player] }));
    setSelectedId(player.id);
  };
  const commitField = (before: PlayElement[]) => {
    setFieldHistory((history) => [...history, before].slice(-50));
    setRedoHistory([]);
  };
  const updateField = (elements: PlayElement[]) =>
    setInput((current) => ({ ...current, elements }));
  const updateSelectedPlayer = (
    updates: Partial<Pick<PlayerElement, "label" | "color">>,
  ) => {
    if (!selectedPlayer) return;
    updateField(updatePlayer(input.elements, selectedPlayer.id, updates));
  };
  const updateSelectedPlayerSide = (side: PlayerElement["side"]) => {
    if (!selectedPlayer || selectedPlayer.side === side) return;
    commitField(input.elements);
    updateField(updatePlayerSide(input.elements, selectedPlayer.id, side));
    setActiveSide(side);
    setTool("select");
  };
  const selectFieldElement = (id: string | null) => {
    setSelectedId(id);
    const element = input.elements.find((current) => current.id === id);
    setRouteAlert(element?.kind === "route" && element.color === "#b91c1c");
    if (element?.kind === "player") setActiveSide(element.side);
    if (element?.kind === "route") setActiveSide("offense");
    if (element?.kind === "zone" || element?.kind === "man-coverage") {
      setActiveSide("defense");
    }
  };
  const toggleSelectedRouteColor = () => {
    if (!selectedRoute) return;
    const nextAlert = selectedRoute.color !== "#b91c1c";
    setRouteAlert(nextAlert);
    commitField(input.elements);
    updateField(
      updateRouteColor(
        input.elements,
        selectedRoute.id,
        nextAlert ? "#b91c1c" : "#58cfff",
      ),
    );
  };
  const undoField = useCallback(() => {
    const transition = undoPlayFieldHistory(input.elements, fieldHistory, redoHistory);
    if (transition.elements === input.elements) return;
    updateField(transition.elements);
    setFieldHistory(transition.past);
    setRedoHistory(transition.future);
    setSelectedId(null);
  }, [fieldHistory, input.elements, redoHistory]);
  const redoField = useCallback(() => {
    const transition = redoPlayFieldHistory(input.elements, fieldHistory, redoHistory);
    if (transition.elements === input.elements) return;
    updateField(transition.elements);
    setFieldHistory(transition.past);
    setRedoHistory(transition.future);
    setSelectedId(null);
  }, [fieldHistory, input.elements, redoHistory]);
  useEffect(() => {
    const handleUndo = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      )
        return;
      event.preventDefault();
      if (event.shiftKey) redoField();
      else undoField();
    };

    window.addEventListener("keydown", handleUndo);
    return () => window.removeEventListener("keydown", handleUndo);
  }, [redoField, undoField]);
  const removeSelected = () => {
    if (!selectedId) return;
    const selected = input.elements.find((element) => element.id === selectedId);
    commitField(input.elements);
    setInput((current) => ({
      ...current,
      elements: current.elements.filter((element) => {
        if (element.id === selectedId) return false;
        if (selected?.kind !== "player") return true;
        return !(
          (element.kind === "route" && element.fromPlayerId === selected.id) ||
          ((element.kind === "zone" || element.kind === "man-coverage") &&
            element.defenderId === selected.id) ||
          (element.kind === "man-coverage" && element.attackerId === selected.id)
        );
      }),
    }));
    setSelectedId(null);
  };
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-3">
        <section className="rounded-xl border border-[#303942] bg-[#10151a] p-3">
          <label className="grid gap-1.5">
            <span className="field-label">Rótulo do jogador selecionado</span>
            <input
              className="w-full rounded-md border border-[#35414a] bg-[#0b0d10] px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedPlayer}
              value={selectedPlayer?.label ?? ""}
              onChange={(event) =>
                updateField(
                  input.elements.map((element) =>
                    element.kind === "player" && element.id === selectedPlayer?.id
                      ? { ...element, label: event.target.value.slice(0, 4) }
                      : element,
                  ),
                )
              }
              placeholder="Selecione um jogador no campo"
            />
          </label>
          <div className="mt-3 grid gap-1.5">
            <span className="field-label">Modo do jogador</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["offense", "Ataque"],
                  ["defense", "Defesa"],
                ] as const
              ).map(([side, label]) => (
                <button
                  aria-pressed={selectedPlayer?.side === side}
                  className={`secondary !px-3 !py-2 !text-xs ${selectedPlayer?.side === side ? "!border-[#58cfff] !bg-[#163142] !text-[#e8f9ff]" : ""}`}
                  disabled={!selectedPlayer}
                  key={side}
                  onClick={() => updateSelectedPlayerSide(side)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 grid gap-1.5">
            <span className="field-label">Cor do jogador</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                aria-label="Usar cor padrão"
                aria-pressed={!selectedPlayer?.color}
                className={`grid size-8 place-items-center rounded-full border-2 text-base font-medium ${!selectedPlayer?.color ? "border-[#58cfff] bg-[#1a2630] text-[#d8f5ff] ring-2 ring-[#58cfff]/40" : "border-[#52616b] text-[#aebbc4] hover:border-[#d8f5ff]"}`}
                disabled={!selectedPlayer}
                onClick={() => {
                  if (!selectedPlayer) return;
                  commitField(input.elements);
                  updateSelectedPlayer({ color: undefined });
                }}
                title="Usar cor padrão"
                type="button"
              >
                ×
              </button>
              {playerColorOptions.map((color) => (
                <button
                  aria-label={`Selecionar ${color.label}`}
                  aria-pressed={selectedPlayer?.color === color.value}
                  className={`grid size-8 place-items-center rounded-full border-2 ${color.className} ${selectedPlayer?.color === color.value ? "border-[#58cfff] ring-2 ring-[#58cfff]/40" : "border-[#52616b] hover:border-[#d8f5ff]"}`}
                  disabled={!selectedPlayer}
                  key={color.value}
                  onClick={() => {
                    if (!selectedPlayer) return;
                    commitField(input.elements);
                    updateSelectedPlayer({ color: color.value });
                  }}
                  title={color.label}
                  type="button"
                />
              ))}
              <label className="relative grid size-8 cursor-pointer place-items-center rounded-full border-2 border-dashed border-[#52616b] text-base text-[#d8f5ff] transition hover:border-[#58cfff] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                <Plus size={16} />
                <span className="sr-only">Escolher cor personalizada</span>
                <input
                  aria-label="Escolher cor personalizada"
                  className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  disabled={!selectedPlayer}
                  onChange={(event) => {
                    if (!selectedPlayer) return;
                    commitField(input.elements);
                    updateSelectedPlayer({ color: event.target.value });
                  }}
                  type="color"
                  value={selectedPlayer?.color ?? "#102c3e"}
                />
              </label>
            </div>
          </div>
        </section>
        <Field
          elements={input.elements}
          editable
          selectedId={selectedId}
          onSelect={selectFieldElement}
          onChange={updateField}
          onCommit={commitField}
          tool={tool}
          lineStyle={lineStyle}
          routeColor="#58cfff"
          endZoneMode={endZoneMode}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            aria-label="Adicionar jogador"
            className="secondary grid size-9 place-items-center !p-0"
            onClick={addPlayer}
            title="Adicionar jogador"
            type="button"
          >
            <Plus size={17} />
          </button>
          <button
            aria-label="Alternar modo end zone"
            aria-pressed={endZoneMode}
            className={`secondary grid h-9 min-w-9 place-items-center !px-2 !py-0 text-xs font-bold ${endZoneMode ? "!border-[#58cfff] !bg-[#163142] !text-[#e8f9ff]" : ""}`}
            onClick={() => setEndZoneMode((current) => !current)}
            title="Alternar modo end zone"
            type="button"
          >
            EZ
          </button>
          <span className="mx-0.5 h-7 w-px bg-[#35414a]" />
          {selectedDefender ? (
            <div className="flex items-center gap-1" aria-label="Marcação defensiva">
              <button
                aria-label="Cobertura de zona"
                aria-pressed={tool === "zone"}
                className={`secondary grid size-9 place-items-center !p-0 ${tool === "zone" ? "!border-[#c084fc] !bg-[#2a1d3a] !text-[#f3e8ff]" : ""}`}
                onClick={() => setTool("zone")}
                title="Cobertura de zona"
                type="button"
              >
                <svg aria-hidden="true" className="size-5" viewBox="0 0 20 20">
                  <ellipse
                    cx="12"
                    cy="8"
                    fill="none"
                    rx="6"
                    ry="4"
                    stroke="currentColor"
                    strokeDasharray="3 2"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M3 16l5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
              <button
                aria-label="Marcação homem a homem"
                aria-pressed={tool === "man"}
                className={`secondary grid size-9 place-items-center !p-0 ${tool === "man" ? "!border-[#facc15] !bg-[#3a3218] !text-[#fef3c7]" : ""}`}
                onClick={() => setTool("man")}
                title="Marcação homem a homem"
                type="button"
              >
                <svg aria-hidden="true" className="size-5" viewBox="0 0 20 20">
                  <circle cx="4" cy="15" fill="currentColor" r="2" />
                  <circle cx="16" cy="5" fill="currentColor" r="2" />
                  <path
                    d="M6 13l8-6"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray="3 2"
                    strokeWidth="1.8"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <button
                aria-label="Alternar cor da rota selecionada"
                aria-pressed={routeAlert}
                className={`secondary grid size-9 place-items-center !p-0 ${routeAlert ? "!border-[#b91c1c] !bg-[#3c171b] !text-[#fecaca]" : ""}`}
                disabled={!selectedRoute}
                onClick={toggleSelectedRouteColor}
                title="Alternar azul e vermelho da rota selecionada"
                type="button"
              >
                <span
                  className={`size-3 rounded-full ${routeAlert ? "bg-[#b91c1c]" : "bg-[#58cfff]"}`}
                />
              </button>
              <span className="mx-0.5 h-7 w-px bg-[#35414a]" />
              <div className="flex items-center gap-1" aria-label="Formato da rota">
                <button
                  aria-label="Rota em curva"
                  aria-pressed={tool === "curve"}
                  className={`secondary grid size-9 place-items-center !p-0 ${tool === "curve" ? "!border-[#58cfff] !bg-[#163142] !text-[#e8f9ff]" : ""}`}
                  onClick={() => setTool("curve")}
                  title="Rota em curva"
                  type="button"
                >
                  <Spline size={18} />
                </button>
                <button
                  aria-label="Rota com quebras"
                  aria-pressed={tool === "broken"}
                  className={`secondary grid size-9 place-items-center !p-0 ${tool === "broken" ? "!border-[#58cfff] !bg-[#163142] !text-[#e8f9ff]" : ""}`}
                  onClick={() => setTool("broken")}
                  title="Rota com quebras"
                  type="button"
                >
                  <Waypoints size={18} />
                </button>
              </div>
              <span className="mx-0.5 h-7 w-px bg-[#35414a]" />
              <div className="flex items-center gap-1" aria-label="Estilo da linha">
                {(
                  [
                    ["solid", "Linha contínua", <Minus key="solid" size={19} />],
                    [
                      "dashed",
                      "Linha tracejada",
                      <svg
                        key="dashed"
                        aria-hidden="true"
                        className="size-5"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M2 10h4m3 0h3m3 0h3"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="2"
                        />
                      </svg>,
                    ],
                    [
                      "motion",
                      "Linha de motion",
                      <svg
                        key="motion"
                        aria-hidden="true"
                        className="size-5"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M2 13l3-6 3 6 3-6 3 6 3-6"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                        />
                      </svg>,
                    ],
                  ] as const
                ).map(([value, label, icon]) => (
                  <button
                    key={value}
                    aria-label={label}
                    aria-pressed={lineStyle === value}
                    className={`secondary grid size-9 place-items-center !p-0 ${lineStyle === value ? "!border-[#58cfff] !bg-[#163142] !text-[#e8f9ff]" : ""}`}
                    onClick={() => setLineStyle(value)}
                    title={label}
                    type="button"
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </>
          )}
          <span className="mx-0.5 h-7 w-px bg-[#35414a]" />
          <button
            aria-label="Selecionar elementos"
            aria-pressed={tool === "select"}
            className={`secondary grid size-9 place-items-center !p-0 ${tool === "select" ? "!border-[#58cfff] !bg-[#163142] !text-[#e8f9ff]" : ""}`}
            onClick={() => setTool("select")}
            title="Selecionar elementos"
            type="button"
          >
            <MousePointer2 size={17} />
          </button>
          <button
            aria-label="Desfazer"
            className="secondary grid size-9 place-items-center !p-0"
            disabled={!fieldHistory.length}
            onClick={undoField}
            title="Desfazer"
            type="button"
          >
            <Undo2 size={17} />
          </button>
          <button
            aria-label="Refazer"
            className="secondary grid size-9 place-items-center !p-0"
            disabled={!redoHistory.length}
            onClick={redoField}
            title="Refazer"
            type="button"
          >
            <Redo2 size={17} />
          </button>
          <button
            aria-label="Remover elemento selecionado"
            className="secondary grid size-9 place-items-center !p-0"
            disabled={!selectedId}
            onClick={removeSelected}
            title="Remover elemento selecionado"
            type="button"
          >
            <Trash2 size={17} />
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
