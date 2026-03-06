"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { ChaotixButton } from "@/components/ui/ChaotixButton";

const PITCH_MAX = 500;

type Step = 1 | 2 | 3;

type FormState = {
  twitterHandle: string;
  discordHandle: string;
  telegramHandle: string;
  pitch: string;
};

const initialForm: FormState = {
  twitterHandle: "",
  discordHandle: "",
  telegramHandle: "",
  pitch: "",
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function ReferralModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const reset = useCallback(() => {
    setStep(1);
    setForm(initialForm);
    setError(null);
    setSubmitted(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleVerify = useCallback((_field: "twitter" | "discord" | "telegram") => {
    // Mock verify: just show a brief success feel
    setError(null);
  }, []);

  const canProceedStep1 =
    form.twitterHandle.trim() || form.discordHandle.trim() || form.telegramHandle.trim();
  const canProceedStep2 = form.pitch.trim().length >= 20 && form.pitch.trim().length <= PITCH_MAX;

  const handleSubmit = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/referral/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          twitterHandle: form.twitterHandle.trim() || undefined,
          discordHandle: form.discordHandle.trim() || undefined,
          telegramHandle: form.telegramHandle.trim() || undefined,
          pitch: form.pitch.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Application failed.");
        return;
      }
      setSubmitted(true);
      onSuccess?.();
      setTimeout(handleClose, 2000);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }, [form, onSuccess, handleClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="referral-modal-title"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
          aria-hidden
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-[90%] max-w-[400px] rounded-2xl border border-white/10 bg-[#0B0F1A] p-6 md:p-8 shadow-2xl"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 id="referral-modal-title" className="text-lg font-semibold tracking-tighter text-slate-100 md:text-xl">
              Become a Chaotix Partner
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-slate-500 outline-none transition hover:bg-white/5 hover:text-slate-100 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
              >
                <Check className="h-8 w-8" strokeWidth={2} />
              </motion.div>
              <p className="mt-4 text-center font-semibold text-slate-100">
                Application sent
              </p>
              <p className="mt-1 text-center text-sm text-slate-500">
                We&apos;ll review it and notify you soon.
              </p>
            </motion.div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="mb-6 flex gap-2">
                {([1, 2, 3] as const).map((s) => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full ${
                      s <= step ? "bg-emerald-500" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <p className="text-sm text-slate-500">
                      Add at least one social profile. Mock verify links your identity.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label htmlFor="ref-twitter" className="mb-1 block text-sm text-slate-400">
                          Twitter / X handle
                        </label>
                        <div className="flex gap-2">
                          <Input
                            id="ref-twitter"
                            type="text"
                            value={form.twitterHandle}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, twitterHandle: e.target.value }))
                            }
                            placeholder="@username"
                            containerClassName="flex-1 !h-14 min-h-[3.5rem]"
                            className="text-base"
                          />
                          <ChaotixButton
                            type="button"
                            onClick={() => handleVerify("twitter")}
                            variant="secondary"
                            className="min-h-[44px] shrink-0 px-4"
                          >
                            Verify
                          </ChaotixButton>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="ref-discord" className="mb-1 block text-sm text-slate-400">
                          Discord ID
                        </label>
                        <div className="flex gap-2">
                          <Input
                            id="ref-discord"
                            type="text"
                            value={form.discordHandle}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, discordHandle: e.target.value }))
                            }
                            placeholder="username#1234"
                            containerClassName="flex-1 !h-14 min-h-[3.5rem]"
                            className="text-base"
                          />
                          <ChaotixButton
                            type="button"
                            onClick={() => handleVerify("discord")}
                            variant="secondary"
                            className="min-h-[44px] shrink-0 px-4"
                          >
                            Verify
                          </ChaotixButton>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="ref-telegram" className="mb-1 block text-sm text-slate-400">
                          Telegram
                        </label>
                        <div className="flex gap-2">
                          <Input
                            id="ref-telegram"
                            type="text"
                            value={form.telegramHandle}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, telegramHandle: e.target.value }))
                            }
                            placeholder="@username"
                            containerClassName="flex-1 !h-14 min-h-[3.5rem]"
                            className="text-base"
                          />
                          <ChaotixButton
                            type="button"
                            onClick={() => handleVerify("telegram")}
                            variant="secondary"
                            className="min-h-[44px] shrink-0 px-4"
                          >
                            Verify
                          </ChaotixButton>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <ChaotixButton
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={!canProceedStep1}
                        variant="primary"
                        className="h-14 min-h-[44px] w-full sm:w-auto sm:px-6"
                      >
                        Next
                      </ChaotixButton>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <label htmlFor="ref-pitch" className="block text-sm text-slate-400">
                      How will you grow the Chaotix ecosystem?
                    </label>
                    <textarea
                      id="ref-pitch"
                      value={form.pitch}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          pitch: e.target.value.slice(0, PITCH_MAX),
                        }))
                      }
                      placeholder="Tell us about your audience, content, or community..."
                      rows={5}
                      className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-base text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 min-h-[3.5rem]"
                    />
                    <p className="text-right text-xs text-slate-500">
                      {form.pitch.length} / {PITCH_MAX}
                    </p>
                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
                      <ChaotixButton
                        type="button"
                        onClick={() => setStep(1)}
                        variant="secondary"
                        className="min-h-[44px] w-full px-4 sm:w-auto"
                      >
                        Back
                      </ChaotixButton>
                      <ChaotixButton
                        type="button"
                        onClick={() => setStep(3)}
                        disabled={!canProceedStep2}
                        variant="primary"
                        className="h-14 min-h-[44px] w-full sm:w-auto sm:px-6"
                      >
                        Next
                      </ChaotixButton>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <p className="text-sm text-slate-500">
                      Review and send your application to the admin team.
                    </p>
                    <div className="rounded-xl border border-white/10 bg-slate-900/30 p-4 text-sm">
                      <p className="font-medium text-slate-100">Socials</p>
                      <p className="mt-1 text-slate-400">
                        {[form.twitterHandle, form.discordHandle, form.telegramHandle]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                      <p className="mt-3 font-medium text-slate-100">Pitch</p>
                      <p className="mt-1 text-slate-400">{form.pitch || "—"}</p>
                    </div>
                    {error && (
                      <p className="mt-1 text-sm text-red-400" role="alert">
                        {error}
                      </p>
                    )}
                    <div className="flex justify-between pt-2">
                      <ChaotixButton
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={loading}
                        variant="secondary"
                        className="h-13 px-4"
                      >
                        Back
                      </ChaotixButton>
                      <ChaotixButton
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        variant="primary"
                        className="flex h-14 min-h-[44px] w-full items-center justify-center gap-2 px-6 sm:w-auto"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          "Send Application to Admin"
                        )}
                      </ChaotixButton>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
