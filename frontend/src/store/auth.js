import { create } from "zustand";
import { fetchCurrentUser, signOut } from "../services/authService";

export const useAuth = create((set) => ({
  // Public profile only. Tokens stay in HttpOnly cookies and never reach JS.
  user: null,
  status: "idle",
  // Email awaiting its OTP, e.g. right after signup or an unverified login.
  pendingEmail: null,
  setUser: (user) => set({ user, status: "authenticated" }),
  setPendingEmail: (email) => set({ pendingEmail: email }),
  clear: () => set({ user: null, status: "anonymous", pendingEmail: null }),
  logout: async () => {
    try {
      // The backend revokes the refresh token and clears the auth cookies.
      await signOut();
    } catch {
      // Still end the local session if the server is unreachable.
    } finally {
      set({ user: null, status: "anonymous", pendingEmail: null });
    }
  },
  restore: async () => {
    set({ status: "loading" });
    try {
      set({ user: await fetchCurrentUser(), status: "authenticated" });
    } catch {
      set({ user: null, status: "anonymous" });
    }
  },
}));
