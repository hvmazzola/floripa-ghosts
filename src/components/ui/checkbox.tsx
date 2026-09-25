"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.ComponentProps<
  typeof CheckboxPrimitive.Root
> {}

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer grid size-[18px] shrink-0 place-items-center rounded-[2px] border border-[#53616d] bg-[#0b0d10] text-[#071018] transition-colors hover:border-[#83dfff] data-[state=checked]:border-ghost-blue data-[state=checked]:bg-ghost-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ghost-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#111419] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="grid place-items-center text-current">
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
