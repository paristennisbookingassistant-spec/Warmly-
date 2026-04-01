/**
 * extension/popup/Popup.tsx
 * Minimal popup UI shown when user clicks the extension icon.
 * See PRD Section 5.3 — minimal UI, all rich features in web app.
 *
 * Contents:
 * - Login status
 * - Discovery start/pause/stop controls
 * - Progress: "12/25 profiles • Company 3/5 • ~6 min left"
 * - "Save current profile" button (when on a LinkedIn profile page)
 * - Link to open the web app
 */

import { useState, useEffect } from "react";
import type { DiscoverySessionState } from "../shared/types";

interface PopupState {
  isAuthenticated: boolean;
  userName: string | null;
  session: DiscoverySessionState | null;
  isOnLinkedInProfile: boolean;
  currentProfileName: string | null;
}

export default function Popup() {
  const [state, setState] = useState<PopupState>({
    isAuthenticated: false,
    userName: null,
    session: null,
    isOnLinkedInProfile: false,
    currentProfileName: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load state from service worker
    chrome.runtime.sendMessage({ type: "AUTH_CHECK" }, (response) => {
      if (response?.user_id) {
        setState((prev) => ({
          ...prev,
          isAuthenticated: true,
          userName: response.user_name,
        }));
      }
    });

    // Check current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? "";
      if (url.includes("linkedin.com/in/")) {
        setState((prev) => ({
          ...prev,
          isOnLinkedInProfile: true,
        }));
      }
    });

    // Load active session
    chrome.storage.local.get("discovery_session", (result) => {
      if (result.discovery_session) {
        setState((prev) => ({
          ...prev,
          session: result.discovery_session as DiscoverySessionState,
        }));
      }
    });
  }, []);

  function handleStartDiscovery() {
    // TODO: Open web app discovery flow or send START_DISCOVERY to content script
    chrome.tabs.create({ url: "http://localhost:3000/chat" });
  }

  function handlePause() {
    chrome.runtime.sendMessage({ type: "PAUSE_DISCOVERY" });
    setState((prev) =>
      prev.session
        ? { ...prev, session: { ...prev.session, status: "paused" } }
        : prev
    );
  }

  function handleResume() {
    chrome.runtime.sendMessage({ type: "RESUME_DISCOVERY" });
    setState((prev) =>
      prev.session
        ? { ...prev, session: { ...prev.session, status: "running" } }
        : prev
    );
  }

  function handleStop() {
    chrome.runtime.sendMessage({ type: "STOP_DISCOVERY" });
    setState((prev) => ({ ...prev, session: null }));
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "PAGE_BOOKMARKED" },
          () => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (!state.isAuthenticated) {
    return (
      <div className="p-4 w-72 text-center">
        <p className="text-sm text-gray-600 mb-3">
          Sign in to the web app to use AI Networking Coach.
        </p>
        <button
          onClick={() => chrome.tabs.create({ url: "http://localhost:3000/login" })}
          className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
        >
          Open AI Networking Coach
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 w-72 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm text-gray-900">AI Networking Coach</p>
          {state.userName && (
            <p className="text-xs text-gray-500">{state.userName}</p>
          )}
        </div>
        <button
          onClick={() => chrome.tabs.create({ url: "http://localhost:3000" })}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Open app
        </button>
      </div>

      {/* Active discovery session */}
      {state.session && (
        <div className="bg-blue-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">Discovery in progress</p>
          <p className="text-xs text-blue-600">
            {state.session.profiles_viewed}/25 profiles
            {" "}•{" "}
            Company {state.session.current_company_index + 1}/{state.session.target_companies.length}
          </p>
          <div className="w-full h-1.5 bg-blue-100 rounded-full mt-2">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(state.session.profiles_viewed / 25) * 100}%` }}
            />
          </div>
          <div className="flex gap-2 mt-3">
            {state.session.status === "running" ? (
              <button
                onClick={handlePause}
                className="flex-1 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-50"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="flex-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600"
              >
                Resume
              </button>
            )}
            <button
              onClick={handleStop}
              className="px-3 py-1.5 text-xs text-red-500 hover:text-red-600"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* No active session */}
      {!state.session && (
        <button
          onClick={handleStartDiscovery}
          className="w-full px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600"
        >
          Start discovery
        </button>
      )}

      {/* Save current profile */}
      {state.isOnLinkedInProfile && (
        <button
          onClick={handleSaveProfile}
          disabled={saving || saved}
          className="w-full px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          {saved ? "Saved!" : saving ? "Saving..." : "Save this profile"}
        </button>
      )}
    </div>
  );
}
