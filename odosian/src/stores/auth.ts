import { create } from "zustand";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setAuth: (user, token) => set({ user, token, isLoading: false }),
  clearAuth: () => set({ user: null, token: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  fetchUser: async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        set((state) => ({ user: data.user, token: state.token, isLoading: false }));
      } else {
        if (res.status === 401) {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        }
        set({ user: null, token: null, isLoading: false });
      }
    } catch {
      set({ user: null, token: null, isLoading: false });
    }
  },
}));
