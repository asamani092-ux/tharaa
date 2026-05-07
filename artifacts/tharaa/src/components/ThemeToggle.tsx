import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("ds-theme");
    if (savedTheme === "light") {
      setIsDark(false);
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setIsDark(!isDark);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("ds-theme", newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-3 rounded-full border border-[var(--border-color)] transition-all hover:scale-110 shadow-sm flex items-center justify-center bg-[var(--bg-secondary)] text-[hsl(var(--primary))]"
      title={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
