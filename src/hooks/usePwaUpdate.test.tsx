import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePwaUpdate } from "./usePwaUpdate";

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [false],
    offlineReady: [false],
    updateServiceWorker: vi.fn(),
  }),
}));

describe("usePwaUpdate", () => {
  it("returns disabled state when no update is available", () => {
    const { result } = renderHook(() => usePwaUpdate());

    expect(result.current.needRefresh).toBe(false);
    expect(result.current.offlineReady).toBe(false);
  });
});
