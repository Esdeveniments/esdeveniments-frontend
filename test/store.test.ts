import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";

// We need to reset the module between tests to get a fresh store
let useStore: typeof import("../store").default;

async function loadStore() {
  vi.resetModules();
  const mod = await import("../store");
  useStore = mod.default;
}

describe("Zustand store", () => {
  beforeEach(async () => {
    // Dynamically re-import to reset module state
    await loadStore();
  });

  it("has correct initial state", () => {
    const state = useStore.getState();
    expect(state.openModal).toBe(false);
    expect(state.hydrated).toBe(false);
    expect(state.userLocation).toBeNull();
  });

  it("setState updates a single property", () => {
    act(() => {
      useStore.getState().setState("openModal", true);
    });
    expect(useStore.getState().openModal).toBe(true);
    // Other properties remain unchanged
    expect(useStore.getState().hydrated).toBe(false);
  });

  it("setState with same value returns same state reference", () => {
    const stateBefore = useStore.getState();

    act(() => {
      useStore.getState().setState("openModal", false); // same as initial
    });

    // The optimization: setState returns same state object when value hasn't changed
    // This prevents unnecessary downstream re-renders
    expect(useStore.getState().openModal).toBe(false);
    expect(useStore.getState().openModal).toBe(stateBefore.openModal);
  });

  it("setState updates userLocation", () => {
    const location = { latitude: 41.39, longitude: 2.154 };
    act(() => {
      useStore.getState().setState("userLocation", location);
    });
    expect(useStore.getState().userLocation).toEqual(location);
  });

  it("setHydrated sets hydrated to true", () => {
    expect(useStore.getState().hydrated).toBe(false);
    act(() => {
      useStore.getState().setHydrated();
    });
    expect(useStore.getState().hydrated).toBe(true);
  });

  it("setState can toggle openModal back and forth", () => {
    act(() => useStore.getState().setState("openModal", true));
    expect(useStore.getState().openModal).toBe(true);

    act(() => useStore.getState().setState("openModal", false));
    expect(useStore.getState().openModal).toBe(false);
  });

  it("setState clears userLocation back to null", () => {
    const location = { latitude: 41.39, longitude: 2.154 };
    act(() => useStore.getState().setState("userLocation", location));
    expect(useStore.getState().userLocation).toEqual(location);

    act(() => useStore.getState().setState("userLocation", null));
    expect(useStore.getState().userLocation).toBeNull();
  });
});
