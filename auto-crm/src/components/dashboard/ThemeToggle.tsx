"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    setIsDark(root.classList.contains("dark"));
  }, []);

  function toggle() {
    const root = document.documentElement;
    const next = !isDark;
    if (next) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setIsDark(next);
  }

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="cursor-pointer"
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-amber-400" />
      ) : (
        <Moon className="h-5 w-5 text-slate-600" />
      )}
    </Button>
  );
}
