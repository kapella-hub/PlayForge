import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UserMenu } from "@/components/layout/user-menu";
import { ToastProvider } from "@/components/ui/toast";
import { pagesCacheName } from "@/lib/sw/strategies";
import { signOut } from "next-auth/react";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));
// UserMenu renders ChangePasswordDialog, which pulls in account-actions -> @/lib/auth
// (the server-side next-auth config) even though the dialog stays closed in this test.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const user = { name: "Ada Lovelace", email: "ada@example.com", image: null };

function openMenu() {
  render(
    <ToastProvider>
      <UserMenu user={user} />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "AL" }));
}

describe("UserMenu sign-out cache clearing", () => {
  beforeEach(() => {
    vi.mocked(signOut).mockClear();
  });

  it("clears the pages cache before signing out", async () => {
    const deleteMock = vi.fn().mockResolvedValue(true);
    Object.defineProperty(globalThis, "caches", {
      configurable: true,
      value: { delete: deleteMock },
    });

    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(deleteMock).toHaveBeenCalledWith(pagesCacheName());
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });

    // @ts-expect-error test cleanup of a global we defined above
    delete globalThis.caches;
  });

  it("still signs out when cache deletion rejects", async () => {
    const deleteMock = vi.fn().mockRejectedValue(new Error("no cache access"));
    Object.defineProperty(globalThis, "caches", {
      configurable: true,
      value: { delete: deleteMock },
    });

    openMenu();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });

    // @ts-expect-error test cleanup of a global we defined above
    delete globalThis.caches;
  });
});
