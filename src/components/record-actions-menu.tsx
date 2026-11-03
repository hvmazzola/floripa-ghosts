"use client";

import { Ellipsis } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { visibleRecordActions, type RecordAction } from "@/lib/record-actions";

type RecordActionMenuItem = RecordAction & { onSelect: () => void };

export function RecordActionsMenu({
  actions,
  label = "Opções do registro",
}: {
  actions: RecordActionMenuItem[];
  label?: string;
}) {
  const allowedActions = visibleRecordActions(actions);
  if (!allowedActions.length) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={label}
          className="grid size-9 shrink-0 place-items-center rounded-md border border-[#303942] bg-[#151a20] text-[#aebbc4] transition-colors hover:border-[#4f7287] hover:bg-[#1b2730] hover:text-[#dff6ff]"
          onClick={(event) => event.stopPropagation()}
          type="button"
        >
          <Ellipsis size={18} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="grid min-w-36 gap-1 p-1.5">
        {allowedActions.map((action) => (
          <button
            className={`rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${action.destructive ? "text-[#ffb8ae] hover:bg-[#451f23] hover:text-white" : "text-[#dbe7ed] hover:bg-[#24313a] hover:text-white"}`}
            key={action.id}
            onClick={action.onSelect}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
