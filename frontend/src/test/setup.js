import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  if (!URL.createObjectURL) URL.createObjectURL = () => "blob:test";
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
