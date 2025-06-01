import * as React from "react";

export function ModeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark" | "system">(
    "system"
  );

  React.useEffect(() => {
    const isDark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList[isDark ? "add" : "remove"]("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="flex gap-2">
      <button
        className={`px-2 py-1 rounded ${
          theme === "light" ? "bg-primary text-white" : ""
        }`}
        onClick={() => setTheme("light")}
        type="button"
      >
        Light
      </button>
      <button
        className={`px-2 py-1 rounded ${
          theme === "dark" ? "bg-primary text-white" : ""
        }`}
        onClick={() => setTheme("dark")}
        type="button"
      >
        Dark
      </button>
      <button
        className={`px-2 py-1 rounded ${
          theme === "system" ? "bg-primary text-white" : ""
        }`}
        onClick={() => setTheme("system")}
        type="button"
      >
        System
      </button>
    </div>
  );
}
