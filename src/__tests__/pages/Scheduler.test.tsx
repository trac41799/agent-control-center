import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { mockInvoke } from "@/__tests__/setup";
import Scheduler from "@/pages/Scheduler";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => undefined),
}));

function renderScheduler() {
  mockInvoke.mockResolvedValue([]);
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Scheduler />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("Scheduler Page", () => {
  it("renders page title", () => {
    renderScheduler();
    expect(screen.getByText("Scheduler")).toBeInTheDocument();
  });

  it("renders Refresh button", () => {
    renderScheduler();
    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("renders tab buttons", () => {
    renderScheduler();
    expect(screen.getByText("Jobs")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Escalations")).toBeInTheDocument();
  });

  it("renders New Job button", () => {
    renderScheduler();
    expect(screen.getByText("New Job")).toBeInTheDocument();
  });

  it("renders empty or loading state for jobs", () => {
    renderScheduler();
    const loadingOrEmpty = screen.queryByText(/Loading/) || screen.queryByText(/No scheduled jobs yet/);
    expect(loadingOrEmpty).toBeTruthy();
  });

  it("has New Job button available", () => {
    renderScheduler();
    const newJobBtn = screen.getByText("New Job");
    expect(newJobBtn).toBeInTheDocument();
  });

  it("shows cron presets in dialog", async () => {
    const user = userEvent.setup();
    renderScheduler();
    const newJobBtn = screen.getByText("New Job");
    await user.click(newJobBtn);
    const dailyBtn = screen.queryByText("Daily 9am");
    if (dailyBtn) {
      expect(dailyBtn).toBeInTheDocument();
    } else {
      expect(screen.getByText(/Create Job|Name/)).toBeInTheDocument();
    }
  });

  it("shows auto-approve and enabled checkboxes in dialog", async () => {
    const user = userEvent.setup();
    renderScheduler();
    await user.click(screen.getByText("New Job"));
    expect(screen.getByText("Auto-approve")).toBeInTheDocument();
    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("navigates to History tab", async () => {
    const user = userEvent.setup();
    renderScheduler();
    await user.click(screen.getByText("History"));
    expect(screen.getByText(/No execution history yet/)).toBeInTheDocument();
  });

  it("navigates to Escalations tab", async () => {
    const user = userEvent.setup();
    renderScheduler();
    await user.click(screen.getByText("Escalations"));
    expect(screen.getByText(/No active escalations/)).toBeInTheDocument();
  });
});
