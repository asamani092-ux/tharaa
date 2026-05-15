import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, getStoredTheme, isDarkTheme, setStoredTheme, type ThemeMode } from "@/lib/theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const mode = getStoredTheme();
    applyTheme(mode);
    setIsDark(mode === "dark");
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = isDark ? "light" : "dark";
    setStoredTheme(next);
    setIsDark(next === "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-3 rounded-full border border-[var(--border-default)] transition-all hover:scale-110 shadow-sm flex items-center justify-center bg-[var(--bg-secondary)] text-[hsl(var(--primary))]"
      title={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}

export { isDarkTheme };
