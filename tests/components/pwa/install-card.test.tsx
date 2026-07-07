import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InstallCard } from "@/components/pwa/install-card";

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120";

function setUA(ua: string) {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: ua });
}
function setStandalone(value: boolean | undefined) {
  Object.defineProperty(navigator, "standalone", { configurable: true, value });
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  setUA(DESKTOP_UA);
  setStandalone(undefined);
});

describe("InstallCard", () => {
  it("shows the iOS Add-to-Home-Screen hint on non-standalone iOS", () => {
    setUA(IOS_UA);
    setStandalone(false);
    render(<InstallCard userId="u1" />);
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument();
  });

  it("dismisses the iOS hint when Dismiss is clicked", () => {
    setUA(IOS_UA);
    setStandalone(false);
    render(<InstallCard userId="u1" />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText(/add to home screen/i)).not.toBeInTheDocument();
  });

  it("renders nothing on desktop with no install prompt available", () => {
    setUA(DESKTOP_UA);
    setStandalone(undefined);
    const { container } = render(<InstallCard userId="u1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
