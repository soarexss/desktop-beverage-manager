import { createContext, useContext } from "react";
import type { AuthUser } from "@/lib/api";

export type AuthContextValue = {
  user: AuthUser;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
