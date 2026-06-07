import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleGroupProps {
  label: string;
  isCollapsed: boolean;
  isActive: boolean;
  badgeCount?: number;
  onToggle: () => void;
  children: React.ReactNode;
}

export function CollapsibleGroup({
  label,
  isCollapsed,
  isActive,
  badgeCount,
  onToggle,
  children,
}: CollapsibleGroupProps) {
  return (
    <div data-collapsible>
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 w-full px-2 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/60 hover:text-muted-foreground transition-colors",
          isActive && "text-indigo-400/80"
        )}
        aria-expanded={!isCollapsed}
      >
        <ChevronRight
          className={cn(
            "size-3 transition-transform duration-150",
            !isCollapsed && "rotate-90"
          )}
        />
        {label}
        {isCollapsed && badgeCount !== undefined && badgeCount > 0 && (
          <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {badgeCount}
          </span>
        )}
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-150",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
        )}
      >
        <div className="flex flex-col gap-0.5 pl-1">{children}</div>
      </div>
    </div>
  );
}
