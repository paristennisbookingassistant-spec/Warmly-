/**
 * app/v2/layout.tsx
 * V2 app shell — dark sidebar + scrollable content area, wrapped in the V2
 * ToastProvider. A real route segment (/v2/*), isolated from V1's (views)
 * shell so both apps run side by side on the same backend.
 */

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/v2/Toast";
import Sidebar from "./Sidebar";

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto scroll-area">{children}</main>
      </div>
    </ToastProvider>
  );
}
