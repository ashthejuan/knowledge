"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Skeleton className="h-9 w-[152px]" />;
  }

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={theme ?? "light"}
      onValueChange={(value) => {
        if (value) {
          setTheme(value);
        }
      }}
    >
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
