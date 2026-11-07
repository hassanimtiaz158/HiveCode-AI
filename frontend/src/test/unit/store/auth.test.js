import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../services/authService", () => ({
  fetchCurrentUser: vi.fn(),
  signOut: vi.fn(),
}));

import { fetchCurrentUser, signOut } from "../../../services/authService";
import { useAuth } from "../../../store/auth";

const initialState = {
  user: null,
  status: "idle",
  pendingEmail: null,
};

beforeEach(() => {
  useAuth.setState(initialState);
  fetchCurrentUser.mockReset();
  signOut.mockReset();
});

describe("useAuth store", () => {
  it("starts anonymous with no pending email", () => {
    const state = useAuth.getState();
    expect(state.user).toBeNull();
    expect(state.status).toBe("idle");
    expect(state.pendingEmail).toBeNull();
  });

  it("setUser authenticates the session", () => {
    const user = { id: 7, email: "ada@example.com" };

    useAuth.getState().setUser(user);

    expect(useAuth.getState().user).toEqual(user);
    expect(useAuth.getState().status).toBe("authenticated");
  });

  it("setPendingEmail remembers the address awaiting an OTP", () => {
    useAuth.getState().setPendingEmail("ada@example.com");

    expect(useAuth.getState().pendingEmail).toBe("ada@example.com");
  });

  it("clear drops the session and pending email", () => {
    useAuth.setState({
      user: { id: 1 },
      status: "authenticated",
      pendingEmail: "ada@example.com",
    });

    useAuth.getState().clear();

    expect(useAuth.getState()).toMatchObject({
      user: null,
      status: "anonymous",
      pendingEmail: null,
    });
  });

  it("logout revokes the session and clears local auth state", async () => {
    useAuth.setState({
      user: { id: 1 },
      status: "authenticated",
      pendingEmail: "ada@example.com",
    });

    await useAuth.getState().logout();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(useAuth.getState()).toMatchObject({
      user: null,
      status: "anonymous",
      pendingEmail: null,
    });
  });

  it("logout clears local auth state when the API call fails", async () => {
    useAuth.setState({ user: { id: 1 }, status: "authenticated" });
    signOut.mockRejectedValueOnce(new Error("network unavailable"));

    await useAuth.getState().logout();

    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("restore authenticates when the session cookie is valid", async () => {
    const user = { id: 7, email: "ada@example.com" };
    fetchCurrentUser.mockResolvedValueOnce(user);

    const restoring = useAuth.getState().restore();
    expect(useAuth.getState().status).toBe("loading");

    await restoring;

    expect(fetchCurrentUser).toHaveBeenCalledTimes(1);
    expect(useAuth.getState().user).toEqual(user);
    expect(useAuth.getState().status).toBe("authenticated");
  });

  it("restore falls back to anonymous when the session is invalid", async () => {
    useAuth.setState({ user: { id: 1 }, status: "authenticated" });
    fetchCurrentUser.mockRejectedValueOnce(new Error("401"));

    await useAuth.getState().restore();

    expect(useAuth.getState().user).toBeNull();
    expect(useAuth.getState().status).toBe("anonymous");
  });
});
