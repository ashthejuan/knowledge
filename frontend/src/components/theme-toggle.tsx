"use client";

import { Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={theme ?? "system"}
      onValueChange={(value) => {
        if (value) {
          setTheme(value);
        }
      }}
    >
      <ToggleGroupItem value="system" aria-label="System theme">
        <Monitor data-icon="inline-start" />
        System
      </ToggleGroupItem>
      <ToggleGroupItem value="light" aria-label="Light mode">
        <Sun data-icon="inline-start" />
        Light
      </ToggleGroupItem>
      <ToggleGroupItem value="dark" aria-label="Dark mode">
        <Moon data-icon="inline-start" />
        Dark
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
