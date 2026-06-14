import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { mockInvoke } from "@/__tests__/setup";
import Replay from "@/pages/Replay";

function renderReplay() {
  mockInvoke.mockResolvedValue([]);
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Replay />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("Replay Page", () => {
  it("renders page title", () => {
    renderReplay();
    expect(screen.getByText("Session Replay")).toBeInTheDocument();
  });

  it("renders description", () => {
    renderReplay();
    expect(screen.getByText(/Browse session timelines/)).toBeInTheDocument();
  });

  it("renders search input", () => {
    renderReplay();
    expect(screen.getByPlaceholderText(/Search by session ID/)).toBeInTheDocument();
  });

  it("renders event type filters", () => {
    renderReplay();
    expect(screen.getByText("Read")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Run")).toBeInTheDocument();
    expect(screen.getByText("User Input")).toBeInTheDocument();
    expect(screen.getByText("Agent Output")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("Handoff")).toBeInTheDocument();
    expect(screen.getByText("Correction")).toBeInTheDocument();
  });

  it("renders empty or loading state for sessions", () => {
    renderReplay();
    const loadingOrEmpty = screen.queryByText(/Loading sessions/) || screen.queryByText(/No sessions recorded yet/);
    expect(loadingOrEmpty).toBeTruthy();
  });

  it("renders event detail placeholder", () => {
    renderReplay();
    expect(screen.getByText(/Select an event to view details/)).toBeInTheDocument();
  });

  it("renders session timeline placeholder", () => {
    renderReplay();
    expect(screen.getByText(/Select a session to view its timeline/)).toBeInTheDocument();
  });
});
