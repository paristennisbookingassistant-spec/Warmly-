"use client";

import { useRouter } from "next/navigation";

const STEPS = [
  {
    number: "1",
    title: "Tell us about you",
    description: "Share your background and networking goals so the coach can personalize every interaction.",
    iconPath: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    number: "2",
    title: "Build your contact list",
    description: "Add contacts manually or use the Chrome extension to import LinkedIn profiles in one click.",
    iconPath: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    number: "3",
    title: "Get personalized coaching",
    description: "Draft outreach, prepare for meetings, and stay on top of follow-ups — all through conversation.",
    iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
  },
];

export default function OnboardingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 px-4 py-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/30">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome to Networking Coach
          </h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed max-w-sm mx-auto">
            Your AI-powered guide for building genuine professional relationships — from first contact to lasting connection.
          </p>
        </div>

        {/* Steps */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5 mb-8">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex gap-4">
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.iconPath} />
                  </svg>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-white/10 mt-2" style={{ minHeight: "16px" }} />
                )}
              </div>
              <div className="pb-1">
                <p className="text-sm font-semibold text-white">{step.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push("/chat")}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold rounded-xl transition-all duration-150 shadow-lg shadow-blue-600/30 text-sm"
        >
          Get started
        </button>
        <p className="text-center text-xs text-slate-500 mt-4">
          The coach will ask you a few questions to get started — takes about 2 minutes.
        </p>
      </div>
    </div>
  );
}
