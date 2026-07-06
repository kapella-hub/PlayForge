import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SegmentedControl } from "@/components/ui/segmented-control";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

describe("SegmentedControl", () => {
  it("marks the active option with aria-checked", () => {
    render(
      <SegmentedControl options={options} value="a" onChange={() => {}} ariaLabel="Test" />,
    );
    expect(screen.getByRole("radio", { name: "Alpha" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Beta" })).toHaveAttribute("aria-checked", "false");
  });

  it("calls onChange with the option value on click", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl options={options} value="a" onChange={onChange} ariaLabel="Test" />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Beta" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("moves selection to the next option with ArrowRight", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl options={options} value="a" onChange={onChange} ariaLabel="Test" />,
    );
    fireEvent.keyDown(screen.getByRole("radio", { name: "Alpha" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
