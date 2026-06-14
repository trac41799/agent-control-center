import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { mockInvoke } from "@/__tests__/setup";
import Outcomes from "@/pages/Outcomes";

function renderOutcomes() {
  mockInvoke.mockResolvedValue([]);
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <Outcomes />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("Outcomes Page", () => {
  it("renders page title", () => {
    renderOutcomes();
    expect(screen.getByText("Outcome Tracker")).toBeInTheDocument();
  });

  it("renders Refresh button", () => {
    renderOutcomes();
    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });

  it("renders Total Sessions card", () => {
    renderOutcomes();
    expect(screen.getByText("Total Sessions")).toBeInTheDocument();
  });

  it("renders Successful card", () => {
    renderOutcomes();
    expect(screen.getByText("Successful")).toBeInTheDocument();
  });

  it("renders Failed card", () => {
    renderOutcomes();
    const failed = screen.getAllByText("Failed");
    expect(failed.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Success Rate card", () => {
    renderOutcomes();
    expect(screen.getByText("Success Rate")).toBeInTheDocument();
  });

  it("renders filter buttons", () => {
    renderOutcomes();
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("High Success")).toBeInTheDocument();
    expect(screen.getByText("Problematic")).toBeInTheDocument();
    const revised = screen.getAllByText("Revised");
    expect(revised.length).toBeGreaterThanOrEqual(1);
  });

  it("renders table headers", () => {
    renderOutcomes();
    expect(screen.getByText("Agent")).toBeInTheDocument();
    expect(screen.getByText("Task Type")).toBeInTheDocument();
    expect(screen.getByText("Rate")).toBeInTheDocument();
  });

  it("renders empty state when no data", () => {
    renderOutcomes();
    expect(screen.getByText(/No outcome data yet/)).toBeInTheDocument();
  });

  it("shows 0 for all totals when no data", () => {
    renderOutcomes();
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });

  it("shows 0.0% success rate when no data", () => {
    renderOutcomes();
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });
});
