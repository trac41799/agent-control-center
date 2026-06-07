import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSettingsStore } from "@/stores/settingsStore";

vi.mock("@/stores/knowledgeStore", () => ({
  useKnowledgeStore: vi.fn((selector) => {
    const state = { newItemsSinceLastVisit: 3 };
    return selector(state);
  }),
}));

function renderSidebar(initialEntries = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider>
        <Sidebar />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    useSettingsStore.setState({
      sidebarCollapsed: { work: false, review: true, configure: true, automate: true, system: true },
    });
  });

  it("renders groups in frequency order: WORK, REVIEW, CONFIGURE, AUTOMATE, SYSTEM", () => {
    renderSidebar();
    const groups = screen.getAllByRole("button", { name: /^(WORK|REVIEW|CONFIGURE|AUTOMATE|SYSTEM)$/ });
    expect(groups).toHaveLength(5);
    expect(groups[0]).toHaveTextContent("WORK");
    expect(groups[1]).toHaveTextContent("REVIEW");
    expect(groups[2]).toHaveTextContent("CONFIGURE");
    expect(groups[3]).toHaveTextContent("AUTOMATE");
    expect(groups[4]).toHaveTextContent("SYSTEM");
  });

  it("renders Runner as a persistent top item outside any group", () => {
    renderSidebar();
    const runner = screen.getByRole("link", { name: /Runner/ });
    expect(runner).toBeInTheDocument();
    expect(runner.closest("[data-collapsible]")).toBeNull();
  });

  it("expands WORK group by default", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: /Orchestrate/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Knowledge/ })).toBeInTheDocument();
  });

  it("collapses REVIEW, CONFIGURE, AUTOMATE, SYSTEM groups by default", () => {
    renderSidebar();
    // Groups are collapsed via CSS classes; verify the collapsed wrapper classes
    const reviewBtn = screen.getByRole("button", { name: /REVIEW/ });
    expect(reviewBtn).toHaveAttribute("aria-expanded", "false");
    const configureBtn = screen.getByRole("button", { name: /CONFIGURE/ });
    expect(configureBtn).toHaveAttribute("aria-expanded", "false");
    const automateBtn = screen.getByRole("button", { name: /AUTOMATE/ });
    expect(automateBtn).toHaveAttribute("aria-expanded", "false");
    const systemBtn = screen.getByRole("button", { name: /SYSTEM/ });
    expect(systemBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("expands a collapsed group on header click", async () => {
    renderSidebar();
    const reviewHeader = screen.getByRole("button", { name: /REVIEW/ });
    expect(reviewHeader).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(reviewHeader);
    expect(reviewHeader).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses an expanded group on header click", async () => {
    renderSidebar();
    const workHeader = screen.getByRole("button", { name: /WORK/ });
    expect(workHeader).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(workHeader);
    expect(workHeader).toHaveAttribute("aria-expanded", "false");
  });

  it("behaves as accordion — expanding one group collapses others", async () => {
    useSettingsStore.setState({
      sidebarCollapsed: { work: false, review: true, configure: true, automate: true, system: true },
    });
    renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: /REVIEW/ }));
    await userEvent.click(screen.getByRole("button", { name: /CONFIGURE/ }));
    const configureBtn = screen.getByRole("button", { name: /CONFIGURE/ });
    expect(configureBtn).toHaveAttribute("aria-expanded", "true");
    const reviewBtn = screen.getByRole("button", { name: /REVIEW/ });
    expect(reviewBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("auto-expands the group containing the active route", () => {
    renderSidebar(["/outcomes"]);
    const reviewBtn = screen.getByRole("button", { name: /REVIEW/ });
    expect(reviewBtn).toHaveAttribute("aria-expanded", "true");
  });

  it("shows new-items badge on collapsed WORK group header", () => {
    useSettingsStore.setState({
      sidebarCollapsed: { work: true, review: true, configure: true, automate: true, system: true },
    });
    renderSidebar();
    const workHeader = screen.getByRole("button", { name: /WORK/ });
    expect(workHeader).toHaveTextContent("3");
  });

  it("handles Ctrl+1 keyboard shortcut", async () => {
    delete (window as any).location;
    (window as any).location = { href: "" };
    renderSidebar();
    await userEvent.keyboard("{Control>}1{/Control}");
    expect(window.location.href).toBe("/runner");
  });
});
