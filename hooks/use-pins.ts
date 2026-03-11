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
      if (saved) setPins(JSON.parse(saved));
    } catch {}
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
