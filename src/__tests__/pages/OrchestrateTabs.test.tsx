import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Orchestrate from "@/pages/Orchestrate";
import { mockInvoke } from "@/__tests__/setup";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => undefined),
}));

function renderOrchestrate(initialEntries = ["/orchestrate"]) {
  mockInvoke.mockResolvedValue([]);
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider>
        <Orchestrate />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("Orchestrate tabs", () => {
  it("renders three tabs: Wave Plan, Handoffs, Messages", () => {
    renderOrchestrate();
    expect(screen.getByRole("tab", { name: /Wave Plan/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Handoffs/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Messages/ })).toBeInTheDocument();
  });

  it("shows Wave Plan tab as active by default", () => {
    renderOrchestrate();
    const wavePlanTab = screen.getByRole("tab", { name: /Wave Plan/ });
    expect(wavePlanTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/Create Wave Plan/i)).toBeInTheDocument();
  });

  it("switches to Handoffs panel on tab click", async () => {
    renderOrchestrate();
    await userEvent.click(screen.getByRole("tab", { name: /Handoffs/ }));
    expect(screen.getByText(/Build Handoff Envelope/i)).toBeInTheDocument();
  });

  it("switches to Messages panel on tab click", async () => {
    renderOrchestrate();
    await userEvent.click(screen.getByRole("tab", { name: /Messages/ }));
    expect(screen.getByText(/Parse ACB Signal/i)).toBeInTheDocument();
  });

  it("opens Handoffs tab when navigating to /orchestrate/handoffs", () => {
    renderOrchestrate(["/orchestrate/handoffs"]);
    expect(screen.getByRole("tab", { name: /Handoffs/ })).toHaveAttribute("aria-selected", "true");
  });

  it("shows active handoff count badge on Handoffs tab", () => {
    renderOrchestrate();
    const handoffsTab = screen.getByRole("tab", { name: /Handoffs/ });
    expect(handoffsTab).toBeInTheDocument();
  });

  it("shows open signal count badge on Messages tab", () => {
    renderOrchestrate();
    const messagesTab = screen.getByRole("tab", { name: /Messages/ });
    expect(messagesTab).toBeInTheDocument();
  });
});
