import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "../../../hooks/useCountdown";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountdown", () => {
  it("starts at zero and counts down once per second", () => {
    const { result } = renderHook(() => useCountdown());
    expect(result.current[0]).toBe(0);

    act(() => result.current[1](3));
    expect(result.current[0]).toBe(3);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current[0]).toBe(2);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current[0]).toBe(1);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current[0]).toBe(0);
  });

  it("stops ticking at zero", () => {
    const { result } = renderHook(() => useCountdown());

    act(() => result.current[1](1));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current[0]).toBe(0);

    act(() => vi.advanceTimersByTime(5000));
    expect(result.current[0]).toBe(0);
  });

  it("restarts from a new value", () => {
    const { result } = renderHook(() => useCountdown());

    act(() => result.current[1](5));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current[0]).toBe(4);

    act(() => result.current[1](2));
    expect(result.current[0]).toBe(2);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current[0]).toBe(1);
  });

  it("clears its timeout on unmount", () => {
    const { result, unmount } = renderHook(() => useCountdown());

    act(() => result.current[1](10));
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
