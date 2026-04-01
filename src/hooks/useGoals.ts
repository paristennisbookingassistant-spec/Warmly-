"use client";

import { useState, useEffect } from "react";
import type { NetworkingGoal } from "@/types/database";

/**
 * useGoals
 * Fetches and manages the user's networking goals.
 */
export function useGoals() {
  const [goals, setGoals] = useState<NetworkingGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGoals() {
      try {
        const res = await fetch("/api/goals");
        const json = await res.json();
        if (json.error) {
          setError(json.error.message);
        } else {
          setGoals(json.data ?? []);
        }
      } catch {
        setError("Failed to load goals");
      } finally {
        setIsLoading(false);
      }
    }
    loadGoals();
  }, []);

  return { goals, isLoading, error };
}
