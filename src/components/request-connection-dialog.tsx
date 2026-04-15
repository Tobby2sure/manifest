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
import { Badge } from "@/components/ui/badge";
import { sendConnectionRequest } from "@/app/actions/connections";
import { INTENT_TYPE_CONFIG } from "@/lib/types/database";
import type { IntentWithAuthor } from "@/lib/types/database";
import { CheckCircle } from "lucide-react";

interface RequestConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: IntentWithAuthor | null;
  senderId: string;
}

export function RequestConnectionDialog({
  open,
  onOpenChange,
  intent,
  senderId,
}: RequestConnectionDialogProps) {
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!intent) return null;

  const typeConfig = INTENT_TYPE_CONFIG[intent.type];

  async function handleSend() {
    if (pitch.length < 50) {
      setError("Pitch must be at least 50 characters.");
      return;
    }
    if (pitch.length > 500) {
      setError("Pitch must be at most 500 characters.");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      await sendConnectionRequest(
        intent!.id,
        senderId,
        intent!.author_id,
        pitch
      );
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send request");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setPitch("");
      setSuccess(false);
      setError("");
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-full inset-x-0 bottom-0 top-auto left-0 translate-x-0 translate-y-0 rounded-t-2xl rounded-b-none sm:inset-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:max-w-md bg-card border-white/[0.08]">
        <DialogHeader>
          <DialogTitle>Request Connection</DialogTitle>
          <DialogDescription>
            Send a pitch to the intent poster. They&apos;ll decide whether to connect.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle className="size-12 text-emerald-400 mb-3" />
            <h3 className="text-lg font-medium text-white/90">Request Sent!</h3>
            <p className="text-sm text-zinc-400 mt-1">
              You&apos;ll be notified when they respond.
            </p>
            <Button
              onClick={() => handleClose(false)}
              className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white border-0"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Intent summary */}
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${typeConfig.color}`}
                >
                  {typeConfig.label}
                </span>
                <span className="text-xs text-zinc-400">
                  by {intent.author.display_name ?? "Anonymous"}
                </span>
              </div>
              <p className="text-sm text-white/70 line-clamp-3">
                {intent.content}
              </p>
            </div>

            {/* Pitch */}
            <div>
              <Label className="text-zinc-300" htmlFor="pitch">
                Your Pitch ({pitch.length}/500)
              </Label>
              <Textarea
                id="pitch"
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="Explain why you're a great fit for this intent..."
                className="mt-1.5 min-h-24 bg-white/5 border-white/10"
                maxLength={500}
                aria-invalid={!!error || undefined}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              onClick={handleSend}
              disabled={submitting || pitch.length < 50}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0"
            >
              {submitting ? "Sending..." : "Send Request"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
