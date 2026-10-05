"use client";

import { useEffect, useRef } from "react";

import type { TeamPost } from "@/domain/communication";

export type PostContextMenuState = {
  post: TeamPost;
  x: number;
  y: number;
};

export function PostContextMenu({
  menu,
  isRead,
  onClose,
  onToggleRead,
  onHide,
}: {
  menu: PostContextMenuState | null;
  isRead: boolean;
  onClose: () => void;
  onToggleRead: (post: TeamPost, read: boolean) => void;
  onHide: (post: TeamPost) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [menu, onClose]);

  if (!menu) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] grid min-w-52 gap-1 rounded-lg border border-[#303942] bg-[#151a20] p-1 shadow-xl"
      role="menu"
      style={{ left: menu.x, top: menu.y }}
    >
      <button
        className="rounded-md px-3 py-2 text-left text-xs font-semibold text-[#dbe7ed] hover:bg-[#24313a]"
        onClick={() => {
          onToggleRead(menu.post, !isRead);
          onClose();
        }}
      >
        {isRead ? "Marcar como não lida" : "Marcar como lida"}
      </button>
      <button
        className="rounded-md px-3 py-2 text-left text-xs font-semibold text-[#dbe7ed] hover:bg-[#24313a]"
        onClick={() => {
          onHide(menu.post);
          onClose();
        }}
      >
        Excluir da minha lista
      </button>
    </div>
  );
}
