"use client";

import { useState, useEffect } from "react";
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
import { getUserOrgs, submitIntentForOrgApproval } from "@/app/actions/org-intents";
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
  Organization,
} from "@/lib/types/database";
import { INTENT_TEMPLATES } from "@/lib/intent-templates";
import { AlertCircle, Info, Sparkles, Shield } from "lucide-react";
import { toast } from "sonner";
import { getVerifiedUserCount } from "@/app/actions/views";
import { getFoundingBadgeRemaining } from "@/app/actions/intents";

const PRIORITIES: IntentPriority[] = ["Open", "Active", "Urgent"];

interface PostIntentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  twitterVerified?: boolean;
}

export function PostIntentDialog({
  open,
  onOpenChange,
  userId,
  twitterVerified = false,
}: PostIntentDialogProps) {
  const [intentType, setIntentType] = useState<IntentType>("partnership");
  const [content, setContent] = useState("");
  const [ecosystem, setEcosystem] = useState<Ecosystem | "">("");
  const [customEcosystem, setCustomEcosystem] = useState("");
  const [sector, setSector] = useState<Sector | "">("");
  const [customSector, setCustomSector] = useState("");
  const [priority, setPriority] = useState<IntentPriority>("Open");
  const [duration, setDuration] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [useTemplate, setUseTemplate] = useState(false);
  const [userOrgs, setUserOrgs] = useState<Array<{ role: string; organizations: Organization }>>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [foundingRemaining, setFoundingRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      getFoundingBadgeRemaining().then(setFoundingRemaining).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open && userId) {
      getUserOrgs(userId).then(setUserOrgs).catch(() => {});
    }
  }, [open, userId]);

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

  const currentTemplate = INTENT_TEMPLATES[intentType];

  function handleTypeChange(type: IntentType) {
    setIntentType(type);
    if (useTemplate) {
      setContent(INTENT_TEMPLATES[type].template);
    }
  }

  function handleToggleTemplate() {
    const next = !useTemplate;
    setUseTemplate(next);
    if (next) {
      setContent(currentTemplate.template);
    } else if (content === currentTemplate.template) {
      setContent("");
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
      const finalEcosystem = ecosystem === "other" ? (customEcosystem.trim().toLowerCase() || null) : (ecosystem || null);
      const finalSector = sector === "other" ? (customSector.trim().toLowerCase() || null) : (sector || null);
      const intent = await createIntent({
        authorId: userId,
        orgId: selectedOrgId || undefined,
        type: intentType,
        content,
        ecosystem: finalEcosystem,
        sector: finalSector,
        priority,
        durationDays: duration,
      });
      if (selectedOrgId) {
        await submitIntentForOrgApproval(intent.id, selectedOrgId, userId);
      }
      onOpenChange(false);

      // Success feedback — kill the dead zone
      getVerifiedUserCount().then((count) => {
        const reach = count > 0 ? count : 50;
        toast.success("Intent posted!", {
          description: `Your intent is now visible to ~${reach} verified users in the network.`,
          duration: 5000,
        });
      }).catch(() => {
        toast.success("Intent posted!", {
          description: "Your intent is now live and discoverable.",
          duration: 4000,
        });
      });

      setContent("");
      setIntentType("partnership");
      setEcosystem("");
      setCustomEcosystem("");
      setSector("");
      setCustomSector("");
      setPriority("Open");
      setDuration(30);
      setUseTemplate(false);
      setSelectedOrgId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create intent");
    } finally {
      setSubmitting(false);
    }
  }

  // X verification gate
  if (!twitterVerified) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-card border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Connect X to Post</DialogTitle>
            <DialogDescription>
              You need to verify your X (Twitter) account before posting
              intents.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mt-2">
            <AlertCircle className="size-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-zinc-300">
                X verification ensures trust in the Manifest network. Connect
                your X account in settings to start posting.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              onOpenChange(false);
              window.location.href = "/onboarding/verify-x";
            }}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
          >
            Connect X to Post
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/[0.08] max-h-[85vh] sm:max-h-[90vh] overflow-y-auto fixed inset-x-0 bottom-0 top-auto left-0 translate-x-0 translate-y-0 max-w-full rounded-t-2xl rounded-b-none sm:inset-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Post an Intent</DialogTitle>
          <DialogDescription>
            Declare what you&apos;re looking for. Others will discover and
            connect.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Posting as */}
          {userOrgs.length > 0 && (
            <div>
              <Label className="text-zinc-300">Posting as</Label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="mt-1.5 w-full h-8 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/90 outline-none focus:border-emerald-500"
              >
                <option value="">Yourself</option>
                {userOrgs.map((m) => (
                  <option key={m.organizations.id} value={m.organizations.id}>
                    {m.organizations.name}
                  </option>
                ))}
              </select>
              {selectedOrgId && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mt-2">
                  <Info className="size-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/80">
                    Will need admin approval before going live
                  </p>
                </div>
              )}
            </div>
          )}

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

          {/* Using template toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-zinc-300" htmlFor="content">
              Content{" "}
              <span
                className={`text-xs ${
                  content.length < 50
                    ? "text-red-400"
                    : content.length > 450
                      ? "text-amber-400"
                      : "text-zinc-500"
                }`}
              >
                ({content.length}/500, min 50)
              </span>
            </Label>
            <button
              onClick={handleToggleTemplate}
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                useTemplate
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/5 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {useTemplate ? "Using template" : "Use template"}
            </button>
          </div>

          {/* Content */}
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={currentTemplate.placeholder}
            className="min-h-24 bg-white/5 border-white/10"
            maxLength={500}
          />

          {/* Hint chips */}
          <div className="flex flex-wrap gap-1.5">
            {currentTemplate.hints.map((hint) => (
              <span
                key={hint}
                className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/[0.06] px-2.5 py-0.5 text-xs text-zinc-500"
              >
                {hint}
              </span>
            ))}
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
                onChange={(e) => {
                  const val = e.target.value as Ecosystem | "" | "other";
                  setEcosystem(val);
                  if (val !== "other") setCustomEcosystem("");
                }}
                className="mt-1.5 w-full h-8 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/90 outline-none focus:border-emerald-500"
              >
                <option value="">Select...</option>
                {ecosystems.map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
                <option value="other">Other...</option>
              </select>
              {ecosystem === "other" && (
                <input
                  type="text"
                  placeholder="Type your ecosystem..."
                  value={customEcosystem}
                  onChange={(e) => setCustomEcosystem(e.target.value)}
                  className="mt-1.5 w-full h-8 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/90 outline-none focus:border-emerald-500 placeholder:text-zinc-500"
                />
              )}
            </div>
            <div>
              <Label className="text-zinc-300" htmlFor="sector">
                Sector
              </Label>
              <select
                id="sector"
                value={sector}
                onChange={(e) => {
                  const val = e.target.value as Sector | "" | "other";
                  setSector(val);
                  if (val !== "other") setCustomSector("");
                }}
                className="mt-1.5 w-full h-8 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/90 outline-none focus:border-emerald-500"
              >
                <option value="">Select...</option>
                {sectors.map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
                <option value="other">Other...</option>
              </select>
              {sector === "other" && (
                <input
                  type="text"
                  placeholder="Type your sector..."
                  value={customSector}
                  onChange={(e) => setCustomSector(e.target.value)}
                  className="mt-1.5 w-full h-8 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/90 outline-none focus:border-emerald-500 placeholder:text-zinc-500"
                />
              )}
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

          {foundingRemaining !== null && foundingRemaining > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <Shield className="size-4 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300/80">
                <span className="font-medium text-amber-400">Founding Intent badge</span> — only {foundingRemaining} remaining. Post now to earn yours.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

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
