"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, MessageCircle, Handshake, XCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateIntentLifecycle } from "@/app/actions/intents";
import { updateConnectionLifecycle } from "@/app/actions/connections";
import { createEndorsement } from "@/app/actions/endorsements";
import type { IntentLifecycleStatus } from "@/lib/types/database";
import { toast } from "sonner";

const STAGES: { status: IntentLifecycleStatus; label: string; desc: string; icon: typeof CheckCircle; color: string }[] = [
  {
    status: "active",
    label: "Open",
    desc: "Intent is live and accepting connections",
    icon: CheckCircle,
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  {
    status: "in_discussion",
    label: "In Discussion",
    desc: "Actively talking with a potential partner",
    icon: MessageCircle,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  {
    status: "partnership_formed",
    label: "Partnership Formed",
    desc: "Deal closed — collaboration underway",
    icon: Handshake,
    color: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  },
  {
    status: "closed",
    label: "Closed",
    desc: "Intent is no longer active",
    icon: XCircle,
    color: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  },
];

interface DealTrackerProps {
  intentId: string;
  connectionId?: string;
  currentStatus: IntentLifecycleStatus;
  userId: string;
  partnerId?: string | null;
  onStatusChange?: (status: IntentLifecycleStatus) => void;
}

export function DealTracker({ intentId, connectionId, currentStatus, userId, partnerId, onStatusChange }: DealTrackerProps) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [showEndorsementPrompt, setShowEndorsementPrompt] = useState(false);
  const [endorsementText, setEndorsementText] = useState("");
  const [endorsementSaving, setEndorsementSaving] = useState(false);
  const [endorsementSaved, setEndorsementSaved] = useState(false);

  const currentIdx = STAGES.findIndex(s => s.status === status);

  const handleUpdate = async (newStatus: IntentLifecycleStatus) => {
    if (newStatus === status) return;
    setLoading(true);
    try {
      if (connectionId) {
        await updateConnectionLifecycle(connectionId, newStatus, userId);
      } else {
        await updateIntentLifecycle(intentId, newStatus, userId);
      }
      setStatus(newStatus);
      onStatusChange?.(newStatus);

      if (newStatus === "partnership_formed") {
        setTimeout(() => setShowEndorsementPrompt(true), 800);
        toast.success("🎉 Partnership formed! Don't forget to leave an endorsement.");
      } else if (newStatus === "in_discussion") {
        toast.success("Status updated to In Discussion");
      } else if (newStatus === "closed") {
        toast.success("Intent closed");
      }
    } catch (e) {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const currentStage = STAGES[currentIdx];
  const Icon = currentStage.icon;

  return (
    <div className="rounded-xl border border-white/8 bg-surface-secondary p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/80">Deal Status</h3>
        <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${currentStage.color}`}>
          <Icon className="size-3" />
          {currentStage.label}
        </div>
      </div>

      {/* Progress track */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="absolute inset-x-0 top-3 h-0.5 bg-white/5" />
        <div
          className="absolute top-3 h-0.5 bg-gradient-to-r from-emerald-500 to-violet-500 transition-all duration-500"
          style={{ width: `${(currentIdx / (STAGES.length - 1)) * 100}%` }}
        />
        {STAGES.map((stage, i) => {
          const S = stage.icon;
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;
          return (
            <button
              key={stage.status}
              onClick={() => !loading && handleUpdate(stage.status)}
              disabled={loading || stage.status === status}
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200 cursor-pointer
                ${isActive ? "border-violet-500 bg-violet-500/20 scale-110" : ""}
                ${isDone ? "border-emerald-500 bg-emerald-500/20" : ""}
                ${!isActive && !isDone ? "border-white/10 bg-surface-page hover:border-white/20" : ""}
              `}
              title={stage.label}
            >
              <S className={`size-3 ${isActive ? "text-violet-400" : isDone ? "text-emerald-400" : "text-zinc-500"}`} />
            </button>
          );
        })}
      </div>

      {/* Stage labels */}
      <div className="flex justify-between text-[10px] text-zinc-500 mb-4">
        {STAGES.map(s => (
          <span key={s.status} className={`text-center ${s.status === status ? "text-white/60" : ""}`}>
            {s.label}
          </span>
        ))}
      </div>

      {/* Next step CTA */}
      {status !== "closed" && status !== "partnership_formed" && (
        <div className="flex gap-2">
          {currentIdx < STAGES.length - 2 && (
            <Button
              size="sm"
              onClick={() => handleUpdate(STAGES[currentIdx + 1].status)}
              disabled={loading}
              className="flex-1 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/20 text-xs cursor-pointer"
            >
              {loading ? "Updating..." : `Move to ${STAGES[currentIdx + 1].label}`}
              <ChevronRight className="size-3 ml-1" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleUpdate("closed")}
            disabled={loading}
            className="text-zinc-500 hover:text-zinc-400 text-xs cursor-pointer"
          >
            Close
          </Button>
        </div>
      )}

      {/* Endorsement prompt */}
      <AnimatePresence>
        {showEndorsementPrompt && !endorsementSaved && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/20">
                <Handshake className="size-4 text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-1">Leave an endorsement?</p>
                <p className="text-xs text-zinc-400 mb-2">
                  Tell the community how it went — 1-2 sentences about working with your partner.
                </p>
                <Textarea
                  value={endorsementText}
                  onChange={(e) => setEndorsementText(e.target.value)}
                  placeholder="Great partnership — they delivered fast and communication was excellent."
                  className="min-h-16 bg-white/5 border-white/10 text-sm mb-2"
                  maxLength={280}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-500 text-white text-xs cursor-pointer"
                    disabled={endorsementSaving || endorsementText.length < 10}
                    onClick={async () => {
                      if (!partnerId || endorsementText.length < 10) return;
                      setEndorsementSaving(true);
                      try {
                        await createEndorsement({
                          intentId,
                          endorserId: userId,
                          endorseeId: partnerId,
                          content: endorsementText,
                        });
                        setEndorsementSaved(true);
                        setShowEndorsementPrompt(false);
                        toast.success("Endorsement saved! It will appear on their profile.");
                      } catch {
                        toast.error("Failed to save endorsement");
                      } finally {
                        setEndorsementSaving(false);
                      }
                    }}
                  >
                    {endorsementSaving ? "Saving..." : "Submit Endorsement"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-zinc-500 text-xs cursor-pointer"
                    onClick={() => setShowEndorsementPrompt(false)}
                  >
                    Later
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
