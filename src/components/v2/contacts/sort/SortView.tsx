"use client";

/**
 * components/v2/contacts/sort/SortView.tsx
 * Orchestrates the "Sort your network" triage flow:
 *  1. Fetches saved contacts, filters to relationship_category === null
 *  2. Presents them one at a time via SortQueueCard
 *  3. User picks a category via CategoryActionBar → optimistic PATCH, advance immediately
 *  4. Done / empty states via SortEmptyState
 */

import { useState, useEffect, useCallback } from "react";
import type { Contact, RelationshipCategory } from "@/types/database";
import { suggestCategory } from "@/lib/crm/suggestCategory";
import { useToast } from "@/components/v2/Toast";
import { SortQueueCard } from "./SortQueueCard";
import { CategoryActionBar } from "./CategoryActionBar";
import { SortProgress } from "./SortProgress";
import { SortEmptyState } from "./SortEmptyState";
import { SortSkeleton, SortError } from "./SortSkeletonAndError";
import { SortHeader } from "./SortHeader";

interface ApiListResponse {
  data: { items: Contact[]; total: number; page: number; per_page: number; has_more: boolean };
  error?: string;
}

interface PatchResponse {
  data: { relationship_category: RelationshipCategory | null };
  error?: string;
}

export function SortView() {
  const showToast = useToast();
  const [queue, setQueue] = useState<Contact[]>([]);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patching, setPatching] = useState(false);
  const [wasEmpty, setWasEmpty] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ user_action: "saved", per_page: "100", lite: "true" });
      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiListResponse = await res.json();
      if (json.error) throw new Error(json.error);
      const uncategorized = (json.data.items ?? []).filter((c) => c.relationship_category === null);
      setQueue(uncategorized);
      setTotal(uncategorized.length);
      setWasEmpty(uncategorized.length === 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchQueue(); }, [fetchQueue]);

  const current = queue[0] ?? null;
  const suggestion = current ? suggestCategory(current) : null;

  function advance() {
    setDone((d) => d + 1);
    setQueue((q) => q.slice(1));
  }

  async function handlePick(cat: RelationshipCategory) {
    if (!current || patching) return;
    setPatching(true);
    const contactId = current.id;
    advance(); // optimistic — advance before network
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationship_category: cat }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PatchResponse = await res.json();
      if (json.error) throw new Error(json.error);
    } catch {
      showToast("Couldn't save — check the contact profile to retry.");
    } finally {
      setPatching(false);
    }
  }

  function handleSkip() {
    if (!current || patching) return;
    advance();
  }

  if (loading) {
    return (
      <div className="px-12 pt-14 pb-16 max-w-[960px] mx-auto">
        <div className="mb-10">
          <div className="w-48 h-8 rounded skeleton-pulse" style={{ background: "var(--line-soft)" }} />
        </div>
        <div className="flex flex-col items-center gap-8"><SortSkeleton /></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="px-12 pt-14 pb-16 max-w-[960px] mx-auto">
        <SortError message={error} onRetry={() => void fetchQueue()} />
      </div>
    );
  }
  if (wasEmpty || (total === 0 && !loading)) {
    return <div className="px-12 pt-14 pb-16"><SortEmptyState variant="empty" /></div>;
  }
  if (queue.length === 0) {
    return <div className="px-12 pt-14 pb-16"><SortEmptyState variant="done" /></div>;
  }

  return (
    <div className="px-12 pt-14 pb-16 max-w-[960px] mx-auto">
      <SortHeader />
      <div className="flex flex-col items-center gap-8">
        <div className="w-full max-w-[480px]">
          <SortProgress done={done} total={total} />
        </div>
        {current && (
          <SortQueueCard contact={current} suggestion={suggestion} animationKey={current.id} />
        )}
        {current && (
          <CategoryActionBar
            suggested={suggestion?.category ?? null}
            onPick={(cat) => void handlePick(cat)}
            onSkip={handleSkip}
            disabled={patching}
          />
        )}
      </div>
    </div>
  );
}
