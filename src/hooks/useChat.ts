"use client";

import { useState, useCallback, useEffect } from "react";
import type { Conversation, ConversationMessage, Artifact } from "@/types/database";

/**
 * useChat
 * Manages conversation list, active conversation, messages, and message sending.
 * The primary state hook for the Chat view.
 */
export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Mount effect: fetch conversation list AND first conversation's messages in
  // parallel so the chat view loads in a single round-trip pass instead of two.
  useEffect(() => {
    async function loadInitial() {
      try {
        const convRes = await fetch("/api/conversations?sort_by=updated_at&sort_order=desc");
        const convJson = await convRes.json();
        const items: Conversation[] = convJson.data?.items ?? [];
        setConversations(items);

        const target = items[0] ?? null;
        if (!target) {
          // No conversations — nothing else to load.
          return;
        }

        // We have a target ID immediately — fire messages fetch without waiting
        // for a re-render to propagate setActiveConversation.
        setIsLoadingMessages(true);
        setMessages([]);

        const msgRes = await fetch(`/api/conversations/${target.id}/messages`);
        const msgJson = await msgRes.json();

        // Apply both results in the same tick.
        setActiveConversation(target);
        if (msgJson.data) {
          setMessages(msgJson.data.items);
        }
      } finally {
        setIsLoadingConversations(false);
        setIsLoadingMessages(false);
      }
    }
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subsequent conversation switches (user clicks a different conversation in
  // the sidebar). Not triggered on first mount because activeConversation starts
  // null — the mount effect above handles the initial load.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !activeConversation) return;

    async function loadMessages() {
      setIsLoadingMessages(true);
      setMessages([]);
      try {
        const res = await fetch(`/api/conversations/${activeConversation!.id}/messages`);
        const json = await res.json();
        if (json.data) {
          setMessages(json.data.items);
        }
      } finally {
        setIsLoadingMessages(false);
      }
    }

    loadMessages();
  }, [activeConversation, isMounted]);

  const selectConversation = useCallback((id: string) => {
    const conv = conversations.find((c) => c.id === id) ?? null;
    setActiveConversation(conv);
  }, [conversations]);

  const createConversation = useCallback(async (contactId?: string) => {
    setCreateError(null);

    // If contactId provided, check if a conversation already exists for this contact
    if (contactId) {
      const existing = conversations.find(
        (c) => c.contact_id === contactId && c.status === "active"
      );
      if (existing) {
        setActiveConversation(existing);
        return;
      }
    }

    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: contactId ? "contact_session" : "general",
        ...(contactId ? { contact_id: contactId } : {}),
      }),
    });
    const json = await res.json();
    if (json.data) {
      setConversations((prev) => [json.data, ...prev]);
      setActiveConversation(json.data);
      setMessages([]);
    } else if (json.error) {
      setCreateError(json.error.message ?? "Failed to create conversation");
    }
  }, [conversations]);

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversation || isSending) return;

    setIsSending(true);
    setSendError(null);
    setLastFailedMessage(null);

    // Optimistically add user message
    const tempUserMsg: ConversationMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversation.id,
      created_at: new Date().toISOString(),
      role: "user",
      content,
      artifacts_generated: [],
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    const failGracefully = (msg: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      setSendError(msg);
      setLastFailedMessage(content);
    };

    try {
      const res = await fetch(
        `/api/conversations/${activeConversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );

      let json: { data?: { user_message: ConversationMessage; agent_message: ConversationMessage; artifacts_created: Artifact[] }; error?: { message?: string } } | null = null;
      try {
        json = await res.json();
      } catch {
        // Non-JSON response (e.g., plain-text 502 from edge)
      }

      if (!res.ok || !json?.data) {
        const serverReason = json?.error?.message;
        const fallback =
          res.status === 429
            ? "You're sending messages too quickly. Wait a moment and try again."
            : res.status >= 500
              ? "The coach is having trouble responding."
              : `Request failed (${res.status}).`;
        // Prefer the server's specific reason; otherwise show fallback.
        // Always remind the user that Retry will resend their message.
        const reason = `${serverReason ?? fallback} Click Retry to resend your message.`;
        failGracefully(reason);
        return;
      }

      // Replace temp message with real user message + add agent response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        json!.data!.user_message,
        json!.data!.agent_message,
      ]);
      // Accumulate any artifacts created in this message exchange
      if (json.data.artifacts_created.length > 0) {
        setArtifacts((prev) => [...prev, ...json!.data!.artifacts_created]);
      }
      // Update conversation updated_at in sidebar
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, updated_at: new Date().toISOString() }
            : c
        )
      );
    } catch {
      failGracefully("Couldn't reach the coach. Check your connection, then click Retry to resend your message.");
    } finally {
      setIsSending(false);
    }
  }, [activeConversation, isSending]);

  const clearSendError = useCallback(() => {
    setSendError(null);
    setLastFailedMessage(null);
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (!lastFailedMessage) return;
    const content = lastFailedMessage;
    setSendError(null);
    setLastFailedMessage(null);
    await sendMessage(content);
  }, [lastFailedMessage, sendMessage]);

  const renameConversation = useCallback(async (conversationId: string, newTitle: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) return false;
      setConversations((prev) =>
        prev.map((c) => c.id === conversationId ? { ...c, title: newTitle } : c)
      );
      if (activeConversation?.id === conversationId) {
        setActiveConversation((prev) => prev ? { ...prev, title: newTitle } : prev);
      }
      return true;
    } catch {
      return false;
    }
  }, [activeConversation]);

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, { method: "DELETE" });
      if (!res.ok) return false;
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
      return true;
    } catch {
      return false;
    }
  }, [activeConversation]);

  /**
   * Returns all artifacts that were generated by a specific message.
   * Used by MessageBubble to render inline artifact cards.
   */
  const artifactsForMessage = useCallback(
    (messageId: string): Artifact[] => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || msg.artifacts_generated.length === 0) return [];
      return artifacts.filter((a) => msg.artifacts_generated.includes(a.id));
    },
    [messages, artifacts]
  );

  /**
   * Replace a single artifact in local state. Called by ArtifactDrawer after a
   * successful PUT /api/artifacts/[id] (edit, mark-as-sent, finalize) so the
   * chat stream reflects the new content/status without a full refetch.
   */
  const updateArtifact = useCallback((updated: Artifact) => {
    setArtifacts((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  }, []);

  return {
    conversations,
    activeConversation,
    messages,
    isLoadingConversations,
    isLoadingMessages,
    isSending,
    createError,
    sendError,
    canRetry: lastFailedMessage !== null,
    selectConversation,
    createConversation,
    renameConversation,
    deleteConversation,
    sendMessage,
    retryLastMessage,
    clearSendError,
    artifactsForMessage,
    updateArtifact,
  };
}
