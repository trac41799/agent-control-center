import { Link, useLocation } from "react-router-dom";
import {
  Rocket, Map, Workflow, ClipboardList, MessageSquare,
  FolderOpen, BarChart3, Clock, Boxes, BookMarked,
  Brain, Clock4, Settings, DollarSign, Moon, Sun
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "@/components/ThemeProvider";
import { useKnowledgeStore } from "@/stores/knowledgeStore";

const navItems = [
  { path: "/runner", label: "Runner", icon: Rocket },
  { path: "/route", label: "Route", icon: Map },
  { path: "/orchestrate", label: "Orchestrate", icon: Workflow },
  { path: "/handoffs", label: "Handoffs", icon: ClipboardList },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/assets", label: "Assets", icon: FolderOpen },
  { path: "/outcomes", label: "Outcomes", icon: BarChart3 },
  { path: "/replay", label: "Replay", icon: Clock },
  { path: "/playbooks", label: "Playbooks", icon: Boxes },
  { path: "/connectors", label: "Connectors", icon: BookMarked },
  { path: "/knowledge", label: "Knowledge", icon: Brain },
  { path: "/scheduler", label: "Scheduler", icon: Clock4 },
  { path: "/costs", label: "Costs", icon: DollarSign },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const newItemsSinceLastVisit = useKnowledgeStore((s) => s.newItemsSinceLastVisit);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full w-[240px] flex-col glass-panel relative">
        {/* Gradient accent line on right edge */}
        <div className="absolute right-0 top-0 bottom-0 w-px gradient-sidebar-accent" />

        <div className="flex h-14 items-center gap-3 px-4">
          <div className="size-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="text-base font-bold text-foreground tracking-tight">
            Agent Control
          </span>
        </div>

        <Separator className="border-glass-border" />

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "justify-start gap-2.5 px-3 font-normal",
                        isActive
                          ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/15"
                          : "text-muted-foreground"
                      )}
                      asChild
                    >
                      <Link to={item.path}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                        {item.path === "/knowledge" && newItemsSinceLastVisit > 0 && (
                          <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {newItemsSinceLastVisit}
                          </span>
                        )}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </ScrollArea>

        {/* Theme toggle */}
        <div className="p-3 border-t border-glass-border">
          <div className="flex bg-glass-20 rounded-lg p-0.5 border border-glass-border">
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                theme === "dark"
                  ? "gradient-primary text-white shadow-glow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Moon className="size-3" />
              Dark
            </button>
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                theme === "light"
                  ? "gradient-primary text-white shadow-glow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sun className="size-3" />
              Light
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
