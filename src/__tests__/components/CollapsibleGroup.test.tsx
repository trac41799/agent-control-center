import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollapsibleGroup } from "@/components/layout/CollapsibleGroup";

function renderGroup(props: Partial<Parameters<typeof CollapsibleGroup>[0]> = {}) {
  const defaultProps = {
    label: "WORK",
    isCollapsed: false,
    isActive: false,
    onToggle: vi.fn(),
    children: <div data-testid="group-content">Content</div>,
  };
  return render(<CollapsibleGroup {...defaultProps} {...props} />);
}

describe("CollapsibleGroup", () => {
  it("renders label text", () => {
    renderGroup();
    expect(screen.getByText("WORK")).toBeInTheDocument();
  });

  it("renders a toggle button with aria-expanded", () => {
    renderGroup({ isCollapsed: false });
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("sets aria-expanded to false when collapsed", () => {
    renderGroup({ isCollapsed: true });
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
  });

  it("calls onToggle when clicked", async () => {
    const onToggle = vi.fn();
    renderGroup({ onToggle, isCollapsed: false });
    await userEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("shows children when not collapsed", () => {
    renderGroup({ isCollapsed: false });
    expect(screen.getByTestId("group-content")).toBeVisible();
  });

  it("hides children when collapsed", () => {
    const { container } = renderGroup({ isCollapsed: true });
    const wrapper = container.querySelector("[data-collapsible] > div");
    expect(wrapper?.className).toContain("max-h-0");
    expect(wrapper?.className).toContain("opacity-0");
  });

  it("has data-collapsible attribute on container", () => {
    const { container } = renderGroup();
    expect(container.querySelector("[data-collapsible]")).toBeInTheDocument();
  });

  it("shows badge count when collapsed and badgeCount > 0", () => {
    renderGroup({ isCollapsed: true, badgeCount: 3 });
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("does not show badge count when badgeCount is 0", () => {
    renderGroup({ isCollapsed: true, badgeCount: 0 });
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("does not show badge when expanded even with badgeCount", () => {
    renderGroup({ isCollapsed: false, badgeCount: 3 });
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });
});
