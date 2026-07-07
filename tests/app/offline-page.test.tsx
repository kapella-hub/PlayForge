import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import OfflinePage from "@/app/offline/page";

describe("/offline page", () => {
  it("explains what still works and offers a retry link", () => {
    render(<OfflinePage />);
    expect(screen.getByText(/recently viewed plays are available/i)).toBeInTheDocument();
    const retry = screen.getByRole("link", { name: /retry/i });
    expect(retry).toHaveAttribute("href", "/");
  });
});
