import { Route, Routes, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { PlaceholderPage } from "@/pages/placeholder";
import Runner from "@/pages/Runner";
import Integrations from "@/pages/Integrations";
import Assets from "@/pages/Assets";
import Outcomes from "@/pages/Outcomes";
import Replay from "@/pages/Replay";
import RoutePage from "@/pages/Route";
import Orchestrate from "@/pages/Orchestrate";
import Handoffs from "@/pages/Handoffs";
import Messages from "@/pages/Messages";
import Playbooks from "@/pages/Playbooks";
import CostAggregation from "@/pages/CostAggregation";
import Knowledge from "@/pages/Knowledge";
import Scheduler from "@/pages/Scheduler";
import Settings from "@/pages/Settings";

function App() {
  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/runner" replace />} />
            <Route path="/runner" element={<Runner />} />
            <Route path="/route" element={<RoutePage />} />
            <Route path="/orchestrate" element={<Orchestrate />} />
            <Route path="/handoffs" element={<Handoffs />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/outcomes" element={<Outcomes />} />
            <Route path="/replay" element={<Replay />} />
            <Route path="/playbooks" element={<Playbooks />} />
            <Route path="/connectors" element={<Integrations />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/scheduler" element={<Scheduler />} />
            <Route path="/costs" element={<CostAggregation />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<PlaceholderPage />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
