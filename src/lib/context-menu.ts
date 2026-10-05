export type ViewportSize = { width: number; height: number };
export type PointerPosition = { x: number; y: number };

const MENU_WIDTH = 224;
const MENU_HEIGHT = 108;
const VIEWPORT_GUTTER = 8;

export function getContextMenuPosition(
  pointer: PointerPosition,
  viewport: ViewportSize,
): PointerPosition {
  return {
    x: Math.min(
      Math.max(pointer.x, VIEWPORT_GUTTER),
      viewport.width - MENU_WIDTH - VIEWPORT_GUTTER,
    ),
    y: Math.min(Math.max(pointer.y, VIEWPORT_GUTTER), viewport.height - MENU_HEIGHT),
  };
}
