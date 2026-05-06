import { useEffect, useState } from "react";
import { useIntelligenceStore, FailureAnalysis } from "@/stores/intelligenceStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, FileText, Bug, Search, History, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Replay() {
  const { failureAnalyses, getFailureAnalyses } = useIntelligenceStore();
  const [selected, setSelected] = useState<FailureAnalysis | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getFailureAnalyses();
  }, []);

  const filtered = failureAnalyses.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.session_id.toLowerCase().includes(s) ||
      (a.diagnosis && a.diagnosis.toLowerCase().includes(s)) ||
      a.pty_excerpt.toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex h-full flex-col p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="page-header">
            <div className="gradient-accent-bar" />
            <h1>Session Replay & Diagnostics</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Browse failure analyses, session timelines, and PTY excerpts</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => getFailureAnalyses()}>
          <RotateCcw className="size-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-[400px] flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by session, diagnosis, or error..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-2 pr-2">
              {filtered.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <Bug className="size-8 mx-auto mb-2 opacity-50" />
                  {search ? "No matches found" : "No failure analyses yet. Run a session and analyze failures to see them here."}
                </div>
              )}
              {filtered.map((analysis) => (
                <Card
                  key={analysis.id}
                  className={cn(
                    "p-4 cursor-pointer transition-colors hover:bg-accent/50",
                    selected?.id === analysis.id && "bg-accent border-primary/50"
                  )}
                  onClick={() => setSelected(analysis)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Session {analysis.session_id.slice(0, 8)}...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="size-3 inline mr-1" />
                        {new Date(analysis.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={analysis.confidence > 0.7 ? "default" : "secondary"} className="shrink-0">
                      {analysis.confidence > 0 ? `${(analysis.confidence * 100).toFixed(0)}%` : "new"}
                    </Badge>
                  </div>
                  {analysis.diagnosis && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {(() => {
                        try {
                          const d = JSON.parse(analysis.diagnosis);
                          return d.diagnosis || analysis.diagnosis;
                        } catch {
                          return analysis.diagnosis;
                        }
                      })()}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Separator orientation="vertical" className="h-full" />

        <div className="flex-1 min-w-0">
          {selected ? (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Failure Analysis</h2>
                  <p className="text-sm text-muted-foreground">
                    Session <code className="text-xs bg-secondary rounded px-1">{selected.session_id}</code>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Created {new Date(selected.created_at).toLocaleString()}</p>
                </div>

                {selected.diagnosis && (
                  <Card className="p-4 space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Bug className="size-4" /> Diagnosis
                    </h3>
                    {(() => {
                      try {
                        const d = JSON.parse(selected.diagnosis);
                        return (
                          <>
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground">Problem</span>
                              <p className="text-sm mt-1">{d.diagnosis}</p>
                            </div>
                            {d.root_cause && (
                              <div>
                                <span className="text-xs font-semibold text-muted-foreground">Root Cause</span>
                                <p className="text-sm mt-1">{d.root_cause}</p>
                              </div>
                            )}
                            {d.suggested_fix && (
                              <div>
                                <span className="text-xs font-semibold text-muted-foreground">Suggested Fix</span>
                                <p className="text-sm mt-1">{d.suggested_fix}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground">Confidence</span>
                              <div className="w-full h-2 bg-secondary rounded-full mt-1">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${(d.confidence || selected.confidence) * 100}%` }}
                                />
                              </div>
                            </div>
                          </>
                        );
                      } catch {
                        return <p className="text-sm">{selected.diagnosis}</p>;
                      }
                    })()}
                  </Card>
                )}

                <Card className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="size-4" /> PTY Excerpt
                  </h3>
                  <pre className="text-xs bg-secondary rounded-lg p-4 max-h-[500px] overflow-auto font-mono whitespace-pre-wrap">
                    {selected.pty_excerpt}
                  </pre>
                </Card>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <History className="size-12 mx-auto mb-3 opacity-30" />
                <p>Select a failure analysis to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
