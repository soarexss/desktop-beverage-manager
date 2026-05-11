"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppearanceMode = "classic" | "modern";
export type ColorScheme = "light" | "dark";
export type FontScale = "compact" | "normal" | "large";
export type FontFamily = "system" | "inter" | "mono";

type AppearanceContextValue = {
  appearance: AppearanceMode;
  colorScheme: ColorScheme;
  fontScale: FontScale;
  fontFamily: FontFamily;
  setAppearance: (mode: AppearanceMode) => void;
  setColorScheme: (mode: ColorScheme) => void;
  setFontScale: (scale: FontScale) => void;
  setFontFamily: (family: FontFamily) => void;
};

const STORAGE_KEY = "distribev-appearance";
const SETTINGS_KEY = "distribev-ui-settings";

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<AppearanceMode>("classic");
  const [colorScheme, setColorScheme] = useState<ColorScheme>("light");
  const [fontScale, setFontScale] = useState<FontScale>("normal");
  const [fontFamily, setFontFamily] = useState<FontFamily>("system");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "classic" || saved === "modern") {
      setAppearance(saved);
    }

    const settings = window.localStorage.getItem(SETTINGS_KEY);
    if (settings) {
      const parsed = JSON.parse(settings) as Partial<{
        colorScheme: ColorScheme;
        fontScale: FontScale;
        fontFamily: FontFamily;
      }>;
      if (parsed.colorScheme === "light" || parsed.colorScheme === "dark") {
        setColorScheme(parsed.colorScheme);
      }
      if (parsed.fontScale === "compact" || parsed.fontScale === "normal" || parsed.fontScale === "large") {
        setFontScale(parsed.fontScale);
      }
      if (parsed.fontFamily === "system" || parsed.fontFamily === "inter" || parsed.fontFamily === "mono") {
        setFontFamily(parsed.fontFamily);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.appearance = appearance;
    window.localStorage.setItem(STORAGE_KEY, appearance);
  }, [appearance]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", colorScheme === "dark");
    document.documentElement.style.setProperty(
      "--app-font-size",
      fontScale === "compact" ? "12px" : fontScale === "large" ? "14.5px" : "13px",
    );
    document.documentElement.style.setProperty(
      "--app-font-family",
      fontFamily === "mono"
        ? '"Cascadia Code", "Consolas", monospace'
        : fontFamily === "inter"
          ? '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif'
          : '"Segoe UI", "Inter", system-ui, -apple-system, sans-serif',
    );
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ colorScheme, fontScale, fontFamily }),
    );
  }, [colorScheme, fontScale, fontFamily]);

  const value = useMemo(
    () => ({
      appearance,
      colorScheme,
      fontScale,
      fontFamily,
      setAppearance,
      setColorScheme,
      setFontScale,
      setFontFamily,
    }),
    [appearance, colorScheme, fontScale, fontFamily],
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
