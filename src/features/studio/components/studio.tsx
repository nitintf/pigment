import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StudioProps {
  children: ReactNode;
  className?: string;
}

export function Studio({ children, className }: StudioProps) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          "dark flex h-screen w-screen flex-col overflow-hidden bg-[#1a1a1a] text-[#e0e0e0]",
          className,
        )}
      >
        {children}
      </div>
    </TooltipProvider>
  );
}
