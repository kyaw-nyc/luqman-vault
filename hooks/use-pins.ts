"use client";

import { useState, useEffect, useCallback } from "react";

export interface Pin {
  path: string;
  label: string;
}

const KEY = "lv-pins";

export function usePins() {
  const [pins, setPins] = useState<Pin[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter(
        (p): p is Pin =>
          p && typeof p.path === "string" && typeof p.label === "string",
      );
      if (valid.length > 0) setPins(valid);
    } catch {
      // Corrupted or invalid data — leave pins empty
    }
  }, []);

  const save = (next: Pin[]) => {
    setPins(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const addPin = useCallback(
    (path: string) => {
      const label = path.split("/").filter(Boolean).pop() || path;
      save([...pins.filter((p) => p.path !== path), { path, label }]);
    },
    [pins],
  );

  const removePin = useCallback(
    (path: string) => {
      save(pins.filter((p) => p.path !== path));
    },
    [pins],
  );

  const isPinned = useCallback(
    (path: string) => pins.some((p) => p.path === path),
    [pins],
  );

  return { pins, addPin, removePin, isPinned };
}
