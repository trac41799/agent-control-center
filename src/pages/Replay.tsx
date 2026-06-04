import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SessionSummary, EventRecord } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Clock,
  FileText,
  Edit3,
  Terminal,
  User,
  Bot,
  AlertCircle,
  ArrowRightLeft,
  RotateCcw,
  Search,
  History,
  Copy,
  Check,
  Users,
  Calendar,
  Hash,
  ChevronRight,
  Layers,
} from "lucide-react";

const EVENT_TYPE_CONFIG: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  read: { icon: FileText, color: "text-blue-400 bg-blue-400/10 border-blue-400/30", label: "Read" },
  edit: { icon: Edit3, color: "text-amber-400 bg-amber-400/10 border-amber-400/30", label: "Edit" },
  run: { icon: Terminal, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", label: "Run" },
  user_input: { icon: User, color: "text-purple-400 bg-purple-400/10 border-purple-400/30", label: "User Input" },
  agent_output: { icon: Bot, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30", label: "Agent Output" },
  error: { icon: AlertCircle, color: "text-red-400 bg-red-400/10 border-red-400/30", label: "Error" },
  handoff: { icon: ArrowRightLeft, color: "text-orange-400 bg-orange-400/10 border-orange-400/30", label: "Handoff" },
  correction: { icon: RotateCcw, color: "text-pink-400 bg-pink-400/10 border-pink-400/30", label: "Correction" },
};

const EVENT_TYPES = Object.keys(EVENT_TYPE_CONFIG);

function getEventConfig(type: string) {
  return EVENT_TYPE_CONFIG[type] ?? { icon: Layers, color: "text-muted-foreground bg-muted border-muted-foreground/30", label: type };
}

function eventPreview(event: EventRecord): string {
  if (event.target) return event.target;
  if (event.exit_code !== null && event.exit_code !== undefined) return `Exit code: ${event.exit_code}`;
  if (event.detail) return event.detail.slice(0, 60);
  return event.event_type;
}

function formatSessionId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 8)}...`;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}

interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
}

function parseDiffPreview(detail: string): DiffLine[] | null {
  const lines = detail.split("\n");
  const diffLines: DiffLine[] = [];
  let hasDiff = false;
  for (const line of lines.slice(0, 100)) {
    if (line.startsWith("+")) {
      diffLines.push({ type: "add", content: line });
      hasDiff = true;
    } else if (line.startsWith("-")) {
      diffLines.push({ type: "remove", content: line });
      hasDiff = true;
    } else {
      diffLines.push({ type: "context", content: line });
    }
  }
  return hasDiff ? diffLines : null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button variant="ghost" size="icon" className="size-6" onClick={handleCopy}>
      {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
    </Button>
  );
}

export default function Replay() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [eventDetail, setEventDetail] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(EVENT_TYPES));

  useEffect(() => {
    invoke<SessionSummary[]>("get_all_sessions_cmd")
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoadingSessions(false));
  }, []);

  useEffect(() => {
    if (!selectedSessionId) {
      setEvents([]);
      setSelectedEvent(null);
      setEventDetail(null);
      return;
    }
    setLoadingEvents(true);
    setSelectedEvent(null);
    setEventDetail(null);
    invoke<EventRecord[]>("get_events", { sessionId: selectedSessionId })
      .then(setEvents)
      .catch(console.error)
      .finally(() => setLoadingEvents(false));
  }, [selectedSessionId]);

  const selectEvent = useCallback((event: EventRecord) => {
    setSelectedEvent(event);
    setEventDetail(null);
    invoke<null | string>("get_event_detail", { eventId: event.id })
      .then((detail) => setEventDetail(detail ?? null))
      .catch(() => setEventDetail(null));
  }, []);

  const toggleType = (type: string) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filteredSessions = sessions.filter((s) => {
    if (!search) return true;
    return s.session_id.toLowerCase().includes(search.toLowerCase());
  });

  const filteredEvents = events.filter((e) => visibleTypes.has(e.event_type));

  return (
    <div className="flex h-full flex-col p-6 gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="page-header">
            <div className="gradient-accent-bar" />
            <h1>Session Replay</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Browse session timelines, inspect events, and review agent activity
          </p>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Panel — Session List */}
        <div className="w-[300px] shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by session ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="flex-1">
            {loadingSessions ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Loading sessions...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <History className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{search ? "No matching sessions" : "No sessions recorded yet"}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 pr-1">
                {filteredSessions.map((s) => (
                  <Card
                    key={s.session_id}
                    className={cn(
                      "p-3 cursor-pointer transition-colors hover:bg-accent/50",
                      selectedSessionId === s.session_id && "bg-accent border-primary/50"
                    )}
                    onClick={() => setSelectedSessionId(s.session_id)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2 rounded-full shrink-0",
                          s.outcome === "done"
                            ? "bg-emerald-400"
                            : s.outcome === "failed"
                              ? "bg-red-400"
                              : "bg-muted-foreground/40"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{formatSessionId(s.session_id)}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatTime(s.started_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="size-3" />
                            {s.event_count}
                          </span>
                        </div>
                        {s.agents && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Users className="size-3" />
                            {s.agents.length > 30 ? `${s.agents.slice(0, 30)}...` : s.agents}
                          </p>
                        )}
                        {s.outcome && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "mt-1 text-[10px] px-1.5 py-0",
                              s.outcome === "done" && "border-emerald-400/50 text-emerald-400",
                              s.outcome === "failed" && "border-red-400/50 text-red-400"
                            )}
                          >
                            {s.outcome}
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground/40 shrink-0" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <Separator orientation="vertical" className="h-full" />

        {/* Center Panel — Event Timeline */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {EVENT_TYPES.map((type) => {
              const cfg = getEventConfig(type);
              const Icon = cfg.icon;
              return (
                <label
                  key={type}
                  className={cn(
                    "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border cursor-pointer transition-colors",
                    visibleTypes.has(type)
                      ? cfg.color
                      : "text-muted-foreground/40 border-muted-foreground/20 bg-transparent"
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={visibleTypes.has(type)}
                    onChange={() => toggleType(type)}
                  />
                  <Icon className="size-3" />
                  {cfg.label}
                </label>
              );
            })}
          </div>

          <ScrollArea className="flex-1">
            {loadingEvents ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Loading events...</div>
            ) : !selectedSessionId ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <History className="size-12 mx-auto mb-3 opacity-30" />
                  <p>Select a session to view its timeline</p>
                </div>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Layers className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No events match the selected filters</p>
              </div>
            ) : (
              <div className="relative pl-6 pr-2">
                {/* Vertical timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

                <div className="flex flex-col gap-1">
                  {filteredEvents.map((event) => {
                    const cfg = getEventConfig(event.event_type);
                    const Icon = cfg.icon;
                    return (
                      <Card
                        key={event.id}
                        className={cn(
                          "relative p-3 cursor-pointer transition-colors hover:bg-accent/50 border-l-2",
                          cfg.color.split(" ")[1] ?? "border-transparent",
                          selectedEvent?.id === event.id && "bg-accent"
                        )}
                        onClick={() => selectEvent(event)}
                      >
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            "absolute -left-[23px] top-4 size-[9px] rounded-full border-2 border-background",
                            cfg.color.split(" ")[0] ?? "bg-muted-foreground"
                          )}
                        />

                        <div className="flex items-start gap-2">
                          <Icon className={cn("size-4 mt-0.5 shrink-0", cfg.color.split(" ")[0])} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{cfg.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(event.timestamp)}
                              </span>
                            </div>
                            {event.target && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <FileText className="size-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground truncate">{event.target}</span>
                              </div>
                            )}
                            {(event.lines_added !== null || event.lines_removed !== null) && (
                              <div className="flex items-center gap-2 mt-0.5 text-xs">
                                {event.lines_added !== null && (
                                  <span className="text-emerald-400">+{event.lines_added}</span>
                                )}
                                {event.lines_removed !== null && (
                                  <span className="text-red-400">-{event.lines_removed}</span>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {eventPreview(event)}
                            </p>
                          </div>
                          {event.agent_id && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                              {event.agent_id.length > 10
                                ? `${event.agent_id.slice(0, 10)}...`
                                : event.agent_id}
                            </Badge>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>
        </div>

        <Separator orientation="vertical" className="h-full" />

        {/* Right Panel — Event Detail */}
        <div className="w-[380px] shrink-0">
          {selectedEvent ? (
            <ScrollArea className="h-full pr-3">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Event Detail</h2>
                </div>

                <Card className="p-4 space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">Type</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {(() => {
                        const cfg = getEventConfig(selectedEvent.event_type);
                        const Icon = cfg.icon;
                        return (
                          <>
                            <Icon className={cn("size-4", cfg.color.split(" ")[0])} />
                            <span className="text-sm">{cfg.label}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">Timestamp</span>
                    <p className="text-sm mt-0.5">{formatTimestamp(selectedEvent.timestamp)}</p>
                  </div>

                  {selectedEvent.agent_id && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground">Agent ID</span>
                      <p className="text-sm mt-0.5 font-mono">{selectedEvent.agent_id}</p>
                    </div>
                  )}

                  {selectedEvent.target && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground">Target File</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <code className="text-xs bg-secondary rounded px-1 py-0.5 flex-1 truncate">
                          {selectedEvent.target}
                        </code>
                        <CopyButton text={selectedEvent.target} />
                      </div>
                    </div>
                  )}

                  {(selectedEvent.lines_added !== null || selectedEvent.lines_removed !== null) && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground">Changes</span>
                      <div className="flex items-center gap-3 mt-0.5">
                        {selectedEvent.lines_added !== null && (
                          <span className="text-sm text-emerald-400 font-mono">
                            +{selectedEvent.lines_added} added
                          </span>
                        )}
                        {selectedEvent.lines_removed !== null && (
                          <span className="text-sm text-red-400 font-mono">
                            -{selectedEvent.lines_removed} removed
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedEvent.exit_code !== null && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground">Exit Code</span>
                      <p
                        className={cn(
                          "text-sm mt-0.5 font-mono",
                          selectedEvent.exit_code === 0 ? "text-emerald-400" : "text-red-400"
                        )}
                      >
                        {selectedEvent.exit_code}
                      </p>
                    </div>
                  )}
                </Card>

                {eventDetail ? (
                  <Card className="p-4 space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="size-4" />
                      {selectedEvent.event_type === "edit" ? "Diff Preview" : "Detail Content"}
                    </h3>
                    {selectedEvent.event_type === "edit" ? (
                      (() => {
                        const diff = parseDiffPreview(eventDetail);
                        if (diff) {
                          return (
                            <pre className="text-xs bg-secondary/50 rounded-lg p-3 max-h-[400px] overflow-auto font-mono whitespace-pre-wrap break-all">
                              {diff.map((line, i) => (
                                <span
                                  key={i}
                                  className={
                                    line.type === "add"
                                      ? "text-emerald-400"
                                      : line.type === "remove"
                                        ? "text-red-400"
                                        : "text-muted-foreground"
                                  }
                                >
                                  {line.content}
                                  {"\n"}
                                </span>
                              ))}
                            </pre>
                          );
                        }
                        return (
                          <pre className="text-xs bg-secondary rounded-lg p-4 max-h-[400px] overflow-auto font-mono whitespace-pre-wrap">
                            {eventDetail}
                          </pre>
                        );
                      })()
                    ) : (
                      <pre className="text-xs bg-secondary rounded-lg p-4 max-h-[400px] overflow-auto font-mono whitespace-pre-wrap">
                        {eventDetail}
                      </pre>
                    )}
                  </Card>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">Loading detail...</div>
                )}

                {!eventDetail && selectedEvent && (
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                      <FileText className="size-4" /> Preview
                    </h3>
                    <p className="text-sm text-muted-foreground">{eventPreview(selectedEvent)}</p>
                  </Card>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Clock className="size-12 mx-auto mb-3 opacity-30" />
                <p>Select an event to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
