import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders the offense variant with offense tokens", () => {
    render(<Badge variant="offense">Offense</Badge>);
    expect(screen.getByText("Offense").className).toContain("text-offense");
  });

  it("renders the defense variant with defense tokens", () => {
    render(<Badge variant="defense">Defense</Badge>);
    expect(screen.getByText("Defense").className).toContain("text-defense");
  });

  it("defaults to the primary variant", () => {
    render(<Badge>Base</Badge>);
    expect(screen.getByText("Base").className).toContain("bg-primary/15");
  });
});
