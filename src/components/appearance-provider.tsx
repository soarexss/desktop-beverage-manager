"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppearanceMode = "classic" | "modern";

type AppearanceContextValue = {
  appearance: AppearanceMode;
  setAppearance: (mode: AppearanceMode) => void;
};

const STORAGE_KEY = "distribev-appearance";

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<AppearanceMode>("classic");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "classic" || saved === "modern") {
      setAppearance(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.appearance = appearance;
    window.localStorage.setItem(STORAGE_KEY, appearance);
  }, [appearance]);

  const value = useMemo(
    () => ({
      appearance,
      setAppearance,
    }),
    [appearance],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);

  if (!context) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }

  return context;
}
