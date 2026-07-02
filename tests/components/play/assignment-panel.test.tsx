import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssignmentPanel } from "@/components/play/assignment-panel";
import type { CanvasPlayer, Route } from "@/engine/types";

const player: CanvasPlayer = {
  id: "p1",
  label: "X",
  x: 100,
  y: 100,
  side: "offense",
};

const route: Route = {
  playerId: "p1",
  waypoints: [{ x: 0, y: 0 }],
  type: "solid",
  routeType: "Slant",
};

describe("AssignmentPanel", () => {
  it("marks the Capitalized routeType pill as active", () => {
    render(
      <AssignmentPanel
        player={player}
        route={route}
        onClose={() => {}}
        onDeleteRoute={() => {}}
        onUpdateRouteType={() => {}}
      />,
    );
    const slant = screen.getByRole("button", { name: "Slant" });
    expect(slant.className).toContain("bg-indigo-600");
  });

  it("writes the Capitalized routeType when a pill is clicked", () => {
    const onUpdateRouteTypeName = vi.fn();
    render(
      <AssignmentPanel
        player={player}
        route={route}
        onClose={() => {}}
        onDeleteRoute={() => {}}
        onUpdateRouteType={() => {}}
        onUpdateRouteTypeName={onUpdateRouteTypeName}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    expect(onUpdateRouteTypeName).toHaveBeenCalledWith("p1", "Post");
  });

  it("fires onMirror when the Mirror button is clicked", () => {
    const onMirror = vi.fn();
    render(
      <AssignmentPanel
        player={player}
        route={route}
        onClose={() => {}}
        onDeleteRoute={() => {}}
        onUpdateRouteType={() => {}}
        onMirror={onMirror}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /mirror/i }));
    expect(onMirror).toHaveBeenCalledTimes(1);
  });
});
