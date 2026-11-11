import { describe, expect, it } from "vitest";
import { isEmailAllowed } from "./allowed-emails";

describe("isEmailAllowed", () => {
  it("allows only listed addresses, ignoring case and spaces", () => {
    const list = " ja@example.com, Ty@Example.com ";
    expect(isEmailAllowed("ja@example.com", list)).toBe(true);
    expect(isEmailAllowed("TY@example.com", list)).toBe(true);
    expect(isEmailAllowed("obcy@example.com", list)).toBe(false);
  });

  it("lets nobody in when the list is empty or missing", () => {
    expect(isEmailAllowed("ja@example.com", "")).toBe(false);
    expect(isEmailAllowed("ja@example.com", undefined)).toBe(false);
    expect(isEmailAllowed(null, "ja@example.com")).toBe(false);
  });
});
