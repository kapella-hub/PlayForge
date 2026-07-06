import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { setTheme, state } = vi.hoisted(() => ({
  setTheme: vi.fn(),
  state: { theme: "dark" as "dark" | "light" | "system" },
}));

vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: state.theme, setTheme }),
}));

import { ThemeToggle } from "@/components/ui/theme-toggle";

beforeEach(() => {
  setTheme.mockClear();
  state.theme = "dark";
});

describe("ThemeToggle cycle", () => {
  it("labels the current theme (Dark) and advances dark -> light", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("title", "Theme: Dark");
    fireEvent.click(btn);
    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("advances light -> system", () => {
    state.theme = "light";
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("title", "Theme: Light");
    fireEvent.click(screen.getByRole("button"));
    expect(setTheme).toHaveBeenCalledWith("system");
  });

  it("wraps system -> dark", () => {
    state.theme = "system";
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("title", "Theme: System");
    fireEvent.click(screen.getByRole("button"));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});

describe("ThemeToggle styling", () => {
  it("uses theme tokens, not hardcoded zinc or redundant dark: variants", () => {
    render(<ThemeToggle />);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("text-muted-foreground");
    expect(cls).toContain("hover:bg-secondary");
    expect(cls).toContain("hover:text-foreground");
    expect(cls).not.toMatch(/zinc-/);
    expect(cls).not.toMatch(/\bdark:/);
  });
});
