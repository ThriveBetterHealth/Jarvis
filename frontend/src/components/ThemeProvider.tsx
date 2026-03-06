"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/store/theme";

/** Applies the current theme class to <html> and keeps it in sync. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [theme]);

  return <>{children}</>;
}
