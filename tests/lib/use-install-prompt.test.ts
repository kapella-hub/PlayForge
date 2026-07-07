import { describe, it, expect, beforeEach } from "vitest";
import {
  installDismissedKey,
  isInstallDismissed,
  dismissInstall,
  isIosSafariNonStandalone,
} from "@/lib/use-install-prompt";

beforeEach(() => localStorage.clear());

const IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120";

describe("install dismissal (userId-scoped)", () => {
  it("builds a scoped key", () => {
    expect(installDismissedKey("u1")).toBe("playforge-install-dismissed:u1");
  });

  it("defaults to not dismissed and remembers dismissal per user", () => {
    expect(isInstallDismissed("u1")).toBe(false);
    dismissInstall("u1");
    expect(isInstallDismissed("u1")).toBe(true);
    expect(isInstallDismissed("u2")).toBe(false);
  });

  it("returns false when getItem throws", () => {
    const originalGetItem = Storage.prototype.getItem;
    try {
      Storage.prototype.getItem = () => {
        throw new Error("quota exceeded");
      };
      expect(isInstallDismissed("u1")).toBe(false);
    } finally {
      Storage.prototype.getItem = originalGetItem;
    }
  });

  it("does not throw when setItem throws", () => {
    const originalSetItem = Storage.prototype.setItem;
    try {
      Storage.prototype.setItem = () => {
        throw new Error("quota exceeded");
      };
      expect(() => dismissInstall("u1")).not.toThrow();
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  });
});

describe("isIosSafariNonStandalone", () => {
  it("is true only for an iOS UA that is not standalone", () => {
    expect(isIosSafariNonStandalone(IOS_UA, false)).toBe(true);
  });

  it("is false when standalone (already installed) or undefined", () => {
    expect(isIosSafariNonStandalone(IOS_UA, true)).toBe(false);
    expect(isIosSafariNonStandalone(IOS_UA, undefined)).toBe(false);
  });

  it("is false on non-iOS platforms", () => {
    expect(isIosSafariNonStandalone(ANDROID_UA, false)).toBe(false);
  });
});
