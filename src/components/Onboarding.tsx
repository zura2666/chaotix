"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, TrendingUp, Sparkles, Search } from "lucide-react";

const STORAGE_KEY = "chaotix_onboarding_seen";

export function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem(STORAGE_KEY);
    if (!seen) setShow(true);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  const steps = [
    {
      title: "Welcome to Chaotix",
      body: "Trade strings — words, names, ideas, events. One canonical market per idea. Price moves with buying and selling.",
      icon: Sparkles,
    },
    {
      title: "Explore trending",
      body: "Check out trending and newest markets below. Tap any card to see price, chart, and trade.",
      icon: TrendingUp,
    },
    {
      title: "Create or find",
      body: "Use the search bar to find an existing market or create a new one. Try your name or a topic you care about.",
      icon: Search,
    },
  ];

  const current = steps[step];
  const Icon = current?.icon ?? Sparkles;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl">
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 rounded p-1 text-slate-500 hover:bg-white/10 hover:text-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-emerald-500/20 p-4">
            <Icon className="h-8 w-8 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-white text-center mb-2">
          {current?.title}
        </h2>
        <p className="mb-6 text-center text-sm text-slate-500">
          {current?.body}
        </p>
        <div className="flex gap-2 justify-center mb-4">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full w-2 ${
                i === step ? "bg-emerald-500" : "bg-white/10"
              }`}
            />
          ))}
        </div>
        <div className="flex gap-3">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-slate-500 hover:bg-white/10"
            >
              Back
            </button>
          ) : null}
          <button
            onClick={() => {
              if (step < steps.length - 1) setStep(step + 1);
              else dismiss();
            }}
            className="flex-1 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white hover:bg-emerald-400"
          >
            {step < steps.length - 1 ? "Next" : "Get started"}
          </button>
        </div>
      </div>
    </div>
  );
}
