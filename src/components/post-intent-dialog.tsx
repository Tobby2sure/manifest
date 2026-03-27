"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createIntent } from "@/app/actions/intents";
import {
  INTENT_TYPE_CONFIG,
  ECOSYSTEM_CONFIG,
  SECTOR_CONFIG,
} from "@/lib/types/database";
import type {
  IntentType,
  Ecosystem,
  Sector,
  IntentPriority,
} from "@/lib/types/database";

const INTENT_TEMPLATES: Record<IntentType, string> = {
  partnership:
    "We're [org/your name], building [what]. We're looking for a partner who [does what]. Ideal collaboration would involve [specific ask].",
  investment:
    "We're raising [stage] for [project]. We've built [traction signal]. Looking for [investor type]. Check size: [range or open].",
  integration:
    "We need a [type] integration for [use case]. Our stack: [tech]. Ideal partner already has [capability]. Timeline: [days].",
  hiring:
    "We're hiring a [role] to work on [project/area]. Requirements: [key skills]. Compensation: [range]. Location: [remote/onsite].",
  "co-marketing":
    "We're looking for a co-marketing partner to [campaign type]. Our audience: [size/type]. Ideal partner has [audience/reach].",
  grant:
    "We're [offering/seeking] a grant for [purpose]. Amount: [range]. Requirements: [criteria]. Timeline: [deadline].",
  "ecosystem-support":
    "We're [offering/seeking] ecosystem support for [purpose]. Resources available: [what]. Looking for: [specific need].",
  "beta-testers":
    "We're looking for beta testers for [product]. Target users: [description]. What you'll test: [features]. Timeline: [duration].",
};

const PRIORITIES: IntentPriority[] = ["Open", "Active", "Urgent"];

interface PostIntentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function PostIntentDialog({
  open,
  onOpenChange,
  userId,
}: PostIntentDialogProps) {
  const [intentType, setIntentType] = useState<IntentType>("partnership");
  const [content, setContent] = useState("");
  const [ecosystem, setEcosystem] = useState<Ecosystem | "">("");
  const [sector, setSector] = useState<Sector | "">("");
  const [priority, setPriority] = useState<IntentPriority>("Open");
  const [duration, setDuration] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const intentTypes = Object.entries(INTENT_TYPE_CONFIG) as [
    IntentType,
    (typeof INTENT_TYPE_CONFIG)[IntentType],
  ][];
  const ecosystems = Object.entries(ECOSYSTEM_CONFIG) as [
    Ecosystem,
    (typeof ECOSYSTEM_CONFIG)[Ecosystem],
  ][];
  const sectors = Object.entries(SECTOR_CONFIG) as [
    Sector,
    (typeof SECTOR_CONFIG)[Sector],
  ][];

  function handleTypeChange(type: IntentType) {
    setIntentType(type);
    if (!content || Object.values(INTENT_TEMPLATES).includes(content)) {
      setContent(INTENT_TEMPLATES[type]);
    }
  }

  async function handleSubmit() {
    if (content.length < 50) {
      setError("Content must be at least 50 characters.");
      return;
    }
    if (content.length > 500) {
      setError("Content must be at most 500 characters.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      await createIntent({
        authorId: userId,
        type: intentType,
        content,
        ecosystem: ecosystem || null,
        sector: sector || null,
        priority,
        durationDays: duration,
      });
      onOpenChange(false);
      setContent("");
      setIntentType("partnership");
      setEcosystem("");
      setSector("");
      setPriority("Open");
      setDuration(30);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create intent");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-[#0e0e14] border-white/[0.08]">
        <DialogHeader>
          <DialogTitle>Post an Intent</DialogTitle>
          <DialogDescription>
            Declare what you&apos;re looking for. Others will discover and connect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Intent Type Selector */}
          <div>
            <Label className="text-zinc-300 mb-2">Intent Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1.5">
              {intentTypes.map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleTypeChange(key)}
                  className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                    intentType === key
                      ? config.color + " ring-1 ring-white/20"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10"
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>

          {/* Template hint */}
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
            <p className="text-xs text-zinc-500 italic">
              Template: {INTENT_TEMPLATES[intentType]}
            </p>
          </div>

          {/* Content */}
          <div>
            <Label className="text-zinc-300" htmlFor="content">
              Content ({content.length}/500)
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe your intent..."
              className="mt-1.5 min-h-24 bg-white/5 border-white/10"
              maxLength={500}
            />
          </div>

          {/* Ecosystem + Sector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-zinc-300" htmlFor="ecosystem">
                Ecosystem
              </Label>
              <select
                id="ecosystem"
                value={ecosystem}
                onChange={(e) => setEcosystem(e.target.value as Ecosystem | "")}
                className="mt-1.5 w-full h-8 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/90 outline-none focus:border-emerald-500"
              >
                <option value="">Select...</option>
                {ecosystems.map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-zinc-300" htmlFor="sector">
                Sector
              </Label>
              <select
                id="sector"
                value={sector}
                onChange={(e) => setSector(e.target.value as Sector | "")}
                className="mt-1.5 w-full h-8 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/90 outline-none focus:border-emerald-500"
              >
                <option value="">Select...</option>
                {sectors.map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <Label className="text-zinc-300">Priority</Label>
            <div className="flex gap-2 mt-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    priority === p
                      ? p === "Urgent"
                        ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
                        : p === "Active"
                          ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <Label className="text-zinc-300" htmlFor="duration">
              Duration: {duration} days
            </Label>
            <input
              id="duration"
              type="range"
              min={1}
              max={90}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1.5 w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-1">
              <span>1 day</span>
              <span>90 days</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || content.length < 50}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0"
          >
            {submitting ? "Posting..." : "Post Intent"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
