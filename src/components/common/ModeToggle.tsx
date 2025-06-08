import * as React from "react";
import { useTheme } from "@/lib/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2">
      <Button
        variant={theme === "light" ? "default" : "outline"}
        size="sm"
        onClick={() => setTheme("light")}
        type="button"
        aria-label="Light mode"
      >
        <Sun className="w-4 h-4" />
        <span className="sr-only sm:not-sr-only">Light</span>
      </Button>
      <Button
        variant={theme === "dark" ? "default" : "outline"}
        size="sm"
        onClick={() => setTheme("dark")}
        type="button"
        aria-label="Dark mode"
      >
        <Moon className="w-4 h-4" />
        <span className="sr-only sm:not-sr-only">Dark</span>
      </Button>
      <Button
        variant={theme === "system" ? "default" : "outline"}
        size="sm"
        onClick={() => setTheme("system")}
        type="button"
        aria-label="System mode"
      >
        <Monitor className="w-4 h-4" />
        <span className="sr-only sm:not-sr-only">System</span>
      </Button>
    </div>
  );
}
